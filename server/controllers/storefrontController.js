const crypto = require("crypto");
const { query, withTransaction } = require("../config/database");
const { getCourier } = require("../services/courier");
const { getProvider } = require("../services/payment");

// ---------------------------------------------------------------------------
const ok = (res, data, message = "OK", extra = {}) =>
  res.json({ success: true, message, data, ...extra });
const fail = (res, status, message, code) =>
  res.status(status).json({ success: false, message, ...(code ? { code } : {}) });

const orderNumber = () =>
  `SF-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

// FEFO price + available quantity for a set of product ids in one org
const catalogueRows = (organizationId, { productIds, includeOutOfStock } = {}) =>
  query(
    `SELECT p.id, p.name, p.generic_name, p.manufacturer, p.category, p.pack_size,
            COALESCE(SUM(b.quantity), 0)::int AS available,
            (SELECT b2.selling_price FROM inventory_batches b2
              WHERE b2.product_id = p.id AND b2.is_active = true AND b2.quantity > 0
              ORDER BY b2.expiry_date ASC LIMIT 1) AS price
     FROM products p
     LEFT JOIN inventory_batches b
            ON b.product_id = p.id AND b.is_active = true
     WHERE p.organization_id = $1
       AND p.is_active = true
       AND COALESCE(p.prescription_required, false) = false
       ${productIds ? "AND p.id = ANY($2)" : ""}
     GROUP BY p.id
     ${includeOutOfStock ? "" : "HAVING COALESCE(SUM(b.quantity), 0) > 0"}
     ORDER BY p.name`,
    productIds ? [organizationId, productIds] : [organizationId]
  );

// Allocate `qty` of a product across its active batches, oldest expiry first.
// Returns the batch deductions; throws if stock is insufficient.
async function allocateFefo(client, productId, organizationId, qty) {
  const { rows } = await client.query(
    `SELECT id, quantity FROM inventory_batches
     WHERE product_id = $1 AND organization_id = $2 AND is_active = true AND quantity > 0
     ORDER BY expiry_date ASC
     FOR UPDATE`,
    [productId, organizationId]
  );
  let remaining = qty;
  const deductions = [];
  for (const batch of rows) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.quantity);
    deductions.push({ id: batch.id, take });
    remaining -= take;
  }
  if (remaining > 0) {
    const err = new Error("Not enough stock");
    err.status = 400;
    throw err;
  }
  for (const d of deductions) {
    await client.query(
      `UPDATE inventory_batches SET quantity = quantity - $1, updated_at = now() WHERE id = $2`,
      [d.take, d.id]
    );
  }
  return deductions;
}

// =========================================================================
// PUBLIC
// =========================================================================

// GET /api/public/storefront/:slug
const getStore = async (req, res) => {
  try {
    const settings = await query(
      `SELECT s.*, o.name AS organization_name
       FROM storefront_settings s
       JOIN organizations o ON o.id = s.organization_id
       WHERE s.slug = $1`,
      [req.params.slug]
    );
    if (!settings.rows.length || !settings.rows[0].is_live) {
      return fail(res, 404, "Store not found");
    }
    const s = settings.rows[0];
    const items = await catalogueRows(s.organization_id);

    ok(res, {
      store: {
        slug: s.slug,
        displayName: s.display_name,
        logoUrl: s.logo_url,
        theme: s.theme,
        deliveryFee: Number(s.delivery_fee),
        minOrder: Number(s.min_order),
        codEnabled: s.cod_enabled,
        payInStoreEnabled: s.pay_in_store_enabled,
        onlineEnabled: s.online_enabled,
      },
      products: items.rows.map((r) => ({
        id: r.id,
        name: r.name,
        genericName: r.generic_name,
        manufacturer: r.manufacturer,
        category: r.category,
        packSize: r.pack_size,
        price: Number(r.price || 0),
        available: r.available,
      })),
    });
  } catch (e) {
    console.error("storefront getStore:", e);
    fail(res, 500, "Failed to load store");
  }
};

// POST /api/public/storefront/:slug/order
const placeOrder = async (req, res) => {
  try {
    const { customer, items, paymentMethod = "cod", notes } = req.body || {};
    if (
      !customer ||
      !customer.name ||
      !customer.phone ||
      !customer.address ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return fail(res, 400, "customer (name, phone, address) and items are required", "VALIDATION_ERROR");
    }
    if (!["cod", "in_store", "online"].includes(paymentMethod)) {
      return fail(res, 400, "Unsupported payment method", "VALIDATION_ERROR");
    }

    const settings = await query(
      "SELECT * FROM storefront_settings WHERE slug = $1",
      [req.params.slug]
    );
    if (!settings.rows.length || !settings.rows[0].is_live) {
      return fail(res, 404, "Store not found");
    }
    const s = settings.rows[0];
    if (paymentMethod === "cod" && !s.cod_enabled)
      return fail(res, 400, "Cash on delivery is not available for this store");
    if (paymentMethod === "in_store" && !s.pay_in_store_enabled)
      return fail(res, 400, "Pay in store is not available for this store");
    if (paymentMethod === "online" && !s.online_enabled)
      return fail(res, 400, "Online payment is not available for this store");

    const wantIds = [...new Set(items.map((i) => i.productId))];
    // catalogue with prices — includeOutOfStock so we can give a precise error
    const cat = await catalogueRows(s.organization_id, {
      productIds: wantIds,
      includeOutOfStock: true,
    });
    const byId = new Map(cat.rows.map((r) => [r.id, r]));

    // any requested id that isn't in the OTC catalogue (unknown, inactive, or Rx)
    for (const id of wantIds) {
      if (!byId.has(id))
        return fail(res, 400, "One or more items are not available for online purchase");
    }

    let subtotal = 0;
    const lines = [];
    for (const raw of items) {
      const qty = Math.max(1, parseInt(raw.quantity) || 0);
      const row = byId.get(raw.productId);
      if (qty > row.available)
        return fail(res, 400, `Only ${row.available} of "${row.name}" left`);
      const unit = Number(row.price || 0); // server price — client value is ignored
      const lineTotal = unit * qty;
      subtotal += lineTotal;
      lines.push({
        productId: row.id,
        name: row.name,
        unit,
        qty,
        lineTotal,
      });
    }

    if (subtotal < Number(s.min_order))
      return fail(res, 400, `Minimum order is ${s.min_order}`);

    const deliveryFee = Number(s.delivery_fee) || 0;
    const total = subtotal + deliveryFee;
    const num = orderNumber();

    // For an online order, initiate the charge *before* we create anything —
    // a misconfigured store shouldn't leave dangling unpaid orders.
    let payment = null;
    if (paymentMethod === "online") {
      const providerName = process.env.STOREFRONT_PAYMENT_PROVIDER || "jazzcash";
      try {
        const p = getProvider(providerName);
        const init = await p.createPayment({ order_number: num, total });
        payment = {
          provider: providerName,
          ref: init.ref,
          redirectUrl: init.redirectUrl,
          fields: init.fields,
        };
      } catch (e) {
        return fail(res, e.status || 502, e.message || "Could not start payment", "PAYMENT_INIT_FAILED");
      }
    }

    const orderId = await withTransaction(async (client) => {
      const o = await client.query(
        `INSERT INTO storefront_orders
           (organization_id, order_number, customer_name, customer_phone,
            customer_address, customer_city, subtotal, delivery_fee, total,
            payment_method, payment_status, status, notes,
            payment_provider, payment_ref)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'unpaid','placed',$11,$12,$13)
         RETURNING id`,
        [
          s.organization_id,
          num,
          customer.name,
          customer.phone,
          customer.address,
          customer.city || null,
          subtotal,
          deliveryFee,
          total,
          paymentMethod,
          notes || null,
          payment?.provider || null,
          payment?.ref || null,
        ]
      );
      const id = o.rows[0].id;

      for (const l of lines) {
        await allocateFefo(client, l.productId, s.organization_id, l.qty);
        await client.query(
          `INSERT INTO storefront_order_items
             (storefront_order_id, medicine_id, name_snapshot, unit_price_snapshot, quantity, line_total)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, l.productId, l.name, l.unit, l.qty, l.lineTotal]
        );
      }

      await client.query(
        `INSERT INTO storefront_order_events (storefront_order_id, from_status, to_status, actor)
         VALUES ($1, NULL, 'placed', 'customer')`,
        [id]
      );
      return id;
    });

    res.status(201).json({
      success: true,
      message: "Order placed",
      data: {
        orderNumber: num,
        orderId,
        subtotal,
        deliveryFee,
        total,
        status: "placed",
        paymentStatus: "unpaid",
        ...(payment ? { payment } : {}),
      },
    });
  } catch (e) {
    if (e.status === 400) return fail(res, 400, e.message);
    console.error("storefront placeOrder:", e);
    fail(res, 500, "Could not place your order");
  }
};

