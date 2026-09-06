const {
  app,
  request,
  pool,
  uniq,
  closePool,
  makeTenant,
  makeSupplier,
} = require('./helpers');

let pharmacy, supplier, supplier2;
const P = (t) => (r) => r.set('Authorization', `Bearer ${t}`);

beforeAll(async () => {
  pharmacy = await makeTenant('pro');
  supplier = await makeSupplier();
  supplier2 = await makeSupplier();
});
afterAll(closePool);

// -------------------------------------------------------------------------
describe('org-type RBAC (2b.1)', () => {
  it('a supplier token cannot reach pharmacy POS routes', async () => {
    const r = await P(supplier.token)(request(app).get('/api/medicines'));
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('WRONG_ORG_TYPE');
  });
  it('a pharmacy token cannot reach the supplier portal', async () => {
    const r = await P(pharmacy.token)(request(app).get('/api/supplier/catalogue'));
    expect(r.status).toBe(403);
  });
});

// -------------------------------------------------------------------------
describe('supplier catalogue (2b.2)', () => {
  it('CRUD, validation, and org-scoping', async () => {
    const created = await P(supplier.token)(
      request(app).post('/api/supplier/catalogue').send({
        name: `Amox ${uniq('c')}`,
        manufacturer: 'Acme',
        unit_price: 12,
        moq: 10,
      })
    );
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const bad = await P(supplier.token)(
      request(app).post('/api/supplier/catalogue').send({ unit_price: 5 })
    );
    expect(bad.status).toBe(400);

    const upd = await P(supplier.token)(
      request(app).put(`/api/supplier/catalogue/${id}`).send({ unit_price: 15 })
    );
    expect(Number(upd.body.data.unit_price)).toBe(15);

    // supplier2 cannot see or touch supplier1's item
    const otherList = await P(supplier2.token)(request(app).get('/api/supplier/catalogue'));
    expect(otherList.body.data.some((x) => x.id === id)).toBe(false);
    const otherEdit = await P(supplier2.token)(
      request(app).put(`/api/supplier/catalogue/${id}`).send({ unit_price: 1 })
    );
    expect(otherEdit.status).toBe(404);
  });
});

// -------------------------------------------------------------------------
describe('connections lifecycle (2b.4)', () => {
  it('request → approve → order rights; only supplier approves; cross-org hidden', async () => {
    // unknown code
    const bad = await P(pharmacy.token)(
      request(app).post('/api/connections/request').send({ supplierCode: 'does-not-exist' })
    );
    expect(bad.status).toBe(404);

    const req1 = await P(pharmacy.token)(
      request(app)
        .post('/api/connections/request')
        .send({ supplierCode: supplier.organizationCode })
    );
    expect(req1.status).toBe(201);
    expect(req1.body.data.status).toBe('pending');
    const connId = req1.body.data.id;

    // duplicate request
    const dup = await P(pharmacy.token)(
      request(app)
        .post('/api/connections/request')
        .send({ supplierCode: supplier.organizationCode })
    );
    expect(dup.status).toBe(409);

    // pharmacy cannot approve its own request
    const pharmApprove = await P(pharmacy.token)(
      request(app).patch(`/api/connections/${connId}`).send({ action: 'approve' })
    );
    expect(pharmApprove.status).toBe(403);

    // supplier approves with a credit limit
    const approve = await P(supplier.token)(
      request(app)
        .patch(`/api/connections/${connId}`)
        .send({ action: 'approve', creditLimit: 5000, paymentTermsDays: 30 })
    );
    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe('active');
    expect(Number(approve.body.data.credit_limit)).toBe(5000);

    // a third supplier sees nothing of this connection
    const otherView = await P(supplier2.token)(request(app).get('/api/connections'));
    expect(otherView.body.data.some((c) => c.id === connId)).toBe(false);
  });
});

