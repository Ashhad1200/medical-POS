// Payment-provider registry. `getProvider(name)` returns an adapter with:
//   createPayment(order) -> { ref, redirectUrl, fields? }
//   parseWebhook(body)   -> { ref, paid, valid, raw }
//
// 'manual' covers cod / in_store (nothing to charge). Tests register a fake
// via registerProvider().

const manual = require("./manual");
const jazzcash = require("./jazzcash");

const registry = new Map([
  [manual.name, manual],
  [jazzcash.name, jazzcash],
]);

function registerProvider(name, adapter) {
  registry.set(name, adapter);
}

function getProvider(name) {
  const a = registry.get(name || "manual");
  if (!a) {
    const e = new Error(`Unknown payment provider: ${name}`);
    e.status = 400;
    throw e;
  }
  return a;
}

module.exports = { getProvider, registerProvider, registry };
