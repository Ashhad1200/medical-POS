const crypto = require("crypto");
const dnsp = require("dns").promises;
const { query } = require("../config/database");
const { getDomainProvider } = require("../services/domain");

const ok = (res, data, message = "OK") =>
  res.json({ success: true, message, data });
const fail = (res, status, message, code) =>
  res.status(status).json({ success: false, message, ...(code ? { code } : {}) });

// injectable so tests don't hit real DNS
let resolveTxt = (host) => dnsp.resolveTxt(host);
const _setTxtResolver = (fn) => {
  resolveTxt = fn;
};

const PLATFORM_DOMAIN = (process.env.PLATFORM_DOMAIN || "medpos.app").toLowerCase();
const DNS_TARGET = process.env.STOREFRONT_DNS_TARGET || `cname.${PLATFORM_DOMAIN}`;

const HOST_RE =
  /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

// validate + classify a candidate host. ponytail: label-count heuristic for
// apex vs subdomain — no Public Suffix List, so `foo.co.uk` reads as a
// subdomain. Cosmetic only (picks A vs CNAME guidance); revisit with `psl` if
// it bites.
function classify(raw) {
  const host = String(raw || "").trim().toLowerCase().replace(/\.$/, "");
  if (!host) return { error: "domain is required" };
  if (host === "localhost" || IPV4_RE.test(host) || host.includes(":"))
    return { error: "not a valid registrable domain" };
  if (!HOST_RE.test(host)) return { error: "not a valid registrable domain" };
  if (!/^[a-z]{2,}$/.test(host.split(".").pop()))
    return { error: "not a valid registrable domain" };
  if (host === PLATFORM_DOMAIN || host.endsWith(`.${PLATFORM_DOMAIN}`))
    return { error: "that domain belongs to the platform" };
  return { host, kind: host.split(".").length <= 2 ? "apex" : "subdomain" };
}

const publicShape = (d) => ({
  domain: d.domain,
  kind: d.kind,
  status: d.status,
  certStatus: d.cert_status,
  verifiedAt: d.verified_at,
  certExpiresAt: d.cert_expires_at,
  failureReason: d.failure_reason,
  lastCheckedAt: d.last_checked_at,
});

const dnsRecords = (d) => [
  { type: "TXT", host: d.domain, value: d.verification_token },
  d.kind === "apex"
    ? { type: "A", host: d.domain, value: DNS_TARGET }
    : { type: "CNAME", host: d.domain, value: DNS_TARGET },
];

// -------------------------------------------------------------------------
// authed pharmacy side  (/api/storefront/domain, requireFeature('custom_domain'))
// -------------------------------------------------------------------------

// POST /api/storefront/domain
const addDomain = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const c = classify(req.body?.domain);
    if (c.error) return fail(res, 400, c.error, "VALIDATION_ERROR");

    // account standing — `auth` already blocks suspended/expired orgs, but §6a
    // wants the gate explicit here too.
    const org = await query(
      "SELECT is_active, access_valid_till FROM organizations WHERE id = $1",
      [orgId]
    );
    const o = org.rows[0] || {};
    if (o.is_active === false || (o.access_valid_till && new Date(o.access_valid_till) <= new Date()))
      return fail(res, 403, "Organisation is not in good standing", "ORG_STANDING");

    const token = "medpos-verify=" + crypto.randomBytes(16).toString("hex");
    const r = await query(
      `INSERT INTO storefront_domains
         (organization_id, domain, kind, status, verification_token, dns_target)
       VALUES ($1,$2,$3,'pending',$4,$5)
       ON CONFLICT (organization_id) DO UPDATE
         SET domain = $2, kind = $3, status = 'pending', verification_token = $4,
             dns_target = $5, verified_at = NULL, cert_status = 'none',
             cert_expires_at = NULL, failure_reason = NULL, updated_at = now()
       RETURNING *`,
      [orgId, c.host, c.kind, token, DNS_TARGET]
    );
    const d = r.rows[0];
    res.status(201).json({
      success: true,
      data: { ...publicShape(d), records: dnsRecords(d) },
    });
  } catch (e) {
    if (e.code === "23505")
      return fail(res, 409, "That domain is already in use by another store", "DOMAIN_TAKEN");
    console.error("addDomain:", e);
    fail(res, 500, "Failed to add domain");
  }
};

async function markPending(id, reason) {
  await query(
    "UPDATE storefront_domains SET status='pending', failure_reason=$2, last_checked_at=now(), updated_at=now() WHERE id=$1",
    [id, reason]
  );
}