// -------------------------------------------------------------------------
describe('pharmacy reads catalogue + places a B2B order (2b.5, 2b.6)', () => {
  let catId;

  beforeAll(async () => {
    const created = await P(supplier.token)(
      request(app).post('/api/supplier/catalogue').send({
        name: `Widget ${uniq('w')}`,
        manufacturer: 'Acme',
        unit_price: 20,
        moq: 5,
      })
    );
    catId = created.body.data.id;
  });

  it('rejects catalogue read + order when not connected', async () => {
    const other = await makeTenant('pro');
    const cat = await P(other.token)(
      request(app).get(`/api/b2b/suppliers/${supplier.organizationId}/catalogue`)
    );
    expect(cat.status).toBe(403);
    expect(cat.body.code).toBe('NOT_CONNECTED');
  });

  it('connected pharmacy reads the catalogue', async () => {
    const cat = await P(pharmacy.token)(
      request(app).get(`/api/b2b/suppliers/${supplier.organizationId}/catalogue`)
    );
    expect(cat.status).toBe(200);
    expect(cat.body.data.products.length).toBeGreaterThan(0);
  });

  it('places an order → b2b PO + ledger debit + shows in supplier queue', async () => {
    const order = await P(pharmacy.token)(
      request(app)
        .post(`/api/b2b/suppliers/${supplier.organizationId}/order`)
        .send({ items: [{ supplierProductId: catId, quantity: 10 }] })
    );
    expect(order.status).toBe(201);
    expect(order.body.data.poNumber).toMatch(/^B2B-/);
    expect(order.body.data.total).toBe(200); // 10 * 20

    const poRow = await pool.query(
      `SELECT source, supplier_org_id, status FROM refactored_purchase_orders WHERE po_number = $1`,
      [order.body.data.poNumber]
    );
    expect(poRow.rows[0].source).toBe('b2b');
    expect(poRow.rows[0].supplier_org_id).toBe(supplier.organizationId);
    expect(poRow.rows[0].status).toBe('pending');

    const ledger = await pool.query(
      `SELECT debit_amount FROM organization_ledger
       WHERE organization_id = $1 AND reference_number = $2`,
      [pharmacy.organizationId, order.body.data.poNumber]
    );
    expect(Number(ledger.rows[0].debit_amount)).toBe(200);

    const queue = await P(supplier.token)(request(app).get('/api/supplier/orders'));
    expect(queue.body.data.some((o) => o.po_number === order.body.data.poNumber)).toBe(true);
  });

  it('enforces MOQ and the credit limit', async () => {
    const low = await P(pharmacy.token)(
      request(app)
        .post(`/api/b2b/suppliers/${supplier.organizationId}/order`)
        .send({ items: [{ supplierProductId: catId, quantity: 2 }] }) // < moq 5
    );
    expect(low.status).toBe(400);
    expect(low.body.message).toMatch(/minimum order/i);

    const over = await P(pharmacy.token)(
      request(app)
        .post(`/api/b2b/suppliers/${supplier.organizationId}/order`)
        .send({ items: [{ supplierProductId: catId, quantity: 1000 }] }) // 20000 > 5000
    );
    expect(over.status).toBe(400);
    expect(over.body.code).toBe('OVER_CREDIT_LIMIT');
  });

  it('supplier accepts then fulfils; a bad transition is rejected', async () => {
    const place = await P(pharmacy.token)(
      request(app)
        .post(`/api/b2b/suppliers/${supplier.organizationId}/order`)
        .send({ items: [{ supplierProductId: catId, quantity: 10 }] })
    );
    const poRow = await pool.query(
      `SELECT id FROM refactored_purchase_orders WHERE po_number = $1`,
      [place.body.data.poNumber]
    );
    const poId = poRow.rows[0].id;

    const skip = await P(supplier.token)(
      request(app).patch(`/api/supplier/orders/${poId}`).send({ status: 'received' })
    );
    expect(skip.status).toBe(400);
    expect(skip.body.code).toBe('BAD_TRANSITION');

    const accept = await P(supplier.token)(
      request(app).patch(`/api/supplier/orders/${poId}`).send({ status: 'ordered' })
    );
    expect(accept.status).toBe(200);

    const fulfil = await P(supplier.token)(
      request(app).patch(`/api/supplier/orders/${poId}`).send({ status: 'received' })
    );
    expect(fulfil.body.data.status).toBe('received');

    // pharmacy cannot touch the supplier's queue
    const pharmTouch = await P(pharmacy.token)(
      request(app).patch(`/api/supplier/orders/${poId}`).send({ status: 'cancelled' })
    );
    expect(pharmTouch.status).toBe(403);
  });
});
