// JazzCash env — read at call-time by the adapter, so setting it here is enough.
process.env.JAZZCASH_MERCHANT_ID = "TESTMERCHANT";
process.env.JAZZCASH_PASSWORD = "testpass";
process.env.JAZZCASH_INTEGRITY_SALT = "testsalt123";
process.env.JAZZCASH_RETURN_URL = "http://localhost/return";

const { app, request, pool, uniq, closePool, makeTenant } = require("./helpers");
const { getProvider } = require("../services/payment");
const jazzcash = require("../services/payment/jazzcash");

const SALT = process.env.JAZZCASH_INTEGRITY_SALT;

function signedWebhook(ref, code, over = {}) {
  const body = {
    pp_TxnRefNo: ref,
    pp_ResponseCode: code,
    pp_Amount: "11000",
    pp_MerchantID: "TESTMERCHANT",
    pp_TxnCurrency: "PKR",
    ...over,
  };
  body.pp_SecureHash = jazzcash.computeSecureHash(body, SALT);
  return body;
}

let A, slug, otc;
const authA = (r) => r.set("Authorization", `Bearer ${A.token}`);

async function addProduct(over) {
  const body = {
    name: `P ${uniq("m")}`,
    manufacturer: "Acme",
    selling_price: 30,
    cost_price: 15,
    quantity: 100,
    expiry_date: "2029-01-01",
    prescription_required: false,
    ...over,
  };
  const r = await request(app)
    .post("/api/medicines")
    .set("Authorization", `Bearer ${A.token}`)
    .send(body);
  return { id: r.body.data.productId, name: body.name };
}

async function placeOnline(qty = 2) {
  const r = await request(app)
    .post(`/api/public/storefront/${slug}/order`)
    .send({
      customer: { name: "C", phone: "03001112222", address: "1 St", city: "Karachi" },
      paymentMethod: "online",
      items: [{ productId: otc.id, quantity: qty }],
    });
  return r;
}

beforeAll(async () => {
  A = await makeTenant("pro");
  otc = await addProduct({ name: `OTC ${uniq("m")}` });
  const s = await authA(
    request(app).put("/api/storefront/settings").send({
      display_name: "Pay Store",
      delivery_fee: 0,
      min_order: 0,
      online_enabled: true,
      is_live: true,
    })
  );
  slug = s.body.data.slug;
});
afterAll(closePool);

describe("payment provider contract", () => {
  it("registered providers expose createPayment + parseWebhook", () => {
    for (const name of ["manual", "jazzcash"]) {
      const p = getProvider(name);
      expect(typeof p.createPayment).toBe("function");
      expect(typeof p.parseWebhook).toBe("function");
    }
  });

  it("getProvider throws on an unknown name", () => {
    expect(() => getProvider("paypal")).toThrow(/Unknown payment provider/);
  });

  it("computeSecureHash is deterministic and order-independent", () => {
    const a = jazzcash.computeSecureHash({ pp_B: "2", pp_A: "1" }, SALT);
    const b = jazzcash.computeSecureHash({ pp_A: "1", pp_B: "2" }, SALT);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9A-F]{64}$/);
  });

  it("parseWebhook validates the signature and maps the response code", () => {
    const good = jazzcash.parseWebhook(signedWebhook("T123", "000"));
    expect(good.valid).toBe(true);
    expect(good.paid).toBe(true);
    expect(good.ref).toBe("T123");

    const declined = jazzcash.parseWebhook(signedWebhook("T123", "999"));
    expect(declined.valid).toBe(true);
    expect(declined.paid).toBe(false);

    const tampered = signedWebhook("T123", "000");
    tampered.pp_Amount = "1"; // changed after signing
    expect(jazzcash.parseWebhook(tampered).valid).toBe(false);
  });
});

describe("POST /api/public/storefront/:slug/order — online", () => {
  it("creates an unpaid order and returns payment init data", async () => {
    const r = await placeOnline();
    expect(r.status).toBe(201);
    expect(r.body.data.paymentStatus).toBe("unpaid");
    expect(r.body.data.payment.provider).toBe("jazzcash");
    expect(r.body.data.payment.ref).toBeTruthy();
    expect(r.body.data.payment.redirectUrl).toMatch(/^https:\/\//);

    const row = await pool.query(
      "SELECT payment_method, payment_provider, payment_ref, payment_status FROM storefront_orders WHERE order_number = $1",
      [r.body.data.orderNumber]
    );
    expect(row.rows[0]).toMatchObject({
      payment_method: "online",
      payment_provider: "jazzcash",
      payment_status: "unpaid",
    });
    expect(row.rows[0].payment_ref).toBeTruthy();
  });

  it("rejects online payment when the store has it disabled (400)", async () => {
    await authA(request(app).put("/api/storefront/settings").send({ online_enabled: false }));
    const r = await placeOnline();
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/online payment is not available/i);
    await authA(request(app).put("/api/storefront/settings").send({ online_enabled: true }));
  });
});

