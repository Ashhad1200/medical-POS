const { query, withTransaction } = require("../config/database");

const ok = (res, data, message = "OK", extra = {}) =>
  res.json({ success: true, message, data, ...extra });
const fail = (res, status, message, code) =>
  res.status(status).json({ success: false, message, ...(code ? { code } : {}) });

// =========================================================================
// SUPPLIER SIDE  (requireSupplierOrg)
// =========================================================================

const CAT_FIELDS = ["name", "generic_name", "manufacturer", "pack_size", "unit_price", "moq", "is_active"];

const listCatalogue = async (req, res) => {
  try {
    const r = await query(
      `SELECT * FROM supplier_products WHERE supplier_org_id = $1 ORDER BY name`,
      [req.user.organization_id]
    );
    ok(res, r.rows);
  } catch (e) {
    console.error("listCatalogue:", e);
    fail(res, 500, "Failed to load catalogue");
  }
};

const createCatalogueItem = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name) return fail(res, 400, "name is required", "VALIDATION_ERROR");
    const cols = ["supplier_org_id", ...CAT_FIELDS.filter((f) => b[f] !== undefined)];
    const vals = [req.user.organization_id, ...cols.slice(1).map((f) => b[f])];
    const ph = vals.map((_, i) => `$${i + 1}`);
    const r = await query(
      `INSERT INTO supplier_products (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING *`,
      vals
    );
    res.status(201).json({ success: true, message: "Item added", data: r.rows[0] });
  } catch (e) {
    console.error("createCatalogueItem:", e);
    fail(res, 500, "Failed to add item");
  }
};

const updateCatalogueItem = async (req, res) => {
  try {
    const b = req.body || {};
    const cols = CAT_FIELDS.filter((f) => b[f] !== undefined);
    if (!cols.length) return fail(res, 400, "No fields to update");
    const sets = cols.map((f, i) => `${f} = $${i + 1}`);
    const vals = [...cols.map((f) => b[f]), req.params.id, req.user.organization_id];
    const r = await query(
      `UPDATE supplier_products SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${vals.length - 1} AND supplier_org_id = $${vals.length} RETURNING *`,
      vals
    );
    if (!r.rows.length) return fail(res, 404, "Item not found");
    ok(res, r.rows[0], "Item updated");
  } catch (e) {
    console.error("updateCatalogueItem:", e);
    fail(res, 500, "Failed to update item");
  }
};

const deleteCatalogueItem = async (req, res) => {
  try {
    const r = await query(
      `DELETE FROM supplier_products WHERE id = $1 AND supplier_org_id = $2 RETURNING id`,
      [req.params.id, req.user.organization_id]
    );
    if (!r.rows.length) return fail(res, 404, "Item not found");
    ok(res, { id: req.params.id }, "Item removed");
  } catch (e) {
    console.error("deleteCatalogueItem:", e);
    fail(res, 500, "Failed to remove item");
  }
};

const listIncomingOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const params = [req.user.organization_id];
    let where = "rpo.supplier_org_id = $1 AND rpo.source = 'b2b'";
    if (status) {
      params.push(status);
      where += ` AND rpo.status = $${params.length}`;
    }
    const r = await query(
      `SELECT rpo.id, rpo.po_number, rpo.status, rpo.total_amount, rpo.order_date,
              rpo.created_at, o.name AS pharmacy_name,
              (SELECT json_agg(json_build_object(
                 'name', i.item_name, 'quantity', i.quantity,
                 'unitPrice', i.unit_price, 'lineTotal', i.total_price))
               FROM refactored_purchase_order_items i WHERE i.purchase_order_id = rpo.id) AS items
       FROM refactored_purchase_orders rpo
       JOIN organizations o ON o.id = rpo.organization_id
       WHERE ${where}
       ORDER BY rpo.created_at DESC
       LIMIT 200`,
      params
    );
    ok(res, r.rows);
  } catch (e) {
    console.error("listIncomingOrders:", e);
    fail(res, 500, "Failed to load incoming orders");
  }
};

