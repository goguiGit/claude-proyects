const request = require("supertest");
const { app, db } = require("../server");

// Helper: log in and return a token
async function login(email, password) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return res.body.token;
}

describe("bcrypt password hashing", () => {
  test("1. login with correct plaintext password succeeds — returns token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@nexushr.com", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      role: "admin",
    });
  });

  test("2. login with wrong password returns 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@nexushr.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });
});

describe("GET /api/admin/users — PII exclusion", () => {
  let adminToken;

  beforeAll(async () => {
    adminToken = await login("ana@nexushr.com", "admin123");
  });

  test("3. response does NOT contain password, ssn, or bank_account on any user", async () => {
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    for (const user of res.body) {
      expect(user).not.toHaveProperty("password");
      expect(user).not.toHaveProperty("ssn");
      expect(user).not.toHaveProperty("bank_account");
    }
  });

  test("4. response DOES contain id, name, email, role, department on every user", async () => {
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    for (const user of res.body) {
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("department");
    }
  });

  test("5. unauthenticated GET /api/admin/users returns 401", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });
});

afterAll(() => db.close());