// POST /api/storefront/domain/verify
const verifyDomain = async (req, res) => {
  try {
    const cur = await query(
      "SELECT * FROM storefront_domains WHERE organization_id = $1",
      [req.user.organization_id]
    );
    if (!cur.rows.length) return fail(res, 404, "No domain to verify");
    const d = cur.rows[0];
    if (d.status === "active") return ok(res, publicShape(d), "Already active");

    const pending = async (reason) => {
      await markPending(d.id, reason);
      return ok(res, { ...publicShape(d), status: "pending", failureReason: reason }, "Not verified yet");
    };

    let txt = [];
    try {
      txt = (await resolveTxt(d.domain)).flat();
    } catch (e) {
      return pending(`DNS lookup failed (${e.code || "error"}) — records may not have propagated yet`);
    }
    if (!txt.includes(d.verification_token)) {
      return pending("verification TXT record not found yet");
    }

    // ownership proven — issue the cert (never go active before it's valid)
    await query(
      "UPDATE storefront_domains SET status='verifying', verified_at=now(), cert_status='issuing', failure_reason=NULL, last_checked_at=now(), updated_at=now() WHERE id=$1",
      [d.id]
    );
    try {
      const cert = await getDomainProvider().issueCert(d.domain);
      if (cert.certStatus !== "issued")
        throw new Error(cert.reason || "certificate issuance did not complete");
      const u = await query(
        "UPDATE storefront_domains SET status='active', cert_status='issued', cert_expires_at=$2, updated_at=now() WHERE id=$1 RETURNING *",
        [d.id, cert.expiresAt || null]
      );
      return ok(res, publicShape(u.rows[0]), "Domain is active");
    } catch (e) {
      await query(
        "UPDATE storefront_domains SET status='failed', cert_status='failed', failure_reason=$2, updated_at=now() WHERE id=$1",
        [d.id, String(e.message).slice(0, 200)]
      );
      return ok(res, { ...publicShape(d), status: "failed", failureReason: e.message }, "Certificate failed");
    }
  } catch (e) {
    console.error("verifyDomain:", e);
    fail(res, 500, "Failed to verify domain");
  }
};

// GET /api/storefront/domain
const getDomain = async (req, res) => {
  try {
    const r = await query(
      "SELECT * FROM storefront_domains WHERE organization_id = $1",
      [req.user.organization_id]
    );
    if (!r.rows.length) return ok(res, null);
    ok(res, { ...publicShape(r.rows[0]), records: dnsRecords(r.rows[0]) });
  } catch (e) {
    console.error("getDomain:", e);
    fail(res, 500, "Failed to load domain");
  }
};

// DELETE /api/storefront/domain
const deleteDomain = async (req, res) => {
  try {
    const r = await query(
      "DELETE FROM storefront_domains WHERE organization_id = $1 RETURNING domain",
      [req.user.organization_id]
    );
    if (r.rows.length) {
      try {
        await getDomainProvider().revokeCert(r.rows[0].domain);
      } catch (e) {
        console.error("revokeCert:", e.message);
      }
    }
    ok(res, { removed: r.rows.length > 0 });
  } catch (e) {
    console.error("deleteDomain:", e);
    fail(res, 500, "Failed to remove domain");
  }
};

// -------------------------------------------------------------------------
// public — resolve an incoming Host header to a storefront slug
// GET /api/public/storefront/domain/:host
// -------------------------------------------------------------------------
const resolveDomain = async (req, res) => {
  try {
    const host = String(req.params.host || "").trim().toLowerCase();
    const r = await query(
      `SELECT s.slug
         FROM storefront_domains d
         JOIN storefront_settings s ON s.organization_id = d.organization_id
         JOIN organizations o       ON o.id = d.organization_id
        WHERE d.domain = $1
          AND d.status = 'active' AND d.cert_status = 'issued'
          AND s.is_live = true
          AND o.is_active = true
          AND (o.access_valid_till IS NULL OR o.access_valid_till > now())`,
      [host]
    );
    if (!r.rows.length) return fail(res, 404, "Domain not found");
    ok(res, { slug: r.rows[0].slug });
  } catch (e) {
    console.error("resolveDomain:", e);
    fail(res, 500, "Failed to resolve domain");
  }
};

// -------------------------------------------------------------------------
// daily health re-check (1f-c.3) — call from a cron/worker, not a route.
// Re-resolves the TXT record and re-checks the cert; on drift -> failed.
// -------------------------------------------------------------------------
async function recheckDomains() {
  const { rows } = await query(
    "SELECT * FROM storefront_domains WHERE status IN ('active','verifying')"
  );
  const report = [];
  for (const d of rows) {
    let reason = null;
    try {
      const txt = (await resolveTxt(d.domain)).flat();
      if (!txt.includes(d.verification_token)) reason = "verification TXT record no longer present";
    } catch (e) {
      reason = `DNS lookup failed (${e.code || "error"})`;
    }
    if (!reason) {
      try {
        const cert = await getDomainProvider().checkCert(d.domain);
        if (cert.certStatus !== "issued") reason = cert.reason || "certificate is no longer valid";
      } catch (e) {
        reason = `certificate check failed (${e.message})`;
      }
    }
    if (reason) {
      await query(
        "UPDATE storefront_domains SET status='failed', failure_reason=$2, last_checked_at=now(), updated_at=now() WHERE id=$1",
        [d.id, reason]
      );
      report.push({ domain: d.domain, ok: false, reason });
    } else {
      await query("UPDATE storefront_domains SET last_checked_at=now() WHERE id=$1", [d.id]);
      report.push({ domain: d.domain, ok: true });
    }
  }
  return report;
}

module.exports = {
  addDomain,
  verifyDomain,
  getDomain,
  deleteDomain,
  resolveDomain,
  recheckDomains,
  classify,
  _setTxtResolver,
};
