// ManualCourier — the current behaviour: the pharmacy assigns a rider by
// name/phone and moves the order by hand. No external system, no webhook.
// Kept as an adapter so "no integration" is just another registered courier.

const INTERNAL = ["confirmed", "out_for_delivery", "delivered", "cancelled"];

module.exports = {
  name: "manual",

  async assignCourier(order) {
    return { ref: `MANUAL-${order.order_number}` };
  },

  // nothing to poll — the pharmacy is the source of truth
  async getStatus(ref) {
    return { externalStatus: null, raw: null };
  },

  // manual "external" statuses are just the internal words
  mapStatus(externalStatus) {
    return INTERNAL.includes(externalStatus) ? externalStatus : null;
  },

  parseWebhook(body) {
    body = body || {};
    return { ref: body.ref, externalStatus: body.status, raw: body };
  },
};
