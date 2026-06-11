const request = require("supertest");
const { app, db } = require("../server");

describe("POST /api/auth/login", () => {
  test("1. valid credentials return token and user object", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@nexushr.com", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      role: expect.any(String),
    });
  });

  test("2. wrong password returns 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@nexushr.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test("3. missing email returns 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "admin123" });

    expect(res.status).toBe(400);
  });

  test("3b. missing password returns 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@nexushr.com" });

    expect(res.status).toBe(400);
  });

  test("4. SQL injection as email returns 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "' OR '1'='1' --", password: "anything" });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test("5. SQL injection as password returns 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@nexushr.com", password: "' OR '1'='1' --" });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });
});

afterAll(() => db.close());
