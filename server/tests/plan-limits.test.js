const {
  app,
  request,
  pool,
  uniq,
  closePool,
  makePlatformAdmin,
} = require('./helpers');
const { requireFeature } = require('../middleware/planLimits');

afterAll(closePool);

describe('enforceUserLimit (on POST /api/users)', () => {
  it('blocks the tenant once active users reach plan.max_users', async () => {
    const op = await makePlatformAdmin();
    const auth = (r) => r.set('Authorization', `Bearer ${op.token}`);

    // a tiny plan: 2 seats
    const planCode = uniq('tiny');
    await auth(
      request(app)
        .post('/api/platform/plans')
        .send({ code: planCode, name: 'Tiny', max_users: 2, price_monthly: 1 })
    );

    // provision a tenant on it (creates 1 admin => 1 seat used)
    const adminEmail = `${uniq('a')}@tiny.test`;
    await auth(
      request(app).post('/api/platform/organizations').send({
        name: 'Tiny Shop',
        code: uniq('org'),
        planCode,
        admin: { username: uniq('u'), email: adminEmail, password: 'admin-pw-123' },
      })
    );
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'admin-pw-123' });
    const tToken = login.body.data.token;

    const addUser = (n) =>
      request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tToken}`)
        .send({
          username: uniq(`m${n}`),
          email: `${uniq(`m${n}`)}@tiny.test`,
          password: 'member-pw-123',
          fullName: `Member ${n}`,
        });

    const first = await addUser(1); // 2nd seat -> ok
    expect(first.status).toBe(201);

    const second = await addUser(2); // 3rd seat -> blocked
    expect(second.status).toBe(403);
    expect(second.body.code).toBe('PLAN_LIMIT_USERS');
  });

  it('fails open when the org has no plan', async () => {
    // org with plan_id NULL
    const org = await pool.query(
      `INSERT INTO organizations (code, name, is_active) VALUES ($1, 'No Plan', true) RETURNING id`,
      [uniq('np')]
    );
    const req = { user: { organization_id: org.rows[0].id } };
    const res = {};
    const next = jest.fn();
    const { enforceUserLimit } = require('../middleware/planLimits');
    await enforceUserLimit(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireFeature', () => {
  const runMw = async (organizationId, key) => {
    const req = { user: { organization_id: organizationId } };
    const calls = { next: 0, status: null, body: null };
    const res = {
      status(c) {
        calls.status = c;
        return this;
      },
      json(b) {
        calls.body = b;
        return this;
      },
    };
    await requireFeature(key)(req, res, () => {
      calls.next += 1;
    });
    return calls;
  };

  it('passes when the plan enables the flag, blocks when it does not', async () => {
    // pro has ai_analytics: true, free has ai_analytics: false
    const pro = await pool.query(
      `INSERT INTO organizations (code, name, is_active, plan_id)
       VALUES ($1, 'Pro Org', true, (SELECT id FROM plans WHERE code='pro')) RETURNING id`,
      [uniq('pro')]
    );
    const free = await pool.query(
      `INSERT INTO organizations (code, name, is_active, plan_id)
       VALUES ($1, 'Free Org', true, (SELECT id FROM plans WHERE code='free')) RETURNING id`,
      [uniq('free')]
    );

    const allowed = await runMw(pro.rows[0].id, 'ai_analytics');
    expect(allowed.next).toBe(1);

    const denied = await runMw(free.rows[0].id, 'ai_analytics');
    expect(denied.next).toBe(0);
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('PLAN_FEATURE_LOCKED');
  });
});
