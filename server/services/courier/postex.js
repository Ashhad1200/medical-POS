// PostEx (Pakistan) adapter. Real HTTP, but only when POSTEX_API_TOKEN is set —
// otherwise assign/getStatus throw "not configured" and the store just uses
// `manual`. The status map + parseWebhook are pure, so they're testable offline.
//
// PostEx order statuses (transactionStatusMessage): "Booked", "PickedUp",
// "OutForDelivery", "Delivered", "Returned", "Attempted", "UnBooked", ...
// ref: https://api.postex.pk docs

const BASE = process.env.POSTEX_BASE_URL || "https://api.postex.pk/services/integration/api/order/v3";

const STATUS_MAP = {
  PickedUp: "out_for_delivery",
  OutForDelivery: "out_for_delivery",
  EnRoute: "out_for_delivery",
  Delivered: "delivered",
  Returned: "cancelled",
  Cancelled: "cancelled",
  Expired: "cancelled",
  // Booked / UnBooked / Attempted / "Delivery Under Review" -> no internal change
};

function token() {
  const t = process.env.POSTEX_API_TOKEN;
  if (!t) {
    const e = new Error("PostEx courier is not configured (POSTEX_API_TOKEN missing)");
    e.status = 501;
    throw e;
  }
  return t;
}

module.exports = {
  name: "postex",

  async assignCourier(order) {
    const res = await fetch(`${BASE}/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: token() },
      body: JSON.stringify({
        orderRefNumber: order.order_number,
        invoicePayment: order.payment_method === "cod" ? Number(order.total) : 0,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        deliveryAddress: order.customer_address,
        cityName: order.customer_city || "",
        items: 1,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(body?.statusMessage || `PostEx create-order failed (${res.status})`);
      e.status = 502;
      throw e;
    }
    return { ref: body?.dist?.trackingNumber || body?.trackingNumber, raw: body };
  },

  async getStatus(ref) {
    const res = await fetch(`${BASE}/track-order/${encodeURIComponent(ref)}`, {
      headers: { token: token() },
    });
    const body = await res.json().catch(() => ({}));
    const ext = body?.dist?.transactionStatusMessage || body?.transactionStatusMessage || null;
    return { externalStatus: ext, raw: body };
  },

  mapStatus(externalStatus) {
    return STATUS_MAP[externalStatus] || null;
  },

  parseWebhook(body) {
    body = body || {};
    return {
      ref: body.trackingNumber || body.orderRefNumber || body.ref,
      externalStatus: body.transactionStatusMessage || body.status,
      raw: body,
    };
  },
};