// GET /api/public/storefront/:slug/order/:orderNumber?phone=...
const getPublicOrder = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return fail(res, 400, "phone is required");
    const r = await query(
      `SELECT so.order_number, so.status, so.payment_status, so.total, so.placed_at,
              so.rider_name
       FROM storefront_orders so
       JOIN storefront_settings s ON s.organization_id = so.organization_id
       WHERE s.slug = $1 AND so.order_number = $2 AND so.customer_phone = $3`,
      [req.params.slug, req.params.orderNumber, phone]
    );
    if (!r.rows.length) return fail(res, 404, "Order not found");
    ok(res, r.rows[0]);
  } catch (e) {
    console.error("storefront getPublicOrder:", e);
    fail(res, 500, "Failed to load order");
  }
};

// =========================================================================
// AUTHED (pharmacy side)  — mounted behind auth + requireFeature('storefront')
// =========================================================================

const SETTINGS_FIELDS = [
  "display_name",
  "logo_url",
  "theme",
  "delivery_fee",
  "delivery_radius_km",
  "min_order",
  "cod_enabled",
  "pay_in_store_enabled",
  "online_enabled",
  "is_live",
];

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const getSettings = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const r = await query(
      "SELECT * FROM storefront_settings WHERE organization_id = $1",
      [orgId]
    );
    ok(res, r.rows[0] || null);
  } catch (e) {
    console.error("storefront getSettings:", e);
    fail(res, 500, "Failed to load settings");
  }
};

