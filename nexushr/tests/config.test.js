const request = require("supertest");
const { app, db } = require("../server");

async function login(email, password) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return res.body.token;
}

describe("GET /api/config — authentication & authorisation", () => {
  test("unauthenticated request returns 401", async () => {
    const res = await request(app).get("/api/config");
    expect(res.status).toBe(401);
  });

  test("employee (non-admin) returns 403", async () => {
    const token = await login("maria@nexushr.com", "maria2024");
    expect(token).toBeTruthy();

    const res = await request(app)
      .get("/api/config")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("admin returns 200", async () => {
    const token = await login("ana@nexushr.com", "admin123");
    expect(token).toBeTruthy();

    const res = await request(app)
      .get("/api/config")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test("admin response does NOT contain sensitive fields", async () => {
    const token = await login("ana@nexushr.com", "admin123");
    const res = await request(app)
      .get("/api/config")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.database).toBeUndefined();
    expect(res.body.integrations).toBeUndefined();
    expect(res.body.jwt).toBeUndefined();
    // extra safety: no nested password / keys leaked anywhere
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("password");
    expect(body).not.toContain("sk_live");
    expect(body).not.toContain("SG.");
    expect(body).not.toContain("sk-proj");
    expect(body).not.toContain("secret");
  });

  test("admin response contains version and features", async () => {
    const token = await login("ana@nexushr.com", "admin123");
    const res = await request(app)
      .get("/api/config")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.version).toBe("2.4.1");
    expect(res.body.features).toBeDefined();
    expect(typeof res.body.features.aiAssistant).toBe("boolean");
    expect(typeof res.body.features.advancedReports).toBe("boolean");
    expect(typeof res.body.features.biometricLogin).toBe("boolean");
  });
});

afterAll(() => db.close());
