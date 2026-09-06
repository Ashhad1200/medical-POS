const {
  app,
  request,
  pool,
  uniq,
  closePool,
  makeTenant,
  makeSupplier,
} = require('./helpers');

const P = (t) => (r) => r.set('Authorization', `Bearer ${t}`);

// pharmacy connects to a supplier and the supplier approves it
async function connect(pharmacy, supplier, creditLimit = 100000) {
  const req = await P(pharmacy.token)(
    request(app)
      .post('/api/connections/request')
      .send({ supplierCode: supplier.organizationCode })
  );
  await P(supplier.token)(
    request(app)
      .patch(`/api/connections/${req.body.data.id}`)
      .send({ action: 'approve', creditLimit })
  );
}

async function addItem(supplier, over = {}) {
  const r = await P(supplier.token)(
    request(app).post('/api/supplier/catalogue').send({
      name: over.name || `Item ${uniq('i')}`,
      manufacturer: 'Acme',
      unit_price: 10,
      moq: 1,
      ...over,
    })
  );
  return r.body.data;
}

// place + (optionally partially) fulfil a b2b order; returns { poId, poNumber }
async function orderAndFulfil(pharmacy, supplier, spId, qty, receivedQty) {
  const o = await P(pharmacy.token)(
    request(app)
      .post(`/api/b2b/suppliers/${supplier.organizationId}/order`)
      .send({ items: [{ supplierProductId: spId, quantity: qty }] })
  );
  const poId = o.body.data.poId;
  await P(supplier.token)(
    request(app).patch(`/api/supplier/orders/${poId}`).send({ status: 'ordered' })
  );
  const itemRow = await pool.query(
    'SELECT id FROM refactored_purchase_order_items WHERE purchase_order_id = $1',
    [poId]
  );
  await P(supplier.token)(
    request(app)
      .patch(`/api/supplier/orders/${poId}`)
      .send({
        status: 'received',
        lines:
          receivedQty === undefined
            ? undefined
            : [{ itemId: itemRow.rows[0].id, receivedQuantity: receivedQty }],
      })
  );
  return { poId, poNumber: o.body.data.poNumber };
}

let pharmacy, supA, supB;
beforeAll(async () => {
  pharmacy = await makeTenant('pro');
  supA = await makeSupplier();
  supB = await makeSupplier();
  await connect(pharmacy, supA);
  await connect(pharmacy, supB);
});
afterAll(closePool);

// -------------------------------------------------------------------------
describe('cross-supplier price compare (3.1)', () => {
  it('groups the same product across connected suppliers, cheapest first', async () => {
    const name = `Aspirin ${uniq('x')}`;
    await addItem(supA, { name, unit_price: 25 });
    await addItem(supB, { name, unit_price: 18 });

    const res = await P(pharmacy.token)(
      request(app).get('/api/b2b/search').query({ q: name })
    );
    expect(res.status).toBe(200);
    const group = res.body.data.find((g) => g.name === name);
    expect(group.offers).toHaveLength(2);
    expect(group.offers[0].unitPrice).toBe(18); // sorted ascending
    expect(group.offers.map((o) => o.supplierName).sort()).toEqual(
      [supA.organizationCode, supB.organizationCode].map((c) => `supplier ${c}`).sort()
    );
  });

  it('ignores a query shorter than 2 chars', async () => {
    const res = await P(pharmacy.token)(
      request(app).get('/api/b2b/search').query({ q: 'a' })
    );
    expect(res.body.data).toEqual([]);
  });
});