const upsertSettings = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const b = req.body || {};

    const existing = await query(
      "SELECT id, slug FROM storefront_settings WHERE organization_id = $1",
      [orgId]
    );

    // slug: keep existing; on create derive from display_name (or org), de-dupe
    let slug = existing.rows[0]?.slug;
    if (!slug) {
      const org = await query("SELECT name FROM organizations WHERE id = $1", [orgId]);
      let base = slugify(b.slug || b.display_name || org.rows[0]?.name) || "store";
      slug = base;
      for (let i = 1; ; i++) {
        const clash = await query(
          "SELECT 1 FROM storefront_settings WHERE slug = $1",
          [slug]
        );
        if (!clash.rows.length) break;
        slug = `${base}-${i}`;
      }
    } else if (b.slug && slugify(b.slug) !== slug) {
      const wanted = slugify(b.slug);
      const clash = await query(
        "SELECT 1 FROM storefront_settings WHERE slug = $1 AND organization_id <> $2",
        [wanted, orgId]
      );
      if (clash.rows.length) return fail(res, 409, "That store address is taken");
      slug = wanted;
    }

    const cols = SETTINGS_FIELDS.filter((f) => b[f] !== undefined);
    const vals = cols.map((f) => (f === "theme" ? JSON.stringify(b[f] || {}) : b[f]));

    if (!existing.rows.length) {
      const insertCols = ["organization_id", "slug", ...cols];
      const insertVals = [orgId, slug, ...vals];
      // display_name is NOT NULL — default from slug if not supplied
      if (!insertCols.includes("display_name")) {
        insertCols.push("display_name");
        insertVals.push(b.display_name || slug);
      }
      const ph = insertVals.map((_, i) => `$${i + 1}`);
      const r = await query(
        `INSERT INTO storefront_settings (${insertCols.join(", ")})
         VALUES (${ph.join(", ")}) RETURNING *`,
        insertVals
      );
      return res.status(201).json({ success: true, message: "Store created", data: r.rows[0] });
    }

    const sets = [`slug = $1`, ...cols.map((f, i) => `${f} = $${i + 2}`)];
    const params = [slug, ...vals, orgId];
    const r = await query(
      `UPDATE storefront_settings SET ${sets.join(", ")}, updated_at = now()
       WHERE organization_id = $${params.length} RETURNING *`,
      params
    );
    ok(res, r.rows[0], "Store updated");
  } catch (e) {
    if (e.code === "23505") return fail(res, 409, "That store address is taken");
    console.error("storefront upsertSettings:", e);
    fail(res, 500, "Failed to save settings");
  }
};