// supplier moves a B2B PO: pending -> ordered (accepted) | cancelled (rejected)
//                          ordered -> received (fulfilled) | cancelled
const B2B_TRANSITIONS = {
  pending: ["ordered", "cancelled"],
  ordered: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

const updateIncomingOrder = async (req, res) => {
  try {
    const { status, lines } = req.body || {};
    const cur = await query(
      `SELECT id, status FROM refactored_purchase_orders
       WHERE id = $1 AND supplier_org_id = $2 AND source = 'b2b'`,
      [req.params.id, req.user.organization_id]
    );
    if (!cur.rows.length) return fail(res, 404, "Order not found");
    const from = cur.rows[0].status;
    if (!B2B_TRANSITIONS[from]?.includes(status)) {
      return fail(res, 400, `Cannot move an order from ${from} to ${status}`, "BAD_TRANSITION");
    }

    const data = await withTransaction(async (client) => {
      // Partial fulfilment: on 'received', set per-item received_quantity
      // (defaulting to the full ordered qty when the supplier doesn't specify).
      if (status === "received") {
        const items = await client.query(
          `SELECT id, quantity FROM refactored_purchase_order_items WHERE purchase_order_id = $1`,
          [req.params.id]
        );
        const supplied = new Map(
          (Array.isArray(lines) ? lines : []).map((l) => [l.itemId, l.receivedQuantity])
        );
        for (const it of items.rows) {
          const recv = supplied.has(it.id)
            ? Math.max(0, Math.min(Number(supplied.get(it.id)) || 0, it.quantity))
            : it.quantity;
          await client.query(
            `UPDATE refactored_purchase_order_items SET received_quantity = $1 WHERE id = $2`,
            [recv, it.id]
          );
        }
      }

      const r = await client.query(
        `UPDATE refactored_purchase_orders
         SET status = $1::varchar, updated_at = now(),
             fulfilled_at = CASE WHEN $1::varchar = 'received' THEN now() ELSE fulfilled_at END
         WHERE id = $2 AND supplier_org_id = $3
         RETURNING id, po_number, status`,
        [status, req.params.id, req.user.organization_id]
      );
      return r.rows[0];
    });

    ok(res, data, "Order updated");
  } catch (e) {
    console.error("updateIncomingOrder:", e);
    fail(res, 500, "Failed to update order");
  }
};

// =========================================================================
// CONNECTIONS  (both sides — the caller's role decides which columns match)
// =========================================================================

const listConnections = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const asSupplier = req.user.org_type === "supplier";
    const r = await query(
      `SELECT sc.*,
              po.name AS pharmacy_name, po.code AS pharmacy_code,
              so.name AS supplier_name, so.code AS supplier_code
       FROM supplier_connections sc
       JOIN organizations po ON po.id = sc.pharmacy_org_id
       JOIN organizations so ON so.id = sc.supplier_org_id
       WHERE ${asSupplier ? "sc.supplier_org_id" : "sc.pharmacy_org_id"} = $1
       ORDER BY sc.created_at DESC`,
      [orgId]
    );
    ok(res, r.rows);
  } catch (e) {
    console.error("listConnections:", e);
    fail(res, 500, "Failed to load connections");
  }
};

// pharmacy -> request a connection to a supplier org by its code
const requestConnection = async (req, res) => {
  try {
    const { supplierCode } = req.body || {};
    if (!supplierCode) return fail(res, 400, "supplierCode is required", "VALIDATION_ERROR");

    const sup = await query(
      "SELECT id FROM organizations WHERE code = $1 AND org_type = 'supplier' AND is_active = true",
      [supplierCode]
    );
    if (!sup.rows.length) return fail(res, 404, "No supplier with that code");

    const r = await query(
      `INSERT INTO supplier_connections
         (pharmacy_org_id, supplier_org_id, status, requested_by)
       VALUES ($1, $2, 'pending', $3)
       ON CONFLICT (pharmacy_org_id, supplier_org_id) DO NOTHING
       RETURNING *`,
      [req.user.organization_id, sup.rows[0].id, req.user.id]
    );
    if (!r.rows.length)
      return fail(res, 409, "You already have a connection with that supplier");
    res.status(201).json({ success: true, message: "Request sent", data: r.rows[0] });
  } catch (e) {
    console.error("requestConnection:", e);
    fail(res, 500, "Failed to request connection");
  }
};

