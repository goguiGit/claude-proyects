/**
 * Announcements API tests
 *
 * XSS note: The stored XSS fix lives entirely in the frontend (public/app.js).
 * The `escapeHtml()` helper added there escapes announcement title, body, and
 * author_name before inserting them via innerHTML. The server-side API
 * intentionally stores and returns raw data — sanitization is the client's
 * responsibility so that API consumers can decide how to handle the content.
 */

const request = require("supertest");
const { app, db } = require("../server");

async function login(email, password) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return res.body.token;
}

describe("Announcements API", () => {
  test("unauthenticated GET /api/announcements returns 401", async () => {
    const res = await request(app).get("/api/announcements");
    expect(res.status).toBe(401);
  });

  test("non-admin cannot create announcement — returns 403", async () => {
    const token = await login("maria@nexushr.com", "maria2024");
    const res = await request(app)
      .post("/api/announcements")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Test", body: "Test body", pinned: false });
    expect(res.status).toBe(403);
  });

  test("admin can create announcement — returns 200 with id", async () => {
    const token = await login("ana@nexushr.com", "admin123");
    const res = await request(app)
      .post("/api/announcements")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Admin notice", body: "Important update.", pinned: false });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
  });

  test("GET /api/announcements returns array with expected fields", async () => {
    const token = await login("ana@nexushr.com", "admin123");
    const res = await request(app)
      .get("/api/announcements")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const first = res.body[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("body");
    expect(first).toHaveProperty("author_name");
    expect(first).toHaveProperty("pinned");
  });

  test("API stores and returns XSS payload as-is (escaping is frontend-only)", async () => {
    const adminToken = await login("ana@nexushr.com", "admin123");
    const xssTitle = '<script>alert("xss")</script>';
    const xssBody = '<img src=x onerror=alert(1)>';

    // Admin stores the XSS payload
    const createRes = await request(app)
      .post("/api/announcements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: xssTitle, body: xssBody, pinned: false });
    expect(createRes.status).toBe(200);
    const createdId = createRes.body.id;

    // API returns the raw payload — frontend escapeHtml() is what prevents execution
    const getRes = await request(app)
      .get("/api/announcements")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);

    const stored = getRes.body.find((a) => a.id === createdId);
    expect(stored).toBeDefined();
    expect(stored.title).toBe(xssTitle);
    expect(stored.body).toBe(xssBody);
    // The frontend escapeHtml() converts '<script>alert("xss")</script>'
    // to '&lt;script&gt;alert("xss")&lt;/script&gt;' before innerHTML insertion,
    // preventing script execution in the browser.
  });

  test("authenticated employee can read announcements", async () => {
    const token = await login("maria@nexushr.com", "maria2024");
    const res = await request(app)
      .get("/api/announcements")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

afterAll(() => db.close());
