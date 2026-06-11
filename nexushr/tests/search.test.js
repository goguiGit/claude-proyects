const request = require("supertest");
const { app, db } = require("../server");

afterAll(() => db.close());

async function getToken() {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "ana@nexushr.com", password: "admin123" });
  return res.body.token;
}

describe("Employee search endpoint", () => {
  test("1. Normal search returns matching employees (q=Ana)", async () => {
    const token = await getToken();
    const res = await request(app)
      .get("/api/employees/search")
      .query({ q: "Ana" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const found = res.body.find((e) =>
      e.name.toLowerCase().includes("ana"),
    );
    expect(found).toBeDefined();
    // Must not expose sensitive fields
    expect(found.password).toBeUndefined();
    expect(found.ssn).toBeUndefined();
  });

  test("2. Empty search returns all employees", async () => {
    const token = await getToken();
    const res = await request(app)
      .get("/api/employees/search")
      .query({ q: "" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(1);
  });

  test("3. SQL injection attempt returns safe results (no password/ssn)", async () => {
    const token = await getToken();
    const payload =
      "%' UNION SELECT id,password,ssn,bank_account,email FROM users--";
    const res = await request(app)
      .get("/api/employees/search")
      .query({ q: payload })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Parameterized query means the UNION injection is treated as a literal
    // string to match, so no rows should be returned (no employee has that
    // literal text in name/department/email).
    expect(res.body.length).toBe(0);
    // Even if somehow rows came back, no sensitive columns should be present
    res.body.forEach((row) => {
      expect(row.password).toBeUndefined();
      expect(row.ssn).toBeUndefined();
      expect(row.bank_account).toBeUndefined();
    });
  });

  test("4. format=html returns HTML content", async () => {
    const token = await getToken();
    const res = await request(app)
      .get("/api/employees/search")
      .query({ q: "Ana", format: "html" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const contentType = res.headers["content-type"] || "";
    const body = res.text;
    // Either the content-type is text/html OR the body contains HTML structure
    const isHtml =
      contentType.includes("text/html") ||
      body.includes("<div") ||
      body.includes("<p");
    expect(isHtml).toBe(true);
  });

  test("5. XSS payload in html format is escaped in response", async () => {
    const token = await getToken();
    const xss = "<script>alert(1)</script>";
    const res = await request(app)
      .get("/api/employees/search")
      .query({ q: xss, format: "html" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // The raw script tag must NOT appear in the response body
    expect(res.text).not.toContain("<script>alert(1)</script>");
    // The escaped version should be present
    expect(res.text).toContain("&lt;script&gt;");
  });

  test("6. Unauthenticated request returns 401", async () => {
    const res = await request(app)
      .get("/api/employees/search")
      .query({ q: "Ana" });

    expect(res.status).toBe(401);
  });
});
