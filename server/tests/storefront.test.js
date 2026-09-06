const { app, request, pool, uniq, closePool, makeTenant } = require('./helpers');

let A; // pharmacy on pro (storefront enabled)
let slug;

const authA = (r) => r.set('Authorization', `Bearer ${A.token}`);

async function addProduct(token, over) {
  const body = {
    name: `P ${uniq('m')}`,
    manufacturer: 'Acme',
    selling_price: 30,
    cost_price: 15,
    quantity: 20,
    expiry_date: '2029-01-01',
    prescription_required: false,
    ...over,
  };
  const r = await request(app)
    .post('/api/medicines')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
  return { id: r.body.data.productId, name: body.name };
}

let otc, rx, oos;

beforeAll(async () => {
  A = await makeTenant('pro');
  otc = await addProduct(A.token, { name: `OTC ${uniq('m')}`, quantity: 20 });
  rx = await addProduct(A.token, {
    name: `RX ${uniq('m')}`,
    quantity: 20,
    prescription_required: true,
  });
  oos = await addProduct(A.token, { name: `OOS ${uniq('m')}`, quantity: 0 });

  const s = await authA(
    request(app).put('/api/storefront/settings').send({
      display_name: 'Wellness Store',
      delivery_fee: 50,
      min_order: 0,
      is_live: true,
    })
  );
  slug = s.body.data.slug;
});
afterAll(closePool);

