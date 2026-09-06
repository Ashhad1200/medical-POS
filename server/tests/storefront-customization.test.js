const { app, request, pool, uniq, closePool, makeTenant } = require("./helpers");

let A, slug, prod, prod2;
const authA = (r) => r.set("Authorization", `Bearer ${A.token}`);

async function addProduct(over) {
  const body = {
    name: `P ${uniq("m")}`,
    manufacturer: "Acme",
    selling_price: 100,
    cost_price: 40,
    quantity: 20,
    expiry_date: "2029-01-01",
    prescription_required: false,
    ...over,
  };
  const r = await authA(request(app).post("/api/medicines").send(body));
  return { id: r.body.data.productId, name: body.name };
}

beforeAll(async () => {
  A = await makeTenant("pro");
  prod = await addProduct({ name: `Deal Item ${uniq("d")}`, selling_price: 100 });
  prod2 = await addProduct({ name: `Plain Item ${uniq("p")}`, selling_price: 50 });
  const s = await authA(
    request(app).put("/api/storefront/settings").send({
      display_name: "Custom Store",
      delivery_fee: 0,
      min_order: 0,
      is_live: true,
    })
  );
  slug = s.body.data.slug;
});
afterAll(closePool);

describe("accent colour (1e-a.1 / 1e-c.1)", () => {
  it("round-trips a valid hex and rejects a bad one", async () => {
    const okRes = await authA(
      request(app).put("/api/storefront/settings").send({ accent_color: "#0ea5e9" })
    );
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.accent_color).toBe("#0ea5e9");

    const bad = await authA(
      request(app).put("/api/storefront/settings").send({ accent_color: "teal" })
    );
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("customization CRUD (1e-b)", () => {
  it("replace-all upsert + read back", async () => {
    const put = await authA(
      request(app).put("/api/storefront/customization").send({
        banners: [
          { headline: "Wellness Week", bg_style: "gradient", bg_value: "#0ea5e9,#22d3ee" },
          { headline: "Free delivery", bg_style: "color", bg_value: "#111827" },
        ],
        deals: [{ product_id: prod.id, discount_pct: 20 }],
        featured: [prod2.id],
      })
    );
    expect(put.status).toBe(200);
    expect(put.body.data.banners).toHaveLength(2);
    expect(put.body.data.banners[0].sort_order).toBe(0);
    expect(put.body.data.deals).toHaveLength(1);
    expect(put.body.data.featured).toEqual([prod2.id]);

    const get = await authA(request(app).get("/api/storefront/customization"));
    expect(get.body.data.banners.map((b) => b.headline)).toEqual([
      "Wellness Week",
      "Free delivery",
    ]);
  });

  it("rejects a bad bg_style, out-of-range discount, dup product, foreign product", async () => {
    const badStyle = await authA(
      request(app).put("/api/storefront/customization").send({
        banners: [{ headline: "x", bg_style: "sparkles" }],
      })
    );
    expect(badStyle.status).toBe(400);

    for (const pct of [0, 100]) {
      const r = await authA(
        request(app)
          .put("/api/storefront/customization")
          .send({ deals: [{ product_id: prod.id, discount_pct: pct }] })
      );
      expect(r.status).toBe(400);
    }

    const dup = await authA(
      request(app).put("/api/storefront/customization").send({
        deals: [
          { product_id: prod.id, discount_pct: 10 },
          { product_id: prod.id, discount_pct: 20 },
        ],
      })
    );
    expect(dup.status).toBe(400);

    const B = await makeTenant("pro");
    const bRes = await request(app)
      .post("/api/medicines")
      .set("Authorization", `Bearer ${B.token}`)
      .send({ name: "B item", manufacturer: "x", selling_price: 10, cost_price: 5, quantity: 5, expiry_date: "2029-01-01" });
    const foreign = await authA(
      request(app)
        .put("/api/storefront/customization")
        .send({ featured: [bRes.body.data.productId] })
    );
    expect(foreign.status).toBe(400);
  });

  it("is org-scoped — B cannot see A's customization", async () => {
    const B = await makeTenant("pro");
    const bGet = await request(app)
      .get("/api/storefront/customization")
      .set("Authorization", `Bearer ${B.token}`);
    expect(bGet.status).toBe(200);
    expect(bGet.body.data.banners).toHaveLength(0);
    expect(bGet.body.data.deals).toHaveLength(0);
  });
});

describe("deals fold into the public catalogue price (1e-b.4/5)", () => {
  beforeAll(async () => {
    await authA(
      request(app).put("/api/storefront/customization").send({
        banners: [{ headline: "Live banner", bg_style: "color", bg_value: "#000" }],
        deals: [{ product_id: prod.id, discount_pct: 20 }],
        featured: [prod2.id],
      })
    );
  });

  it("public payload shows the discounted price + original + banners + featured", async () => {
    const res = await request(app).get(`/api/public/storefront/${slug}`);
    expect(res.status).toBe(200);

    const deal = res.body.data.products.find((p) => p.id === prod.id);
    expect(deal.price).toBe(80); // 100 - 20%
    expect(deal.originalPrice).toBe(100);
    expect(deal.discountPct).toBe(20);

    const plain = res.body.data.products.find((p) => p.id === prod2.id);
    expect(plain.price).toBe(50);
    expect(plain.discountPct).toBeUndefined();

    expect(res.body.data.banners.map((b) => b.headline)).toContain("Live banner");
    expect(res.body.data.featured).toEqual([prod2.id]);
  });

  it("placeOrder charges the deal price, not what the client sends", async () => {
    const res = await request(app)
      .post(`/api/public/storefront/${slug}/order`)
      .send({
        customer: { name: "C", phone: "03001112222", address: "1 St" },
        paymentMethod: "cod",
        items: [{ productId: prod.id, quantity: 2, price: 100 }], // client price ignored
      });
    expect(res.status).toBe(201);
    expect(res.body.data.subtotal).toBe(160); // 2 * 80
  });

  it("an out-of-window deal is ignored", async () => {
    await authA(
      request(app).put("/api/storefront/customization").send({
        deals: [
          {
            product_id: prod.id,
            discount_pct: 50,
            ends_at: "2000-01-01T00:00:00Z", // already ended
          },
        ],
      })
    );
    const res = await request(app).get(`/api/public/storefront/${slug}`);
    const p = res.body.data.products.find((x) => x.id === prod.id);
    expect(p.price).toBe(100);
    expect(p.discountPct).toBeUndefined();
  });
});