const listOrders = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const { status } = req.query;
    const params = [orgId];
    let where = "so.organization_id = $1";
    if (status) {
      params.push(status);
      where += ` AND so.status = $${params.length}`;
    }
    const r = await query(
      `SELECT so.*,
              (SELECT json_agg(json_build_object(
                 'name', i.name_snapshot, 'quantity', i.quantity,
                 'unitPrice', i.unit_price_snapshot, 'lineTotal', i.line_total))
               FROM storefront_order_items i WHERE i.storefront_order_id = so.id) AS items
       FROM storefront_orders so
       WHERE ${where}
       ORDER BY so.placed_at DESC
       LIMIT 200`,
      params
    );
    ok(res, r.rows);
  } catch (e) {
    console.error("storefront listOrders:", e);
    fail(res, 500, "Failed to list orders");
  }
};

const TRANSITIONS = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const updateOrder = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const { status, riderName, riderPhone, note, courier } = req.body || {};

    const cur = await query(
      "SELECT * FROM storefront_orders WHERE id = $1 AND organization_id = $2",
      [req.params.id, orgId]
    );
    if (!cur.rows.length) return fail(res, 404, "Order not found");
    const order = cur.rows[0];

    if (status && status !== order.status) {
      if (!TRANSITIONS[order.status]?.includes(status)) {
        return fail(res, 400, `Cannot move an order from ${order.status} to ${status}`, "BAD_TRANSITION");
      }
      // an unpaid online order can only be cancelled — never fulfilled
      if (
        order.payment_method === "online" &&
        order.payment_status !== "paid" &&
        status !== "cancelled"
      ) {
        return fail(res, 400, "This order has not been paid yet", "PAYMENT_REQUIRED");
      }
    }

    // book a courier (network call — keep it out of the txn below)
    let courierRef;
    if (courier && courier !== order.courier) {
      try {
        const res2 = await getCourier(courier).assignCourier(order);
        courierRef = res2.ref || null;
      } catch (e) {
        return fail(res, e.status || 502, e.message || "Courier booking failed", "COURIER_ERROR");
      }
    }

    const data = await withTransaction(async (client) => {
      // restock on cancel
      if (status === "cancelled" && order.status !== "cancelled") {
        const its = await client.query(
          "SELECT medicine_id, quantity FROM storefront_order_items WHERE storefront_order_id = $1",
          [order.id]
        );
        for (const it of its.rows) {
          const b = await client.query(
            `SELECT id FROM inventory_batches
             WHERE product_id = $1 AND organization_id = $2 AND is_active = true
             ORDER BY expiry_date ASC LIMIT 1`,
            [it.medicine_id, orgId]
          );
          if (b.rows.length) {
            await client.query(
              "UPDATE inventory_batches SET quantity = quantity + $1, updated_at = now() WHERE id = $2",
              [it.quantity, b.rows[0].id]
            );
          }
        }
      }

      const sets = ["updated_at = now()"];
      const params = [];
      if (status) {
        params.push(status);
        sets.push(`status = $${params.length}`);
      }
      if (riderName !== undefined) {
        params.push(riderName || null);
        sets.push(`rider_name = $${params.length}`);
      }
      if (riderPhone !== undefined) {
        params.push(riderPhone || null);
        sets.push(`rider_phone = $${params.length}`);
      }
      if (courier && courier !== order.courier) {
        params.push(courier);
        sets.push(`courier = $${params.length}`);
        params.push(courierRef);
        sets.push(`courier_ref = $${params.length}`);
      }
      params.push(order.id, orgId);
      const upd = await client.query(
        `UPDATE storefront_orders SET ${sets.join(", ")}
         WHERE id = $${params.length - 1} AND organization_id = $${params.length}
         RETURNING *`,
        params
      );

      if (status && status !== order.status) {
        await client.query(
          `INSERT INTO storefront_order_events
             (storefront_order_id, from_status, to_status, actor, note)
           VALUES ($1,$2,$3,$4,$5)`,
          [order.id, order.status, status, String(req.user.id), note || null]
        );
      }
      return upd.rows[0];
    });

    ok(res, data, "Order updated");
  } catch (e) {
    console.error("storefront updateOrder:", e);
    fail(res, 500, "Failed to update order");
  }
};

