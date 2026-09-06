const {
  app,
  request,
  uniq,
  closePool,
  makeTenant,
  makeSupplier,
} = require("./helpers");

const P = (t) => (r) => r.set("Authorization", `Bearer ${t}`);

let A, S, Sunconnected, lowName;

async function addMedicine(token, over) {
  const body = {
    name: `M ${uniq("m")}`,
    manufacturer: "Acme",
    selling_price: 30,
    cost_price: 15,
    quantity: 3, // < 10 -> low stock
    expiry_date: "2029-01-01",
    ...over,
  };
  const r = await P(token)(request(app).post("/api/medicines").send(body));
  return { id: r.body.data.productId, name: body.name };
}

async function addCatalogue(token, over) {
  const r = await P(token)(
    request(app).post("/api/supplier/catalogue").send({
      manufacturer: "Acme",
      unit_price: 10,
      moq: 5,
      ...over,
    })
  );
  return r.body.data.id;
}

async function connect(pharmacy, supplier) {
  const req = await P(pharmacy.token)(
    request(app).post("/api/connections/request").send({ supplierCode: supplier.organizationCode })
  );
  await P(supplier.token)(
    request(app).patch(`/api/connections/${req.body.data.id}`).send({ action: "approve", creditLimit: 5000 })
  );
}

beforeAll(async () => {
  A = await makeTenant("pro");
  S = await makeSupplier();
  Sunconnected = await makeSupplier();

  const low = await addMedicine(A.token, { name: `Panadol ${uniq("p")}`, quantity: 3 });
  lowName = low.name;
  await addMedicine(A.token, { name: `Orphan ${uniq("o")}`, quantity: 2 }); // no supplier stocks it

  // connected supplier lists the SKU at 8; an *un*connected one lists it cheaper (5)
  await addCatalogue(S.token, { name: lowName, unit_price: 8 });
  await addCatalogue(Sunconnected.token, { name: lowName, unit_price: 5 });
  await connect(A, S);
});
afterAll(closePool);

describe("low-stock insight carries a reorder target (2b.7)", () => {
  it("attaches the cheapest *connected* supplier that stocks the SKU", async () => {
    const res = await P(A.token)(request(app).get("/api/ai-analytics/insights"));
    expect(res.status).toBe(200);

    const lowAlert = res.body.data.insights.find((i) => i.title === "Low Stock Alert");
    expect(lowAlert).toBeTruthy();

    const panadol = lowAlert.data.find((r) => r.name === lowName);
    expect(panadol.reorder).toBeTruthy();
    expect(panadol.reorder.supplierOrgId).toBe(S.organizationId);
    expect(panadol.reorder.supplierName).toBeTruthy();
    expect(panadol.reorder.supplierProductId).toBeTruthy();
    // 8 (connected S) — NOT 5 from the unconnected supplier
    expect(Number(panadol.reorder.unitPrice)).toBe(8);

    const orphan = lowAlert.data.find((r) => r.name.startsWith("Orphan"));
    expect(orphan.reorder).toBeNull();

    expect(lowAlert.reorderableCount).toBe(1);
  });

  it("drops the reorder target when the connection is paused", async () => {
    // pause the A<->S connection
    const conns = await P(S.token)(request(app).get("/api/connections"));
    const c = conns.body.data.find((x) => x.pharmacy_org_id === A.organizationId);
    await P(S.token)(
      request(app).patch(`/api/connections/${c.id}`).send({ action: "pause" })
    );

    const res = await P(A.token)(request(app).get("/api/ai-analytics/insights"));
    const lowAlert = res.body.data.insights.find((i) => i.title === "Low Stock Alert");
    const panadol = lowAlert.data.find((r) => r.name === lowName);
    expect(panadol.reorder).toBeNull();
    expect(lowAlert.reorderableCount).toBe(0);

    // restore for any later tests
    await P(S.token)(
      request(app).patch(`/api/connections/${c.id}`).send({ action: "approve" })
    );
  });
});
