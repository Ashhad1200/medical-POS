const { query, withTransaction } = require("../config/database");

const ok = (res, data, message = "OK") =>
  res.json({ success: true, message, data });
const fail = (res, status, message, code) =>
  res.status(status).json({ success: false, message, ...(code ? { code } : {}) });

const BG_STYLES = ["color", "gradient", "image"];

// -------------------------------------------------------------------------
// shared with storefrontController (getStore / placeOrder)
// -------------------------------------------------------------------------

// active + in-window deals for an org: Map<product_id, discount_pct>
async function activeDealsMap(organizationId) {
  const r = await query(
    `SELECT product_id, discount_pct FROM storefront_deals
     WHERE organization_id = $1 AND is_active = true
       AND (starts_at IS NULL OR starts_at <= now())
       AND (ends_at   IS NULL OR ends_at   >= now())`,
    [organizationId]
  );
  const m = new Map();
  for (const row of r.rows) m.set(row.product_id, Number(row.discount_pct));
  return m;
}

// apply deals to catalogueRows() output; attaches originalPrice/discountPct
function applyDeals(rows, dealsMap) {
  return rows.map((r) => {
    const base = Number(r.price || 0);
    const pct = dealsMap.get(r.id);
    if (!pct || base <= 0) return { ...r, price: base };
    const discounted = Math.round(base * (1 - pct / 100) * 100) / 100;
    return { ...r, price: discounted, originalPrice: base, discountPct: pct };
  });
}

// banners (active + in-window, ordered) + featured product ids, for the public payload
async function publicCustomization(organizationId) {
  const banners = await query(
    `SELECT * FROM storefront_banners
     WHERE organization_id = $1 AND is_active = true
       AND (starts_at IS NULL OR starts_at <= now())
       AND (ends_at   IS NULL OR ends_at   >= now())
     ORDER BY sort_order, created_at`,
    [organizationId]
  );
  const featured = await query(
    `SELECT product_id FROM storefront_featured_products
     WHERE organization_id = $1 ORDER BY sort_order, created_at`,
    [organizationId]
  );
  return {
    banners: banners.rows.map((b) => ({
      headline: b.headline,
      subheadline: b.subheadline,
      ctaLabel: b.cta_label,
      ctaHref: b.cta_href,
      imageUrl: b.image_url,
      bgStyle: b.bg_style,
      bgValue: b.bg_value,
    })),
    featured: featured.rows.map((f) => f.product_id),
  };
}

// -------------------------------------------------------------------------
// authed pharmacy side  (/api/storefront/customization)
// -------------------------------------------------------------------------

const getCustomization = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const [banners, deals, featured] = await Promise.all([
      query(
        "SELECT * FROM storefront_banners WHERE organization_id = $1 ORDER BY sort_order, created_at",
        [orgId]
      ),
      query(
        "SELECT id, product_id, discount_pct, starts_at, ends_at, is_active FROM storefront_deals WHERE organization_id = $1 ORDER BY created_at",
        [orgId]
      ),
      query(
        "SELECT product_id, sort_order FROM storefront_featured_products WHERE organization_id = $1 ORDER BY sort_order, created_at",
        [orgId]
      ),
    ]);
    ok(res, {
      banners: banners.rows,
      deals: deals.rows,
      featured: featured.rows.map((f) => f.product_id),
    });
  } catch (e) {
    console.error("storefront getCustomization:", e);
    fail(res, 500, "Failed to load customization");
  }
};

// PUT — replace-all: body { banners:[], deals:[], featured:[] }
const putCustomization = async (req, res) => {
  const orgId = req.user.organization_id;
  const b = req.body || {};
  const banners = Array.isArray(b.banners) ? b.banners : [];
  const deals = Array.isArray(b.deals) ? b.deals : [];
  const featured = Array.isArray(b.featured) ? b.featured : [];

  // ---- validate banners ----
  for (const bn of banners) {
    if (bn.bg_style && !BG_STYLES.includes(bn.bg_style))
      return fail(res, 400, `bg_style must be one of ${BG_STYLES.join(", ")}`, "VALIDATION_ERROR");
  }

  // ---- validate deals ----
  const dealProductIds = deals.map((d) => d.product_id);
  if (new Set(dealProductIds).size !== dealProductIds.length)
    return fail(res, 400, "A product can only have one deal", "VALIDATION_ERROR");
  for (const d of deals) {
    const pct = Number(d.discount_pct);
    if (!(pct > 0 && pct <= 90))
      return fail(res, 400, "discount_pct must be between 1 and 90", "VALIDATION_ERROR");
  }

  // ---- every referenced product must belong to this org ----
  const refIds = [...new Set([...dealProductIds, ...featured])].filter(Boolean);
  if (refIds.length) {
    const owned = await query(
      "SELECT id FROM products WHERE organization_id = $1 AND id = ANY($2)",
      [orgId, refIds]
    );
    const ownedSet = new Set(owned.rows.map((r) => r.id));
    const foreign = refIds.filter((id) => !ownedSet.has(id));
    if (foreign.length)
      return fail(res, 400, "One or more products are not in your catalogue", "VALIDATION_ERROR");
  }
  if (new Set(featured).size !== featured.length)
    return fail(res, 400, "Duplicate featured product", "VALIDATION_ERROR");

  try {
    const data = await withTransaction(async (client) => {
      await client.query("DELETE FROM storefront_banners WHERE organization_id = $1", [orgId]);
      await client.query("DELETE FROM storefront_deals WHERE organization_id = $1", [orgId]);
      await client.query("DELETE FROM storefront_featured_products WHERE organization_id = $1", [orgId]);

      for (let i = 0; i < banners.length; i++) {
        const bn = banners[i];
        await client.query(
          `INSERT INTO storefront_banners
             (organization_id, headline, subheadline, cta_label, cta_href, image_url,
              bg_style, bg_value, sort_order, is_active, starts_at, ends_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            orgId,
            bn.headline || null,
            bn.subheadline || null,
            bn.cta_label || null,
            bn.cta_href || null,
            bn.image_url || null,
            bn.bg_style || "color",
            bn.bg_value || null,
            i,
            bn.is_active !== false,
            bn.starts_at || null,
            bn.ends_at || null,
          ]
        );
      }

      for (const d of deals) {
        await client.query(
          `INSERT INTO storefront_deals
             (organization_id, product_id, discount_pct, starts_at, ends_at, is_active)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [orgId, d.product_id, Number(d.discount_pct), d.starts_at || null, d.ends_at || null, d.is_active !== false]
        );
      }

      for (let i = 0; i < featured.length; i++) {
        await client.query(
          `INSERT INTO storefront_featured_products (organization_id, product_id, sort_order)
           VALUES ($1,$2,$3)`,
          [orgId, featured[i], i]
        );
      }
      return true;
    });
    if (data) {
      const orgId2 = orgId;
      return getCustomization({ user: { organization_id: orgId2 } }, res);
    }
  } catch (e) {
    console.error("storefront putCustomization:", e);
    fail(res, 500, "Failed to save customization");
  }
};

module.exports = {
  activeDealsMap,
  applyDeals,
  publicCustomization,
  getCustomization,
  putCustomization,
};
