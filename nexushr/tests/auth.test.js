const request = require("supertest");
const { app } = require("../server");

// Helper: log in and return a token
async function login(email, password) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return res.body.token;
}

describe("Auth bypass removal", () => {
  test("?debug=true no longer bypasses auth — returns 401", async () => {
    const res = await request(app)
      .get("/api/employees")
      .query({ debug: "true" });
    expect(res.status).toBe(401);
  });

  test("x-internal-service header no longer bypasses auth — returns 401", async () => {
    const res = await request(app)
      .get("/api/employees")
      .set("x-internal-service", "nexushr-internal");
    expect(res.status).toBe(401);
  });
});

describe("requireAuth middleware", () => {
  test("valid token grants access", async () => {
    const token = await login("ana@nexushr.com", "admin123");
    expect(token).toBeTruthy();

    const res = await request(app)
      .get("/api/employees")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test("missing token returns 401", async () => {
    const res = await request(app).get("/api/employees");
    expect(res.status).toBe(401);
  });

  test("invalid token returns 401", async () => {
    const res = await request(app)
      .get("/api/employees")
      .set("Authorization", "Bearer totallyinvalidtoken");
    expect(res.status).toBe(401);
  });
});

describe("requireAdmin middleware", () => {
  test("non-admin with valid token gets 403 on admin endpoint", async () => {
    const token = await login("maria@nexushr.com", "maria2024");
    expect(token).toBeTruthy();

    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("admin with valid token can access admin endpoint", async () => {
    const token = await login("ana@nexushr.com", "admin123");

    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
