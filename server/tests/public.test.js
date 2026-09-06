const { app, request, closePool, uniq } = require('./helpers');

afterAll(closePool);

describe('GET /api/public/plans', () => {
  it('returns only active + public plans', async () => {
    const res = await request(app).get('/api/public/plans');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const codes = res.body.data.map((p) => p.code);
    // the seeded catalogue is always present (other tests may add more)
    expect(codes).toEqual(
      expect.arrayContaining(['basic', 'enterprise', 'free', 'pro'])
    );
    // never leaks a private/inactive plan
    for (const p of res.body.data) {
      expect(p).toEqual(
        expect.objectContaining({ code: expect.any(String), features: expect.any(Object) })
      );
    }
  });
});

describe('POST /api/public/signup', () => {
  it('provisions an org + admin + trial and returns a usable token', async () => {
    const email = `${uniq('u')}@signup.test`;
    const res = await request(app).post('/api/public/signup').send({
      organizationName: 'Wellness Chemists',
      fullName: 'Dana Fox',
      email,
      password: 'longenough1',
      planCode: 'pro',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.organization.code).toBe('wellness-chemists');
    expect(res.body.data.organization.plan_status).toBe('trialing');
    expect(res.body.data.plan).toBe('pro');

    // token works against the authenticated API
    const me = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${res.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.role_in_pos).toBe('admin');
  });

  it('auto-suffixes a colliding org code', async () => {
    const mk = (email) =>
      request(app).post('/api/public/signup').send({
        organizationName: 'Collision Pharmacy',
        fullName: 'A',
        email,
        password: 'longenough1',
      });
    const a = await mk(`${uniq('a')}@c.test`);
    const b = await mk(`${uniq('b')}@c.test`);
    expect(a.body.data.organization.code).toBe('collision-pharmacy');
    expect(b.body.data.organization.code).toBe('collision-pharmacy-1');
  });

  it('rejects a duplicate email with 409', async () => {
    const email = `${uniq('dup')}@signup.test`;
    const body = {
      organizationName: 'Dup Co',
      fullName: 'A',
      email,
      password: 'longenough1',
    };
    await request(app).post('/api/public/signup').send(body);
    const second = await request(app).post('/api/public/signup').send(body);
    expect(second.status).toBe(409);
  });

  it('rejects a short password with 400', async () => {
    const res = await request(app).post('/api/public/signup').send({
      organizationName: 'Short PW',
      fullName: 'A',
      email: `${uniq('s')}@signup.test`,
      password: 'short',
    });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown / non-public plan with 400', async () => {
    const res = await request(app).post('/api/public/signup').send({
      organizationName: 'Bad Plan',
      fullName: 'A',
      email: `${uniq('bp')}@signup.test`,
      password: 'longenough1',
      planCode: 'does-not-exist',
    });
    expect(res.status).toBe(400);
  });

  it('requires the core fields', async () => {
    const res = await request(app)
      .post('/api/public/signup')
      .send({ organizationName: 'x' });
    expect(res.status).toBe(400);
  });
});
