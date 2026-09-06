const { app, request, closePool, uniq, makeTenant } = require('./helpers');

let a, b;
beforeAll(async () => {
  a = await makeTenant('pro');
  b = await makeTenant('pro');
});
afterAll(closePool);

const authed = (token) => (r) => r.set('Authorization', `Bearer ${token}`);

describe('POST /api/medicines', () => {
  it('creates a product + initial batch and lists it', async () => {
    const name = `Amoxicillin ${uniq('m')}`;
    const created = await authed(a.token)(
      request(app).post('/api/medicines').send({
        name,
        manufacturer: 'Acme',
        category: 'capsule',
        batch_number: 'B-1',
        selling_price: 25,
        cost_price: 15,
        quantity: 50,
        expiry_date: '2028-01-01',
        prescription_required: true,
      })
    );
    expect(created.status).toBe(201);
    expect(created.body.data.productId).toBeTruthy();

    const list = await authed(a.token)(request(app).get('/api/medicines'));
    const row = list.body.data.medicines.find((m) => m.name === name);
    expect(row).toBeTruthy();
    expect(row.prescription_required).toBe(true);
    expect(Number(row.total_quantity)).toBe(50);
  });

  it('rejects a product with no name/manufacturer (400)', async () => {
    const res = await authed(a.token)(
      request(app).post('/api/medicines').send({ category: 'tablet' })
    );
    expect(res.status).toBe(400);
  });

  it('does not let one org see another org’s products (cross-tenant)', async () => {
    const name = `Private ${uniq('m')}`;
    await authed(a.token)(
      request(app).post('/api/medicines').send({
        name,
        manufacturer: 'Acme',
        selling_price: 10,
        cost_price: 5,
        quantity: 5,
        expiry_date: '2028-01-01',
      })
    );

    const bList = await authed(b.token)(request(app).get('/api/medicines'));
    expect(bList.body.data.medicines.some((m) => m.name === name)).toBe(false);
  });
});

describe('PUT /api/medicines/:id', () => {
  it('updates product metadata incl. the prescription flag', async () => {
    const name = `Ibuprofen ${uniq('m')}`;
    const created = await authed(a.token)(
      request(app).post('/api/medicines').send({
        name,
        manufacturer: 'Acme',
        selling_price: 12,
        cost_price: 7,
        quantity: 20,
        expiry_date: '2028-01-01',
        prescription_required: false,
      })
    );
    const id = created.body.data.productId;

    const upd = await authed(a.token)(
      request(app)
        .put(`/api/medicines/${id}`)
        .send({ prescription_required: true, category: 'tablet' })
    );
    expect(upd.status).toBe(200);

    const one = await authed(a.token)(request(app).get(`/api/medicines/${id}`));
    expect(one.body.data.medicine.prescription_required).toBe(true);
  });
});