// supplier -> approve / pause / resume / revoke ; pharmacy -> revoke only
const CONN_ACTIONS = {
  approve: { from: ["pending", "paused"], to: "active", who: "supplier" },
  pause: { from: ["active"], to: "paused", who: "supplier" },
  revoke: { from: ["pending", "active", "paused"], to: "revoked", who: "both" },
};

const respondToConnection = async (req, res) => {
  try {
    const { action, creditLimit, paymentTermsDays } = req.body || {};
    const spec = CONN_ACTIONS[action];
    if (!spec) return fail(res, 400, "Unknown action", "VALIDATION_ERROR");

    const asSupplier = req.user.org_type === "supplier";
    if (spec.who === "supplier" && !asSupplier)
      return fail(res, 403, "Only the supplier can do that");

    const col = asSupplier ? "supplier_org_id" : "pharmacy_org_id";
    const cur = await query(
      `SELECT * FROM supplier_connections WHERE id = $1 AND ${col} = $2`,
      [req.params.id, req.user.organization_id]
    );
    if (!cur.rows.length) return fail(res, 404, "Connection not found");
    if (!spec.from.includes(cur.rows[0].status))
      return fail(res, 400, `Cannot ${action} a ${cur.rows[0].status} connection`, "BAD_TRANSITION");

    const sets = ["status = $1", "updated_at = now()"];
    const params = [spec.to];
    if (action === "approve") {
      sets.push("approved_by = $2");
      params.push(req.user.id);
      if (creditLimit !== undefined) {
        params.push(Number(creditLimit));
        sets.push(`credit_limit = $${params.length}`);
      }
      if (paymentTermsDays !== undefined) {
        params.push(Number(paymentTermsDays));
        sets.push(`payment_terms_days = $${params.length}`);
      }
    }
    params.push(req.params.id);
    const r = await query(
      `UPDATE supplier_connections SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    ok(res, r.rows[0], "Connection updated");
  } catch (e) {
    console.error("respondToConnection:", e);
    fail(res, 500, "Failed to update connection");
  }
};

// =========================================================================
// PHARMACY B2B ORDERING  (requirePharmacyOrg)
// =========================================================================

const activeConnection = (pharmacyOrgId, supplierOrgId) =>
  query(
    `SELECT * FROM supplier_connections
     WHERE pharmacy_org_id = $1 AND supplier_org_id = $2 AND status = 'active'`,
    [pharmacyOrgId, supplierOrgId]
  );

// fill-rate + on-time %, per connection, from this pharmacy's received B2B PO history
const RELIABILITY_SQL = `
  SELECT rpo.supplier_org_id,
         COUNT(DISTINCT rpo.id)                                        AS orders,
         SUM(i.quantity)                                              AS ordered_qty,
         SUM(COALESCE(i.received_quantity, 0))                        AS received_qty,
         COUNT(DISTINCT rpo.id) FILTER (
           WHERE rpo.fulfilled_at IS NOT NULL
             AND (rpo.expected_delivery IS NULL
                  OR rpo.fulfilled_at::date <= rpo.expected_delivery)
         )                                                            AS on_time_orders
  FROM refactored_purchase_orders rpo
  JOIN refactored_purchase_order_items i ON i.purchase_order_id = rpo.id
  WHERE rpo.organization_id = $1 AND rpo.source = 'b2b' AND rpo.status = 'received'
  GROUP BY rpo.supplier_org_id`;

const listConnectedSuppliers = async (req, res) => {
  try {
    const r = await query(
      `WITH rel AS (${RELIABILITY_SQL})
       SELECT sc.supplier_org_id, sc.status, sc.credit_limit, sc.payment_terms_days,
              o.name, o.code,
              COALESCE(rel.orders, 0)                    AS completed_orders,
              CASE WHEN rel.ordered_qty > 0
                   THEN ROUND(rel.received_qty::numeric / rel.ordered_qty * 100, 1)
                   END                                    AS fill_rate,
              CASE WHEN rel.orders > 0
                   THEN ROUND(rel.on_time_orders::numeric / rel.orders * 100, 1)
                   END                                    AS on_time_rate
       FROM supplier_connections sc
       JOIN organizations o ON o.id = sc.supplier_org_id
       LEFT JOIN rel ON rel.supplier_org_id = sc.supplier_org_id
       WHERE sc.pharmacy_org_id = $1 AND sc.status = 'active'
       ORDER BY o.name`,
      [req.user.organization_id]
    );
    ok(res, r.rows);
  } catch (e) {
    console.error("listConnectedSuppliers:", e);
    fail(res, 500, "Failed to load suppliers");
  }
};

// cross-supplier SKU search — one row per product name, one offer per connected supplier
const searchB2b = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) return ok(res, []);
    const r = await query(
      `SELECT sp.id AS supplier_product_id, sp.name, sp.manufacturer, sp.pack_size,
              sp.unit_price, sp.moq,
              sp.supplier_org_id, o.name AS supplier_name
       FROM supplier_products sp
       JOIN supplier_connections sc
         ON sc.supplier_org_id = sp.supplier_org_id
        AND sc.pharmacy_org_id = $1 AND sc.status = 'active'
       JOIN organizations o ON o.id = sp.supplier_org_id
       WHERE sp.is_active = true AND sp.name ILIKE $2
       ORDER BY sp.name, sp.unit_price ASC`,
      [req.user.organization_id, `%${q}%`]
    );
    const groups = new Map();
    for (const row of r.rows) {
      const key = row.name.toLowerCase();
      if (!groups.has(key)) groups.set(key, { name: row.name, offers: [] });
      groups.get(key).offers.push({
        supplierProductId: row.supplier_product_id,
        supplierOrgId: row.supplier_org_id,
        supplierName: row.supplier_name,
        manufacturer: row.manufacturer,
        packSize: row.pack_size,
        unitPrice: Number(row.unit_price),
        moq: row.moq,
      });
    }
    ok(res, [...groups.values()]);
  } catch (e) {
    console.error("searchB2b:", e);
    fail(res, 500, "Search failed");
  }
};

const getSupplierCatalogue = async (req, res) => {
  try {
    const conn = await activeConnection(req.user.organization_id, req.params.supplierOrgId);
    if (!conn.rows.length)
      return fail(res, 403, "You are not connected to this supplier", "NOT_CONNECTED");
    const r = await query(
      `SELECT id, name, generic_name, manufacturer, pack_size, unit_price, moq
       FROM supplier_products
       WHERE supplier_org_id = $1 AND is_active = true
       ORDER BY name`,
      [req.params.supplierOrgId]
    );
    ok(res, { connection: conn.rows[0], products: r.rows });
  } catch (e) {
    console.error("getSupplierCatalogue:", e);
    fail(res, 500, "Failed to load catalogue");
  }
};

const placeB2bOrder = async (req, res) => {
  try {
    const { items, notes } = req.body || {};
    if (!Array.isArray(items) || !items.length)
      return fail(res, 400, "items are required", "VALIDATION_ERROR");

    const conn = await activeConnection(req.user.organization_id, req.params.supplierOrgId);
    if (!conn.rows.length)
      return fail(res, 403, "You are not connected to this supplier", "NOT_CONNECTED");

    const wantIds = [...new Set(items.map((i) => i.supplierProductId))];
    const cat = await query(
      `SELECT * FROM supplier_products
       WHERE supplier_org_id = $1 AND id = ANY($2) AND is_active = true`,
      [req.params.supplierOrgId, wantIds]
    );
    const byId = new Map(cat.rows.map((r) => [r.id, r]));

    let total = 0;
    const lines = [];
    for (const raw of items) {
      const p = byId.get(raw.supplierProductId);
      if (!p) return fail(res, 400, "One or more items are not in this supplier's catalogue");
      const qty = Math.max(1, parseInt(raw.quantity) || 0);
      if (qty < p.moq) return fail(res, 400, `"${p.name}" has a minimum order of ${p.moq}`);
      const lineTotal = Number(p.unit_price) * qty;
      total += lineTotal;
      lines.push({ p, qty, unit: Number(p.unit_price), lineTotal });
    }

    const creditLimit = Number(conn.rows[0].credit_limit || 0);
    if (creditLimit > 0 && total > creditLimit)
      return fail(res, 400, `Order total ${total} exceeds your credit limit of ${creditLimit}`, "OVER_CREDIT_LIMIT");

    const orgId = req.user.organization_id;
    const poNumber = `B2B-${orgId.substring(0, 6)}-${Date.now()}`;

    const data = await withTransaction(async (client) => {
      const po = await client.query(
        `INSERT INTO refactored_purchase_orders
           (po_number, supplier_id, supplier_org_id, organization_id, status, source,
            order_date, notes, total_amount, tax_amount, discount, created_by)
         VALUES ($1, NULL, $2, $3, 'pending', 'b2b', CURRENT_DATE, $4, $5, 0, 0, $6)
         RETURNING *`,
        [poNumber, req.params.supplierOrgId, orgId, notes || null, total, req.user.id]
      );
      const poId = po.rows[0].id;

      for (const l of lines) {
        await client.query(
          `INSERT INTO refactored_purchase_order_items
             (purchase_order_id, supplier_product_id, item_name, quantity,
              unit_cost, total_cost, unit_price, total_price)
           VALUES ($1,$2,$3,$4,$5,$6,$5,$6)`,
          [poId, l.p.id, l.p.name, l.qty, l.unit, l.lineTotal]
        );
      }

      // credit ledger debit
      const last = await client.query(
        `SELECT running_balance FROM organization_ledger
         WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [orgId]
      );
      const prev = Number(last.rows[0]?.running_balance || 0);
      await client.query(
        `INSERT INTO organization_ledger
           (organization_id, transaction_type, description, reference_number,
            amount, debit_amount, credit_amount, running_balance, category, sub_category)
         VALUES ($1, 'purchase', $2, $3, $4, $4, 0, $5, 'b2b_purchase', 'supplier_order')`,
        [orgId, `B2B order to supplier`, poNumber, total, prev + total]
      );

      return { poId, poNumber, total, itemCount: lines.length };
    });

    res.status(201).json({ success: true, message: "Order placed", data });
  } catch (e) {
    if (e.status === 400) return fail(res, 400, e.message);
    console.error("placeB2bOrder:", e);
    fail(res, 500, "Could not place the order");
  }
};