describe("unpaid online order is not fulfillable", () => {
  it("blocks confirm until paid, allows cancel, and confirms after the webhook", async () => {
    const placed = await placeOnline(2);
    const orderId = placed.body.data.orderId;
    const ref = placed.body.data.payment.ref;

    const blocked = await authA(
      request(app).patch(`/api/storefront/orders/${orderId}`).send({ status: "confirmed" })
    );
    expect(blocked.status).toBe(400);
    expect(blocked.body.code).toBe("PAYMENT_REQUIRED");

    // pay it
    const wh = await request(app)
      .post("/api/public/storefront/payment/webhook/jazzcash")
      .send(signedWebhook(ref, "000"));
    expect(wh.status).toBe(200);
    expect(wh.body.data.paymentStatus).toBe("paid");

    const row = await pool.query(
      "SELECT payment_status FROM storefront_orders WHERE id = $1",
      [orderId]
    );
    expect(row.rows[0].payment_status).toBe("paid");

    const okConfirm = await authA(
      request(app).patch(`/api/storefront/orders/${orderId}`).send({ status: "confirmed" })
    );
    expect(okConfirm.status).toBe(200);
  });

  it("lets an unpaid online order be cancelled", async () => {
    const placed = await placeOnline(1);
    const cancel = await authA(
      request(app)
        .patch(`/api/storefront/orders/${placed.body.data.orderId}`)
        .send({ status: "cancelled" })
    );
    expect(cancel.status).toBe(200);
  });

  it("does not gate a COD order (unpaid is normal for COD)", async () => {
    const placed = await request(app)
      .post(`/api/public/storefront/${slug}/order`)
      .send({
        customer: { name: "C", phone: "03009998888", address: "x" },
        paymentMethod: "cod",
        items: [{ productId: otc.id, quantity: 1 }],
      });
    const confirm = await authA(
      request(app)
        .patch(`/api/storefront/orders/${placed.body.data.orderId}`)
        .send({ status: "confirmed" })
    );
    expect(confirm.status).toBe(200);
  });
});

describe("POST /api/public/storefront/payment/webhook/:provider", () => {
  it("is idempotent on a repeat 'paid'", async () => {
    const placed = await placeOnline();
    const ref = placed.body.data.payment.ref;
    const first = await request(app)
      .post("/api/public/storefront/payment/webhook/jazzcash")
      .send(signedWebhook(ref, "000"));
    expect(first.status).toBe(200);
    const again = await request(app)
      .post("/api/public/storefront/payment/webhook/jazzcash")
      .send(signedWebhook(ref, "000"));
    expect(again.status).toBe(200);
    expect(again.body.data.paymentStatus).toBe("paid");
  });

  it("rejects a bad signature (400)", async () => {
    const placed = await placeOnline();
    const bad = signedWebhook(placed.body.data.payment.ref, "000");
    bad.pp_SecureHash = "DEADBEEF";
    const r = await request(app)
      .post("/api/public/storefront/payment/webhook/jazzcash")
      .send(bad);
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("BAD_SIGNATURE");
  });

  it("404s an unknown provider, the manual provider, and an unknown ref", async () => {
    const unknown = await request(app)
      .post("/api/public/storefront/payment/webhook/paypal")
      .send({});
    expect(unknown.status).toBe(404);

    const manual = await request(app)
      .post("/api/public/storefront/payment/webhook/manual")
      .send({});
    expect(manual.status).toBe(404);

    const noRef = await request(app)
      .post("/api/public/storefront/payment/webhook/jazzcash")
      .send(signedWebhook("NOPE-REF", "000"));
    expect(noRef.status).toBe(404);
  });

  it("302s a browser (form-encoded) return to the consumer order page", async () => {
    const placed = await placeOnline();
    const r = await request(app)
      .post("/api/public/storefront/payment/webhook/jazzcash")
      .type("form")
      .send(signedWebhook(placed.body.data.payment.ref, "000"));
    expect(r.status).toBe(302);
    expect(r.headers.location).toContain(`/store/${slug}/order/${placed.body.data.orderNumber}`);
    expect(r.headers.location).toContain("phone=");

    // the payment still landed
    const row = await pool.query(
      "SELECT payment_status FROM storefront_orders WHERE id = $1",
      [placed.body.data.orderId]
    );
    expect(row.rows[0].payment_status).toBe("paid");
  });

  it("302s a browser return with a bad signature is still rejected (no redirect)", async () => {
    const placed = await placeOnline();
    const bad = signedWebhook(placed.body.data.payment.ref, "000");
    bad.pp_SecureHash = "DEADBEEF";
    const r = await request(app)
      .post("/api/public/storefront/payment/webhook/jazzcash")
      .type("form")
      .send(bad);
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("BAD_SIGNATURE");
  });

  it("writes a payment event row on the order", async () => {
    const placed = await placeOnline();
    await request(app)
      .post("/api/public/storefront/payment/webhook/jazzcash")
      .send(signedWebhook(placed.body.data.payment.ref, "000"));
    const ev = await pool.query(
      `SELECT actor, note FROM storefront_order_events
       WHERE storefront_order_id = $1 AND actor = 'payment'`,
      [placed.body.data.orderId]
    );
    expect(ev.rows).toHaveLength(1);
    expect(ev.rows[0].note).toBe("jazzcash:paid");
  });
});