describe('public GET /api/public/storefront/:slug', () => {
  it('returns the store with only in-stock OTC items', async () => {
    const res = await request(app).get(`/api/public/storefront/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.store.displayName).toBe('Wellness Store');
    const names = res.body.data.products.map((p) => p.name);
    expect(names).toContain(otc.name);
    expect(names).not.toContain(rx.name); // prescription hidden
    expect(names).not.toContain(oos.name); // out of stock hidden
    expect(res.body.data.products.find((p) => p.name === otc.name).price).toBe(30);
  });

  it('404s when the store is not live', async () => {
    await authA(request(app).put('/api/storefront/settings').send({ is_live: false }));
    const res = await request(app).get(`/api/public/storefront/${slug}`);
    expect(res.status).toBe(404);
    await authA(request(app).put('/api/storefront/settings').send({ is_live: true }));
  });
});

describe('public POST /api/public/storefront/:slug/order', () => {
  const customer = { name: 'Buyer', phone: '03001234567', address: '1 St', city: 'Karachi' };

  it('places an order, ignores client price, decrements stock', async () => {
    const before = await pool.query(
      `SELECT COALESCE(SUM(quantity),0)::int q FROM inventory_batches
       WHERE product_id=$1 AND is_active=true`,
      [otc.id]
    );

    const res = await request(app)
      .post(`/api/public/storefront/${slug}/order`)
      .send({
        customer,
        paymentMethod: 'cod',
        items: [{ productId: otc.id, quantity: 2, price: 1 }], // price 1 must be ignored
      });

    expect(res.status).toBe(201);
    expect(res.body.data.subtotal).toBe(60); // 2 * server price 30
    expect(res.body.data.total).toBe(110); // + delivery 50
    expect(res.body.data.orderNumber).toMatch(/^SF-/);

    const after = await pool.query(
      `SELECT COALESCE(SUM(quantity),0)::int q FROM inventory_batches
       WHERE product_id=$1 AND is_active=true`,
      [otc.id]
    );
    expect(before.rows[0].q - after.rows[0].q).toBe(2);
  });

  it('rejects a quantity above available stock (400)', async () => {
    const res = await request(app)
      .post(`/api/public/storefront/${slug}/order`)
      .send({ customer, items: [{ productId: otc.id, quantity: 9999 }] });
    expect(res.status).toBe(400);
  });

  it('rejects a subtotal below the store minimum (400)', async () => {
    const cheap = await addProduct(A.token, { selling_price: 10, quantity: 50 });
    await authA(request(app).put('/api/storefront/settings').send({ min_order: 100 }));
    const res = await request(app)
      .post(`/api/public/storefront/${slug}/order`)
      .send({ customer, items: [{ productId: cheap.id, quantity: 1 }] }); // 10 < 100
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/minimum/i);
    await authA(request(app).put('/api/storefront/settings').send({ min_order: 0 }));
  });

  it('rejects a prescription item in the cart (400)', async () => {
    const res = await request(app)
      .post(`/api/public/storefront/${slug}/order`)
      .send({ customer, items: [{ productId: rx.id, quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not available for online/i);
  });

  it('status lookup works with the right phone and 404s otherwise', async () => {
    const placed = await request(app)
      .post(`/api/public/storefront/${slug}/order`)
      .send({ customer, items: [{ productId: otc.id, quantity: 3 }] });
    const num = placed.body.data.orderNumber;

    const good = await request(app).get(
      `/api/public/storefront/${slug}/order/${num}?phone=${customer.phone}`
    );
    expect(good.status).toBe(200);
    expect(good.body.data.status).toBe('placed');

    const bad = await request(app).get(
      `/api/public/storefront/${slug}/order/${num}?phone=00000`
    );
    expect(bad.status).toBe(404);
  });
});

describe('authed pharmacy side', () => {
  it('feature-gates a plan without storefront (403)', async () => {
    const basic = await makeTenant('basic');
    const res = await request(app)
      .get('/api/storefront/settings')
      .set('Authorization', `Bearer ${basic.token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PLAN_FEATURE_LOCKED');
  });

  it('scopes orders to the caller org (cross-tenant)', async () => {
    const B = await makeTenant('pro');
    const bList = await request(app)
      .get('/api/storefront/orders')
      .set('Authorization', `Bearer ${B.token}`);
    expect(bList.status).toBe(200);
    expect(bList.body.data.length).toBe(0); // B has no storefront orders

    const aList = await authA(request(app).get('/api/storefront/orders'));
    expect(aList.body.data.length).toBeGreaterThan(0);
  });

  it('guards status transitions and restocks on cancel', async () => {
    const placed = await request(app)
      .post(`/api/public/storefront/${slug}/order`)
      .send({
        customer: { name: 'C', phone: '03007654321', address: 'x' },
        items: [{ productId: otc.id, quantity: 2 }],
      });
    const orderId = placed.body.data.orderId;

    const skip = await authA(
      request(app).patch(`/api/storefront/orders/${orderId}`).send({ status: 'delivered' })
    );
    expect(skip.status).toBe(400);
    expect(skip.body.code).toBe('BAD_TRANSITION');

    const ok1 = await authA(
      request(app).patch(`/api/storefront/orders/${orderId}`).send({ status: 'confirmed' })
    );
    expect(ok1.status).toBe(200);

    const before = await pool.query(
      `SELECT COALESCE(SUM(quantity),0)::int q FROM inventory_batches WHERE product_id=$1 AND is_active=true`,
      [otc.id]
    );
    const cancel = await authA(
      request(app).patch(`/api/storefront/orders/${orderId}`).send({ status: 'cancelled' })
    );
    expect(cancel.status).toBe(200);
    const after = await pool.query(
      `SELECT COALESCE(SUM(quantity),0)::int q FROM inventory_batches WHERE product_id=$1 AND is_active=true`,
      [otc.id]
    );
    expect(after.rows[0].q - before.rows[0].q).toBe(2); // restocked
  });

  it('will not let another org edit this org’s settings (cross-tenant)', async () => {
    const B = await makeTenant('pro');
    // B upserts its own store — must not collide with or touch A's row
    const bSet = await request(app)
      .put('/api/storefront/settings')
      .set('Authorization', `Bearer ${B.token}`)
      .send({ display_name: 'B Store', is_live: true });
    expect([200, 201]).toContain(bSet.status);
    expect(bSet.body.data.slug).not.toBe(slug);

    const aStill = await authA(request(app).get('/api/storefront/settings'));
    expect(aStill.body.data.slug).toBe(slug);
    expect(aStill.body.data.display_name).toBe('Wellness Store');
  });
});