// =========================================================================
// RETURNS  (Phase 3.2)
// =========================================================================

// pharmacy raises a return against a received B2B PO
const createReturn = async (req, res) => {
  try {
    const { purchaseOrderId, purchaseOrderItemId, quantity, reason, note } =
      req.body || {};
    if (!purchaseOrderId || !quantity || !reason)
      return fail(res, 400, "purchaseOrderId, quantity and reason are required", "VALIDATION_ERROR");
    if (!["near_expiry", "damaged", "wrong_item", "other"].includes(reason))
      return fail(res, 400, "Invalid reason", "VALIDATION_ERROR");

    const po = await query(
      `SELECT id, supplier_org_id, status FROM refactored_purchase_orders
       WHERE id = $1 AND organization_id = $2 AND source = 'b2b'`,
      [purchaseOrderId, req.user.organization_id]
    );
    if (!po.rows.length) return fail(res, 404, "Purchase order not found");
    if (po.rows[0].status !== "received")
      return fail(res, 400, "You can only return items from a received order");

    let itemName = null;
    let unitPrice = 0;
    if (purchaseOrderItemId) {
      const it = await query(
        `SELECT item_name, unit_price, quantity FROM refactored_purchase_order_items
         WHERE id = $1 AND purchase_order_id = $2`,
        [purchaseOrderItemId, purchaseOrderId]
      );
      if (!it.rows.length) return fail(res, 400, "That line is not on this order");
      if (Number(quantity) > it.rows[0].quantity)
        return fail(res, 400, "Return quantity exceeds the ordered quantity");
      itemName = it.rows[0].item_name;
      unitPrice = Number(it.rows[0].unit_price);
    }
    const refund = unitPrice * Number(quantity);

    const r = await query(
      `INSERT INTO supplier_returns
         (pharmacy_org_id, supplier_org_id, purchase_order_id, purchase_order_item_id,
          item_name, quantity, unit_price, refund_amount, reason, note, requested_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.user.organization_id,
        po.rows[0].supplier_org_id,
        purchaseOrderId,
        purchaseOrderItemId || null,
        itemName,
        Number(quantity),
        unitPrice,
        refund,
        reason,
        note || null,
        req.user.id,
      ]
    );
    res.status(201).json({ success: true, message: "Return requested", data: r.rows[0] });
  } catch (e) {
    console.error("createReturn:", e);
    fail(res, 500, "Failed to raise the return");
  }
};

const listReturns = async (req, res) => {
  try {
    const asSupplier = req.user.org_type === "supplier";
    const col = asSupplier ? "sr.supplier_org_id" : "sr.pharmacy_org_id";
    const r = await query(
      `SELECT sr.*, rpo.po_number,
              po.name AS pharmacy_name, so.name AS supplier_name
       FROM supplier_returns sr
       JOIN refactored_purchase_orders rpo ON rpo.id = sr.purchase_order_id
       JOIN organizations po ON po.id = sr.pharmacy_org_id
       JOIN organizations so ON so.id = sr.supplier_org_id
       WHERE ${col} = $1
       ORDER BY sr.created_at DESC
       LIMIT 200`,
      [req.user.organization_id]
    );
    ok(res, r.rows);
  } catch (e) {
    console.error("listReturns:", e);
    fail(res, 500, "Failed to load returns");
  }
};

// supplier accepts / rejects a return; accept credits the pharmacy's ledger
const resolveReturn = async (req, res) => {
  try {
    const { action, note } = req.body || {};
    if (!["accept", "reject"].includes(action))
      return fail(res, 400, "action must be 'accept' or 'reject'", "VALIDATION_ERROR");

    const cur = await query(
      `SELECT * FROM supplier_returns WHERE id = $1 AND supplier_org_id = $2`,
      [req.params.id, req.user.organization_id]
    );
    if (!cur.rows.length) return fail(res, 404, "Return not found");
    if (cur.rows[0].status !== "requested")
      return fail(res, 400, `This return is already ${cur.rows[0].status}`);

    const ret = cur.rows[0];
    const data = await withTransaction(async (client) => {
      const r = await client.query(
        `UPDATE supplier_returns
         SET status = $1, resolved_by = $2, resolved_at = now(), updated_at = now(),
             note = COALESCE($3, note)
         WHERE id = $4 RETURNING *`,
        [action === "accept" ? "accepted" : "rejected", req.user.id, note || null, ret.id]
      );

      if (action === "accept" && Number(ret.refund_amount) > 0) {
        const last = await client.query(
          `SELECT running_balance FROM organization_ledger
           WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [ret.pharmacy_org_id]
        );
        const prev = Number(last.rows[0]?.running_balance || 0);
        await client.query(
          `INSERT INTO organization_ledger
             (organization_id, transaction_type, description, reference_number,
              amount, debit_amount, credit_amount, running_balance, category, sub_category)
           VALUES ($1, 'return', $2, $3, $4, 0, $4, $5, 'b2b_return', 'supplier_return')`,
          [
            ret.pharmacy_org_id,
            `Return credit — ${ret.item_name || "item"}`,
            String(ret.id),
            Number(ret.refund_amount),
            prev - Number(ret.refund_amount),
          ]
        );
      }
      return r.rows[0];
    });

    ok(res, data, action === "accept" ? "Return accepted" : "Return rejected");
  } catch (e) {
    console.error("resolveReturn:", e);
    fail(res, 500, "Failed to resolve the return");
  }
};

