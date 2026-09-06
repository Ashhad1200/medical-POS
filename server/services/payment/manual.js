// ManualPayment — the COD / pay-in-store case: there is nothing to charge
// online and no webhook. Kept as an adapter so getProvider() always resolves.

module.exports = {
  name: "manual",

  async createPayment(order) {
    return { ref: null, redirectUrl: null };
  },

  parseWebhook(body) {
    body = body || {};
    return { ref: body.ref, paid: false, valid: false, raw: body };
  },
};
