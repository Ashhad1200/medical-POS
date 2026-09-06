const { app, request, pool, uniq, closePool, makeTenant } = require("./helpers");
const domainCtl = require("../controllers/storefrontDomainController");

let A, B, slug;
const authA = (r) => r.set("Authorization", `Bearer ${A.token}`);
const authB = (r) => r.set("Authorization", `Bearer ${B.token}`);

// deterministic DNS for the whole suite; individual tests override
const txt = { records: [] };
domainCtl._setTxtResolver(async () => txt.records);

beforeAll(async () => {
  A = await makeTenant("pro");
  B = await makeTenant("pro");
  const s = await authA(
    request(app).put("/api/storefront/settings").send({
      display_name: "Domain Store",
      is_live: true,
      min_order: 0,
    })
  );
  slug = s.body.data.slug;
});
beforeEach(() => {
  txt.records = [];
  domainCtl._setTxtResolver(async () => txt.records);
});
afterAll(closePool);

describe("plan gate (1f-a.2)", () => {
  it("a plan without custom_domain is 403", async () => {
    const basic = await makeTenant("basic");
    const r = await request(app)
      .post("/api/storefront/domain")
      .set("Authorization", `Bearer ${basic.token}`)
      .send({ domain: "example.pk" });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("PLAN_FEATURE_LOCKED");
  });
});

describe("POST /api/storefront/domain — validation (1f-b.1)", () => {
  it.each([
    ["localhost"],
    ["1.2.3.4"],
    ["not a domain"],
    ["nodots"],
    ["medpos.app"],
    ["shop.medpos.app"],
  ])("rejects %s", async (bad) => {
    const r = await authA(request(app).post("/api/storefront/domain").send({ domain: bad }));
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("VALIDATION_ERROR");
  });

  it("accepts an apex domain and returns TXT + A records, status pending", async () => {
    const r = await authA(
      request(app).post("/api/storefront/domain").send({ domain: "Noor-Pharmacy.pk" })
    );
    expect(r.status).toBe(201);
    expect(r.body.data.domain).toBe("noor-pharmacy.pk");
    expect(r.body.data.kind).toBe("apex");
    expect(r.body.data.status).toBe("pending");
    const types = r.body.data.records.map((x) => x.type).sort();
    expect(types).toEqual(["A", "TXT"]);
  });

  it("classifies a 3-label host as a subdomain (CNAME)", async () => {
    const r = await authA(
      request(app).post("/api/storefront/domain").send({ domain: "shop.noor-pharmacy.pk" })
    );
    expect(r.body.data.kind).toBe("subdomain");
    expect(r.body.data.records.map((x) => x.type)).toContain("CNAME");
  });
});

describe("uniqueness (1f-b.1c)", () => {
  it("a second org cannot claim a host another org already holds", async () => {
    await authA(request(app).post("/api/storefront/domain").send({ domain: "taken.pk" }));
    const r = await authB(request(app).post("/api/storefront/domain").send({ domain: "taken.pk" }));
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("DOMAIN_TAKEN");
  });
});

describe("POST /api/storefront/domain/verify (1f-b.2/3)", () => {
  async function claim(domain) {
    const r = await authA(request(app).post("/api/storefront/domain").send({ domain }));
    return r.body.data.records.find((x) => x.type === "TXT").value; // token
  }

  it("stays pending when the TXT record is absent", async () => {
    await claim("verify-a.pk");
    txt.records = [["something-else"]];
    const r = await authA(request(app).post("/api/storefront/domain/verify"));
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe("pending");
    expect(r.body.data.failureReason).toMatch(/TXT record not found/i);
  });

  it("goes active with an issued cert once the TXT token resolves", async () => {
    const token = await claim("verify-b.pk");
    txt.records = [["unrelated"], [token]];
    const r = await authA(request(app).post("/api/storefront/domain/verify"));
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe("active");
    expect(r.body.data.certStatus).toBe("issued");
    expect(r.body.data.certExpiresAt).toBeTruthy();
    expect(r.body.data.verifiedAt).toBeTruthy();
  });

  it("stays pending when the DNS lookup itself fails", async () => {
    await claim("verify-c.pk");
    domainCtl._setTxtResolver(async () => {
      const e = new Error("nope");
      e.code = "ENOTFOUND";
      throw e;
    });
    const r = await authA(request(app).post("/api/storefront/domain/verify"));
    expect(r.body.data.status).toBe("pending");
    expect(r.body.data.failureReason).toMatch(/DNS lookup failed/i);
    // beforeEach restores the resolver
  });
});

describe("GET /api/public/storefront/domain/:host (1f-c.1/2)", () => {
  async function activeDomain(domain) {
    const r = await authA(request(app).post("/api/storefront/domain").send({ domain }));
    const token = r.body.data.records.find((x) => x.type === "TXT").value;
    txt.records = [[token]];
    await authA(request(app).post("/api/storefront/domain/verify"));
  }

  it("resolves an active custom domain to its store slug", async () => {
    await activeDomain("live-one.pk");
    const r = await request(app).get("/api/public/storefront/domain/live-one.pk");
    expect(r.status).toBe(200);
    expect(r.body.data.slug).toBe(slug);
  });

  it("404s an unknown host and a still-pending host", async () => {
    await authA(request(app).post("/api/storefront/domain").send({ domain: "still-pending.pk" }));
    const unknown = await request(app).get("/api/public/storefront/domain/nope.pk");
    expect(unknown.status).toBe(404);
    const pending = await request(app).get("/api/public/storefront/domain/still-pending.pk");
    expect(pending.status).toBe(404);
  });

  it("stops resolving when the org is suspended (cascade)", async () => {
    await activeDomain("suspend-me.pk");
    await pool.query("UPDATE organizations SET is_active = false WHERE id = $1", [A.organizationId]);
    const r = await request(app).get("/api/public/storefront/domain/suspend-me.pk");
    expect(r.status).toBe(404);
    await pool.query("UPDATE organizations SET is_active = true WHERE id = $1", [A.organizationId]);
  });
});

describe("DELETE + recheck (1f-b.4 / 1f-c.3)", () => {
  it("removing a domain frees the host for another org", async () => {
    await authA(request(app).post("/api/storefront/domain").send({ domain: "recyclable.pk" }));
    const del = await authA(request(app).delete("/api/storefront/domain"));
    expect(del.body.data.removed).toBe(true);
    const bClaim = await authB(request(app).post("/api/storefront/domain").send({ domain: "recyclable.pk" }));
    expect(bClaim.status).toBe(201);
  });

  it("recheckDomains moves an active domain to failed when its TXT vanishes", async () => {
    const r = await authA(request(app).post("/api/storefront/domain").send({ domain: "drifty.pk" }));
    const token = r.body.data.records.find((x) => x.type === "TXT").value;
    txt.records = [[token]];
    await authA(request(app).post("/api/storefront/domain/verify"));

    txt.records = []; // registrar record removed
    const report = await domainCtl.recheckDomains();
    const mine = report.find((x) => x.domain === "drifty.pk");
    expect(mine.ok).toBe(false);

    const now = await authA(request(app).get("/api/storefront/domain"));
    expect(now.body.data.status).toBe("failed");
    expect(now.body.data.failureReason).toMatch(/no longer present/i);
  });
});
