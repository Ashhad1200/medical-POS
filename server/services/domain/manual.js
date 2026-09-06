// ManualDomainProvider — no real ACME. Once DNS ownership is verified it
// reports the cert as "issued" with a 90-day window so the lifecycle
// (active -> serve -> renew-check -> revoke) is exercisable end to end.
// Swap for a host Domains API adapter before production.

const DAY = 24 * 60 * 60 * 1000;

module.exports = {
  name: "manual",

  async issueCert(domain) {
    return {
      certStatus: "issued",
      expiresAt: new Date(Date.now() + 90 * DAY).toISOString(),
    };
  },

  async revokeCert(domain) {
    /* nothing to release without a real issuer */
  },

  async checkCert(domain) {
    return { certStatus: "issued" };
  },
};
