const request = require("supertest");
const { app, db } = require("../server");

async function login(email, password) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return res.body.token;
}

describe("POST /api/payroll/calculate — safeEval", () => {
  let token;

  beforeAll(async () => {
    token = await login("maria@nexushr.com", "maria2024");
  });

  test("1. fórmula válida '2 + 2' → 4", async () => {
    const res = await request(app)
      .post("/api/payroll/calculate")
      .set("Authorization", `Bearer ${token}`)
      .send({ formula: "2 + 2" });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(4);
  });

  test("2. fórmula válida '(50000 * 1.07) / 12' → resultado correcto", async () => {
    const res = await request(app)
      .post("/api/payroll/calculate")
      .set("Authorization", `Bearer ${token}`)
      .send({ formula: "(50000 * 1.07) / 12" });
    expect(res.status).toBe(200);
    expect(res.body.result).toBeCloseTo((50000 * 1.07) / 12, 5);
  });

  test("3. fórmula con módulo '100 % 7' → 2", async () => {
    const res = await request(app)
      .post("/api/payroll/calculate")
      .set("Authorization", `Bearer ${token}`)
      .send({ formula: "100 % 7" });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(2);
  });

  test("4. intento RCE con require('child_process') → 400", async () => {
    const res = await request(app)
      .post("/api/payroll/calculate")
      .set("Authorization", `Bearer ${token}`)
      .send({ formula: "require('child_process').execSync('whoami')" });
    expect(res.status).toBe(400);
  });

  test("5. intento RCE con process.exit(1) → 400", async () => {
    const res = await request(app)
      .post("/api/payroll/calculate")
      .set("Authorization", `Bearer ${token}`)
      .send({ formula: "process.exit(1)" });
    expect(res.status).toBe(400);
  });

  test("6. identificador Math.pow(2,10) → 400", async () => {
    const res = await request(app)
      .post("/api/payroll/calculate")
      .set("Authorization", `Bearer ${token}`)
      .send({ formula: "Math.pow(2,10)" });
    expect(res.status).toBe(400);
  });

  test("7. fórmula vacía → 400", async () => {
    const res = await request(app)
      .post("/api/payroll/calculate")
      .set("Authorization", `Bearer ${token}`)
      .send({ formula: "" });
    expect(res.status).toBe(400);
  });

  test("8. petición sin autenticación → 401", async () => {
    const res = await request(app)
      .post("/api/payroll/calculate")
      .send({ formula: "2 + 2" });
    expect(res.status).toBe(401);
  });

  test("1/0 returns 400 (Infinity not allowed)", async () => {
    const { token: tok } = { token: await login("maria@nexushr.com", "maria2024") };
    const res = await request(app)
      .post("/api/payroll/calculate")
      .set("Authorization", `Bearer ${tok}`)
      .send({ formula: "1/0" });
    expect(res.status).toBe(400);
  });

  test("0/0 returns 400 (NaN not allowed)", async () => {
    const { token: tok } = { token: await login("maria@nexushr.com", "maria2024") };
    const res = await request(app)
      .post("/api/payroll/calculate")
      .set("Authorization", `Bearer ${tok}`)
      .send({ formula: "0/0" });
    expect(res.status).toBe(400);
  });

  test("formula longer than 200 chars returns 400", async () => {
    const { token: tok } = { token: await login("maria@nexushr.com", "maria2024") };
    const res = await request(app)
      .post("/api/payroll/calculate")
      .set("Authorization", `Bearer ${tok}`)
      .send({ formula: "1+" .repeat(101) + "1" });
    expect(res.status).toBe(400);
  });
});

afterAll(() => db.close());
