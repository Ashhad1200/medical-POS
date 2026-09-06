// Custom-domain provider seam. TLS issuance + edge routing for a verified
// custom host is host-specific (Vercel / Netlify / Cloudflare / Railway all
// expose a multi-tenant "Domains API"). Until the production host of `landing/`
// is chosen (PRODUCT_ROADMAP.md §6a build-vs-buy note), the `manual` provider
// records lifecycle state without a real cert; a real adapter drops in here.
//
// Contract:
//   issueCert(domain)  -> { certStatus: 'issued'|'issuing'|'failed', expiresAt?, reason? }
//   revokeCert(domain) -> void        (release on delete / suspend)
//   checkCert(domain)  -> { certStatus, expiresAt?, reason? }   (daily health re-check)

const manual = require("./manual");

const registry = new Map([[manual.name, manual]]);

function registerDomainProvider(name, adapter) {
  registry.set(name, adapter);
}

function getDomainProvider(name) {
  const a = registry.get(name || process.env.DOMAIN_PROVIDER || "manual");
  if (!a) {
    const e = new Error(`Unknown domain provider: ${name}`);
    e.status = 400;
    throw e;
  }
  return a;
}

module.exports = { getDomainProvider, registerDomainProvider, registry };
