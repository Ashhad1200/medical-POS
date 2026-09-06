const { app, request, closePool, makeTenant } = require('./helpers');

afterAll(closePool);

describe('GET /api/auth/profile', () => {
  it('includes the org plan code and feature map', async () => {
    const pro = await makeTenant('pro');
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${pro.token}`);
    expect(res.status).toBe(200);
    const u = res.body.data.user;
    expect(u.plan).toBe('pro');
    expect(u.planFeatures.storefront).toBe(true); // pro has it (migration 004)
  });

  it('a basic-plan tenant does not get the storefront feature', async () => {
    const basic = await makeTenant('basic');
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${basic.token}`);
    expect(res.body.data.user.plan).toBe('basic');
    expect(res.body.data.user.planFeatures.storefront).toBe(false);
  });
});
