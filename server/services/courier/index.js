// Courier registry. `getCourier(name)` returns an adapter with:
//   assignCourier(order) -> { ref }        book the shipment, returns tracking id
//   getStatus(ref)       -> { externalStatus, raw }
//   mapStatus(externalStatus) -> internal storefront status | null   (null = unknown)
//   parseWebhook(body)   -> { ref, externalStatus, raw }
//
// Tests register a fake adapter via registerCourier().

const manual = require("./manual");
const postex = require("./postex");

const registry = new Map([
  [manual.name, manual],
  [postex.name, postex],
]);

function registerCourier(name, adapter) {
  registry.set(name, adapter);
}

function getCourier(name) {
  const a = registry.get(name || "manual");
  if (!a) {
    const e = new Error(`Unknown courier: ${name}`);
    e.status = 400;
    throw e;
  }
  return a;
}

module.exports = { getCourier, registerCourier, registry };
