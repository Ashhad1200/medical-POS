const { app, request, pool, uniq, closePool, makeTenant } = require('./helpers');
const { getCourier, registerCourier } = require('../services/courier');

// ---- a fake courier, registered for the webhook/assign path tests ----------
const fake = {
  name: 'fake',
  assignCourier: async (o) => ({ ref: `FAKE-${o.order_number}` }),
  getStatus: async (ref) => ({ externalStatus: 'PICKED', raw: { ref } }),
  mapStatus: (s) =>
    ({ PICKED: 'out_for_delivery', DONE: 'delivered', FAILED: 'cancelled' }[s] || null),
  parseWebhook: (b) => ({ ref: b.ref, externalStatus: b.status, raw: b }),
};

let A, slug, otc;
const authA = (r) => r.set('Authorization', `Bearer ${A.token}`);

async function addProduct(over) {
  const body = {
    name: `P ${uniq('m')}`,
    manufacturer: 'Acme',
    selling_price: 30,
    cost_price: 15,
    quantity: 100,
    expiry_date: '2029-01-01',
    prescription_required: false,
    ...over,
  };
  const r = await request(app)
    .post('/api/medicines')
    .set('Authorization', `Bearer ${A.token}`)
    .send(body);
  return { id: r.body.data.productId, name: body.name };
}

// place -> confirm -> assign the fake courier; returns { orderId, orderNumber, ref }
async function bookedOrder(qty = 2) {
  const placed = await request(app)
    .post(`/api/public/storefront/${slug}/order`)
    .send({
      customer: { name: 'C', phone: '03001112222', address: '1 St', city: 'Karachi' },
      items: [{ productId: otc.id, quantity: qty }],
    });
  const orderId = placed.body.data.orderId;
  await authA(request(app).patch(`/api/storefront/orders/${orderId}`).send({ status: 'confirmed' }));
  const asg = await authA(
    request(app).patch(`/api/storefront/orders/${orderId}`).send({ courier: 'fake' })
  );
  return { orderId, orderNumber: placed.body.data.orderNumber, ref: asg.body.data.courier_ref };
}

beforeAll(async () => {
  registerCourier('fake', fake);
  A = await makeTenant('pro');
  otc = await addProduct({ name: `OTC ${uniq('m')}` });
  const s = await authA(
    request(app).put('/api/storefront/settings').send({
      display_name: 'Courier Store',
      delivery_fee: 0,
      min_order: 0,
      is_live: true,
    })
  );
  slug = s.body.data.slug;
});
afterAll(closePool);

describe('courier adapter contract', () => {
  it('every registered adapter has the four methods', () => {
    for (const name of ['manual', 'postex', 'fake']) {
      const a = getCourier(name);
      expect(typeof a.assignCourier).toBe('function');
      expect(typeof a.getStatus).toBe('function');
      expect(typeof a.mapStatus).toBe('function');
      expect(typeof a.parseWebhook).toBe('function');
    }
  });

  it('assignCourier returns a ref, getStatus returns an externalStatus', async () => {
    const a = getCourier('fake');
    expect(await a.assignCourier({ order_number: 'SF-1' })).toEqual({ ref: 'FAKE-SF-1' });
    expect((await a.getStatus('FAKE-SF-1')).externalStatus).toBe('PICKED');
  });

  it('mapStatus maps known external statuses and returns null for unknown', () => {
    const a = getCourier('fake');
    expect(a.mapStatus('DONE')).toBe('delivered');
    expect(a.mapStatus('nonsense')).toBeNull();
  });

  it('the real postex map is pure and rejects unknowns', () => {
    const px = getCourier('postex');
    expect(px.mapStatus('Delivered')).toBe('delivered');
    expect(px.mapStatus('Returned')).toBe('cancelled');
    expect(px.mapStatus('Booked')).toBeNull();
    expect(px.parseWebhook({ trackingNumber: 'PX9', transactionStatusMessage: 'Delivered' }))
      .toEqual({ ref: 'PX9', externalStatus: 'Delivered', raw: expect.any(Object) });
  });

  it('getCourier throws on an unknown name', () => {
    expect(() => getCourier('dhl')).toThrow(/Unknown courier/);
  });
});

