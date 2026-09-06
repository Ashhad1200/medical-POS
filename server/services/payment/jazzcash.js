// JazzCash (Pakistan) adapter — "Page Redirection" flow.
// No server-to-server call: createPayment() builds the signed form and the
// browser is redirected to JazzCash with it. The return/IPN POST is verified
// in parseWebhook() by recomputing the secure hash.
//
// Env (all required for a live charge):
//   JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT
//   JAZZCASH_RETURN_URL   — where JazzCash POSTs the result
//   JAZZCASH_BASE_URL     — merchant form endpoint (defaults to sandbox)

const crypto = require("crypto");

const BASE =
  process.env.JAZZCASH_BASE_URL ||
  "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";

function cfg() {
  const apiBase = process.env.STOREFRONT_API_URL || "http://localhost:4001";
  const c = {
    merchantId: process.env.JAZZCASH_MERCHANT_ID,
    password: process.env.JAZZCASH_PASSWORD,
    salt: process.env.JAZZCASH_INTEGRITY_SALT,
    // gateway posts the result back here; our webhook verifies then 302s the
    // browser to the consumer order page. Operators can override.
    returnUrl:
      process.env.JAZZCASH_RETURN_URL ||
      `${apiBase}/api/public/storefront/payment/webhook/jazzcash`,
  };
  if (!c.merchantId || !c.password || !c.salt) {
    const e = new Error("JazzCash is not configured (JAZZCASH_MERCHANT_ID/PASSWORD/INTEGRITY_SALT missing)");
    e.status = 501;
    throw e;
  }
  return c;
}

// v2 secure hash: HMAC-SHA256(key=salt, data = salt & v1 & v2 & ... ) over the
// non-empty pp_* / ppmpf_* fields, keys sorted ascending. Hex, upper-case.
function computeSecureHash(params, salt) {
  const data = Object.keys(params)
    .filter((k) => k !== "pp_SecureHash" && (k.startsWith("pp_") || k.startsWith("ppmpf_")))
    .sort()
    .map((k) => params[k])
    .filter((v) => v !== undefined && v !== null && String(v).length > 0)
    .join("&");
  return crypto
    .createHmac("sha256", salt)
    .update(`${salt}&${data}`)
    .digest("hex")
    .toUpperCase();
}

const stamp = (d = new Date()) =>
  d.toISOString().replace(/[-:T]/g, "").slice(0, 14); // yyyyMMddHHmmss

module.exports = {
  name: "jazzcash",
  computeSecureHash, // exported for tests

  async createPayment(order) {
    const c = cfg();
    const now = new Date();
    const expiry = new Date(now.getTime() + 60 * 60 * 1000);
    const ref = `T${stamp(now)}${String(order.order_number).replace(/\W/g, "").slice(-6)}`;

    const fields = {
      pp_Version: "2.0",
      pp_TxnType: "MWALLET",
      pp_Language: "EN",
      pp_MerchantID: c.merchantId,
      pp_Password: c.password,
      pp_TxnRefNo: ref,
      pp_Amount: String(Math.round(Number(order.total) * 100)), // paisa
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: stamp(now),
      pp_TxnExpiryDateTime: stamp(expiry),
      pp_BillReference: String(order.order_number),
      pp_Description: `Order ${order.order_number}`,
      pp_ReturnURL: c.returnUrl || "",
    };
    fields.pp_SecureHash = computeSecureHash(fields, c.salt);

    return { ref, redirectUrl: BASE, fields };
  },

  // JazzCash POSTs back pp_TxnRefNo, pp_ResponseCode ('000' = success),
  // pp_SecureHash. Recompute + compare; only a valid hash is trusted.
  parseWebhook(body) {
    body = body || {};
    let valid = false;
    try {
      const expected = computeSecureHash(body, cfg().salt);
      valid =
        typeof body.pp_SecureHash === "string" &&
        body.pp_SecureHash.toUpperCase() === expected;
    } catch {
      valid = false;
    }
    return {
      ref: body.pp_TxnRefNo || body.ref,
      paid: valid && String(body.pp_ResponseCode) === "000",
      valid,
      raw: body,
    };
  },
};