// =========================================================================
// SUPPLIER ANALYTICS  (Phase 3.4)
// =========================================================================

const supplierAnalytics = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const [totals, top, fill, statuses] = await Promise.all([
      query(
        `SELECT COUNT(*) AS orders,
                COALESCE(SUM(total_amount), 0) AS revenue,
                COUNT(DISTINCT organization_id) AS pharmacies
         FROM refactored_purchase_orders
         WHERE supplier_org_id = $1 AND source = 'b2b' AND status <> 'cancelled'`,
        [orgId]
      ),
      query(
        `SELECT o.name, COUNT(*) AS orders, COALESCE(SUM(rpo.total_amount),0) AS revenue
         FROM refactored_purchase_orders rpo
         JOIN organizations o ON o.id = rpo.organization_id
         WHERE rpo.supplier_org_id = $1 AND rpo.source = 'b2b' AND rpo.status <> 'cancelled'
         GROUP BY o.name ORDER BY revenue DESC LIMIT 5`,
        [orgId]
      ),
      query(
        `SELECT SUM(i.quantity) AS ordered_qty,
                SUM(COALESCE(i.received_quantity,0)) AS received_qty
         FROM refactored_purchase_orders rpo
         JOIN refactored_purchase_order_items i ON i.purchase_order_id = rpo.id
         WHERE rpo.supplier_org_id = $1 AND rpo.source = 'b2b' AND rpo.status = 'received'`,
        [orgId]
      ),
      query(
        `SELECT status, COUNT(*) AS n
         FROM refactored_purchase_orders
         WHERE supplier_org_id = $1 AND source = 'b2b'
         GROUP BY status`,
        [orgId]
      ),
    ]);

    const f = fill.rows[0];
    ok(res, {
      totals: {
        orders: Number(totals.rows[0].orders),
        revenue: Number(totals.rows[0].revenue),
        pharmacies: Number(totals.rows[0].pharmacies),
      },
      topPharmacies: top.rows.map((r) => ({
        name: r.name,
        orders: Number(r.orders),
        revenue: Number(r.revenue),
      })),
      fillRate:
        f.ordered_qty > 0
          ? Math.round((Number(f.received_qty) / Number(f.ordered_qty)) * 1000) / 10
          : null,
      statusBreakdown: Object.fromEntries(
        statuses.rows.map((r) => [r.status, Number(r.n)])
      ),
    });
  } catch (e) {
    console.error("supplierAnalytics:", e);
    fail(res, 500, "Failed to load analytics");
  }
};

module.exports = {
  // supplier
  listCatalogue,
  createCatalogueItem,
  updateCatalogueItem,
  deleteCatalogueItem,
  listIncomingOrders,
  updateIncomingOrder,
  supplierAnalytics,
  // connections (both)
  listConnections,
  requestConnection,
  respondToConnection,
  // returns (both)
  createReturn,
  listReturns,
  resolveReturn,
  // pharmacy b2b
  listConnectedSuppliers,
  getSupplierCatalogue,
  searchB2b,
  placeB2bOrder,
};