// POST /api/public/storefront/courier/webhook/:courier
// Courier is authoritative on delivery progress, so a mapped status is applied
// even if it skips the pharmacy's placed->confirmed->... steps. An unmapped
// external status is quarantined (raw stored, 202, order untouched) — never a 500.
// ponytail: forward-only + terminal-guard, no full state machine for courier events.
const COURIER_APPLICABLE = new Set(["out_for_delivery", "delivered", "cancelled"]);

const courierWebhook = async (req, res) => {
  try {
    let adapter;
    try {
      adapter = getCourier(req.params.courier);
    } catch {
      return fail(res, 404, "Unknown courier");
    }

    const { ref, externalStatus, raw } = adapter.parseWebhook(req.body || {});
    if (!ref) return fail(res, 400, "Missing tracking reference");

    const cur = await query(
      "SELECT * FROM storefront_orders WHERE courier = $1 AND courier_ref = $2",
      [adapter.name, ref]
    );
    if (!cur.rows.length) return fail(res, 404, "Order not found for that reference");
    const order = cur.rows[0];

    const rawStr = externalStatus == null ? null : String(externalStatus).slice(0, 255);
    const internal = adapter.mapStatus(externalStatus);

    const applies =
      internal &&
      COURIER_APPLICABLE.has(internal) &&
      order.status !== "delivered" &&
      order.status !== "cancelled" &&
      internal !== order.status;

    if (!applies) {
      // quarantine: keep the raw status, change nothing else
      await query(
        "UPDATE storefront_orders SET courier_status_raw = $1, updated_at = now() WHERE id = $2",
        [rawStr, order.id]
      );
      return res.status(202).json({
        success: true,
        message: internal ? "No status change" : "Status not recognised — stored raw",
        data: { orderNumber: order.order_number, status: order.status, raw: rawStr },
      });
    }

    await withTransaction(async (client) => {
      if (internal === "cancelled") {
        const its = await client.query(
          "SELECT medicine_id, quantity FROM storefront_order_items WHERE storefront_order_id = $1",
          [order.id]
        );
        for (const it of its.rows) {
          const b = await client.query(
            `SELECT id FROM inventory_batches
             WHERE product_id = $1 AND organization_id = $2 AND is_active = true
             ORDER BY expiry_date ASC LIMIT 1`,
            [it.medicine_id, order.organization_id]
          );
          if (b.rows.length) {
            await client.query(
              "UPDATE inventory_batches SET quantity = quantity + $1, updated_at = now() WHERE id = $2",
              [it.quantity, b.rows[0].id]
            );
          }
        }
      }
      await client.query(
        "UPDATE storefront_orders SET status = $1, courier_status_raw = $2, updated_at = now() WHERE id = $3",
        [internal, rawStr, order.id]
      );
      await client.query(
        `INSERT INTO storefront_order_events (storefront_order_id, from_status, to_status, actor, note)
         VALUES ($1,$2,$3,'courier',$4)`,
        [order.id, order.status, internal, `${adapter.name}:${rawStr || externalStatus}`]
      );
    });

    ok(res, { orderNumber: order.order_number, status: internal, raw: rawStr }, "Order updated");
  } catch (e) {
    console.error("storefront courierWebhook:", e);
    fail(res, 500, "Failed to process courier update");
  }
};