describe('PATCH assigns a courier', () => {
  it('books the shipment and stores courier + courier_ref', async () => {
    const { orderId } = await bookedOrder();
    const row = await pool.query(
      'SELECT courier, courier_ref FROM storefront_orders WHERE id = $1',
      [orderId]
    );
    expect(row.rows[0].courier).toBe('fake');
    expect(row.rows[0].courier_ref).toMatch(/^FAKE-SF-/);
  });
});

describe('POST /api/public/storefront/courier/webhook/:courier', () => {
  it('maps each known external status onto the order', async () => {
    const { orderId, ref } = await bookedOrder();

    const w1 = await request(app)
      .post('/api/public/storefront/courier/webhook/fake')
      .send({ ref, status: 'PICKED' });
    expect(w1.status).toBe(200);
    expect(w1.body.data.status).toBe('out_for_delivery');

    const w2 = await request(app)
      .post('/api/public/storefront/courier/webhook/fake')
      .send({ ref, status: 'DONE' });
    expect(w2.status).toBe(200);
    expect(w2.body.data.status).toBe('delivered');

    const row = await pool.query('SELECT status FROM storefront_orders WHERE id = $1', [orderId]);
    expect(row.rows[0].status).toBe('delivered');
  });

  it('a FAILED status cancels and restocks', async () => {
    const { orderId, ref } = await bookedOrder(2);
    const before = await pool.query(
      `SELECT COALESCE(SUM(quantity),0)::int q FROM inventory_batches WHERE product_id=$1 AND is_active=true`,
      [otc.id]
    );
    const w = await request(app)
      .post('/api/public/storefront/courier/webhook/fake')
      .send({ ref, status: 'FAILED' });
    expect(w.status).toBe(200);
    expect(w.body.data.status).toBe('cancelled');
    const after = await pool.query(
      `SELECT COALESCE(SUM(quantity),0)::int q FROM inventory_batches WHERE product_id=$1 AND is_active=true`,
      [otc.id]
    );
    expect(after.rows[0].q - before.rows[0].q).toBe(2);
  });

  it('quarantines an unrecognised status: 202, order untouched, raw stored', async () => {
    const { orderId, ref } = await bookedOrder();
    const w = await request(app)
      .post('/api/public/storefront/courier/webhook/fake')
      .send({ ref, status: 'ON_THE_MOON' });
    expect(w.status).toBe(202);
    const row = await pool.query(
      'SELECT status, courier_status_raw FROM storefront_orders WHERE id = $1',
      [orderId]
    );
    expect(row.rows[0].status).toBe('confirmed'); // unchanged
    expect(row.rows[0].courier_status_raw).toBe('ON_THE_MOON');
  });

  it('writes exactly one status event per applied transition', async () => {
    const { orderId, ref } = await bookedOrder();
    await request(app)
      .post('/api/public/storefront/courier/webhook/fake')
      .send({ ref, status: 'PICKED' });
    const ev = await pool.query(
      `SELECT actor, to_status FROM storefront_order_events
       WHERE storefront_order_id = $1 AND actor = 'courier'`,
      [orderId]
    );
    expect(ev.rows).toHaveLength(1);
    expect(ev.rows[0].to_status).toBe('out_for_delivery');
  });

  it('404s an unknown courier and an unknown reference', async () => {
    const bad1 = await request(app)
      .post('/api/public/storefront/courier/webhook/dhl')
      .send({ ref: 'x', status: 'PICKED' });
    expect(bad1.status).toBe(404);

    const bad2 = await request(app)
      .post('/api/public/storefront/courier/webhook/fake')
      .send({ ref: 'NOPE', status: 'PICKED' });
    expect(bad2.status).toBe(404);
  });
});