// -------------------------------------------------------------------------
describe('fill-rate / reliability (3.3)', () => {
  it('reflects partial fulfilment in the connected-supplier list', async () => {
    const item = await addItem(supA, { unit_price: 10, moq: 1 });
    await orderAndFulfil(pharmacy, supA, item.id, 10, 7); // 70% filled

    const res = await P(pharmacy.token)(request(app).get('/api/b2b/suppliers'));
    const rowA = res.body.data.find((s) => s.supplier_org_id === supA.organizationId);
    expect(Number(rowA.completed_orders)).toBeGreaterThanOrEqual(1);
    expect(Number(rowA.fill_rate)).toBeGreaterThan(0);
    expect(Number(rowA.fill_rate)).toBeLessThanOrEqual(100);
  });

  it('a supplier with no received history has a null fill rate', async () => {
    const fresh = await makeSupplier();
    await connect(pharmacy, fresh);
    const res = await P(pharmacy.token)(request(app).get('/api/b2b/suppliers'));
    const row = res.body.data.find((s) => s.supplier_org_id === fresh.organizationId);
    expect(row.fill_rate).toBeNull();
    expect(Number(row.completed_orders)).toBe(0);
  });
});

// -------------------------------------------------------------------------
describe('supplier returns (3.2)', () => {
  let poId, itemId;
  beforeAll(async () => {
    const item = await addItem(supA, { unit_price: 20, moq: 1 });
    ({ poId } = await orderAndFulfil(pharmacy, supA, item.id, 5)); // fully received
    const it = await pool.query(
      'SELECT id FROM refactored_purchase_order_items WHERE purchase_order_id = $1',
      [poId]
    );
    itemId = it.rows[0].id;
  });

  it('pharmacy raises a return on a received order; supplier accepts → ledger credit', async () => {
    const raise = await P(pharmacy.token)(
      request(app).post('/api/b2b/returns').send({
        purchaseOrderId: poId,
        purchaseOrderItemId: itemId,
        quantity: 2,
        reason: 'near_expiry',
      })
    );
    expect(raise.status).toBe(201);
    expect(raise.body.data.status).toBe('requested');
    expect(Number(raise.body.data.refund_amount)).toBe(40); // 2 * 20
    const retId = raise.body.data.id;

    // another supplier can't resolve it
    const wrong = await P(supB.token)(
      request(app).patch(`/api/supplier/returns/${retId}`).send({ action: 'accept' })
    );
    expect(wrong.status).toBe(404);

    const accept = await P(supA.token)(
      request(app).patch(`/api/supplier/returns/${retId}`).send({ action: 'accept' })
    );
    expect(accept.status).toBe(200);
    expect(accept.body.data.status).toBe('accepted');

    const credit = await pool.query(
      `SELECT credit_amount FROM organization_ledger
       WHERE organization_id = $1 AND reference_number = $2 AND category = 'b2b_return'`,
      [pharmacy.organizationId, retId]
    );
    expect(Number(credit.rows[0].credit_amount)).toBe(40);
  });

  it('rejects a return against a non-received order', async () => {
    const item = await addItem(supA);
    const o = await P(pharmacy.token)(
      request(app)
        .post(`/api/b2b/suppliers/${supA.organizationId}/order`)
        .send({ items: [{ supplierProductId: item.id, quantity: 1 }] })
    );
    const res = await P(pharmacy.token)(
      request(app).post('/api/b2b/returns').send({
        purchaseOrderId: o.body.data.poId,
        quantity: 1,
        reason: 'damaged',
      })
    );
    expect(res.status).toBe(400);
  });
});

// -------------------------------------------------------------------------
describe('supplier analytics (3.4)', () => {
  it('returns org-scoped totals, top pharmacies, fill rate and status split', async () => {
    const res = await P(supA.token)(request(app).get('/api/supplier/analytics'));
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totals.orders).toBeGreaterThan(0);
    expect(d.totals.pharmacies).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(d.topPharmacies)).toBe(true);
    expect(typeof d.statusBreakdown).toBe('object');
    expect(d.statusBreakdown.received).toBeGreaterThanOrEqual(1);
  });

  it('a pharmacy token cannot hit the supplier analytics route', async () => {
    const res = await P(pharmacy.token)(request(app).get('/api/supplier/analytics'));
    expect(res.status).toBe(403);
  });
});