const STOREFRONT_PUBLIC_URL =
  process.env.STOREFRONT_PUBLIC_URL || "http://localhost:3007";

// consumer-facing order page for a browser coming back from the gateway
async function consumerOrderUrl(order) {
  const s = await query(
    "SELECT slug FROM storefront_settings WHERE organization_id = $1",
    [order.organization_id]
  );
  const slug = s.rows[0]?.slug;
  return slug
    ? `${STOREFRONT_PUBLIC_URL}/store/${slug}/order/${order.order_number}` +
        `?phone=${encodeURIComponent(order.customer_phone)}`
    : `${STOREFRONT_PUBLIC_URL}/`;
}

// POST /api/public/storefront/payment/webhook/:provider
// Doubles as the gateway return URL (browser, form-encoded) and the IPN (JSON).
// Only a signature-valid payload is trusted; it flips payment_status to
// paid/failed. Idempotent — a repeat 'paid' is a no-op. The order stays 'placed';
// the pharmacy still confirms it (but now can). A browser hit is 302'd to the
// consumer order page; an API hit gets JSON.
const paymentWebhook = async (req, res) => {
  const isBrowser = Boolean(req.is("urlencoded"));
  try {
    let provider;
    try {
      provider = getProvider(req.params.provider);
    } catch {
      return fail(res, 404, "Unknown payment provider");
    }
    if (provider.name === "manual")
      return fail(res, 404, "Unknown payment provider");

    const { ref, paid, valid } = provider.parseWebhook(req.body || {});
    if (!valid) return fail(res, 400, "Invalid payment signature", "BAD_SIGNATURE");
    if (!ref) return fail(res, 400, "Missing payment reference");

    const cur = await query(
      "SELECT * FROM storefront_orders WHERE payment_provider = $1 AND payment_ref = $2",
      [provider.name, ref]
    );
    if (!cur.rows.length) {
      if (isBrowser) return res.redirect(302, `${STOREFRONT_PUBLIC_URL}/`);
      return fail(res, 404, "Order not found for that reference");
    }
    const order = cur.rows[0];

    const finish = async (paymentStatus, message) => {
      if (isBrowser) return res.redirect(302, await consumerOrderUrl(order));
      return ok(res, { orderNumber: order.order_number, paymentStatus }, message);
    };

    const next = paid ? "paid" : "failed";
    if (order.payment_status === next) return finish(next, "No change");
    // never downgrade a paid order on a late 'failed'
    if (order.payment_status === "paid" && next === "failed")
      return finish("paid", "Already paid");

    await withTransaction(async (client) => {
      await client.query(
        "UPDATE storefront_orders SET payment_status = $1, updated_at = now() WHERE id = $2",
        [next, order.id]
      );
      await client.query(
        `INSERT INTO storefront_order_events (storefront_order_id, from_status, to_status, actor, note)
         VALUES ($1,$2,$3,'payment',$4)`,
        [order.id, order.status, order.status, `${provider.name}:${next}`]
      );
    });

    return finish(next, "Payment updated");
  } catch (e) {
    console.error("storefront paymentWebhook:", e);
    if (isBrowser) return res.redirect(302, `${STOREFRONT_PUBLIC_URL}/`);
    fail(res, 500, "Failed to process payment update");
  }
};

module.exports = {
  getStore,
  placeOrder,
  getPublicOrder,
  getSettings,
  upsertSettings,
  listOrders,
  updateOrder,
  courierWebhook,
  paymentWebhook,
};
