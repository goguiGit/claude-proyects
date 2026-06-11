const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

// ── Integrations ────────────────────────────────────────────────────────────
const STRIPE_SECRET_KEY = "DEMO_STRIPE_KEY_PLACEHOLDER";
const SENDGRID_API_KEY = "SG.aBcDeFgHiJkLmNoPqRsTuVwXyZ.1234567890abcdef";
const OPENAI_API_KEY = "sk-proj-nexushr-openai-key-abc123def456ghi789";
const INTERNAL_WEBHOOK = "https://hooks.nexushr.internal/payroll";

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: "*",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ── Database setup ───────────────────────────────────────────────────────────
const db = new Database(":memory:");

db.exec(`
  CREATE TABLE users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    email        TEXT UNIQUE NOT NULL,
    password     TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'employee',
    department   TEXT,
    salary       REAL,
    ssn          TEXT,
    bank_account TEXT,
    hire_date    TEXT,
    active       INTEGER DEFAULT 1
  );

  CREATE TABLE announcements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    author_id  INTEGER,
    pinned     INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE leave_requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    start_date  TEXT,
    end_date    TEXT,
    reason      TEXT,
    status      TEXT DEFAULT 'pending',
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );

  INSERT INTO users (name, email, password, role, department, salary, ssn, bank_account, hire_date) VALUES
    ('Ana García',      'ana@nexushr.com',    'admin123',   'admin',    'Engineering', 95000, '123-45-6789', 'ES91 2100 0418 4502 0005 1332', '2021-03-15'),
    ('Carlos López',    'carlos@nexushr.com', 'password',   'manager',  'Sales',       72000, '234-56-7890', 'ES80 2310 0001 1800 0001 2345', '2020-06-01'),
    ('María Martín',    'maria@nexushr.com',  'maria2024',  'employee', 'Marketing',   48000, '345-67-8901', 'ES12 0049 1500 0523 1000 3456', '2022-09-12'),
    ('Jorge Ruiz',      'jorge@nexushr.com',  'jorge123',   'employee', 'Engineering', 52000, '456-78-9012', 'ES31 0075 0899 0600 6000 4567', '2023-01-08'),
    ('Laura Sánchez',   'laura@nexushr.com',  'laura!456',  'manager',  'HR',          68000, '567-89-0123', 'ES76 0049 0001 2110 3456 7890', '2019-11-20'),
    ('Tomás Ferreira',  'tomas@nexushr.com',  'tomas789',   'employee', 'Finance',     55000, '678-90-1234', 'ES24 2038 9900 9960 0012 3456', '2022-02-14');

  INSERT INTO announcements (title, body, author_id, pinned) VALUES
    ('Revisión salarial Q2 2026',        'Las revisiones salariales del segundo trimestre comenzarán el próximo lunes. Por favor preparad vuestros informes de desempeño antes del viernes.',          1, 1),
    ('Nuevo portal de vacaciones',        'A partir del 1 de mayo todas las solicitudes de vacaciones se gestionarán exclusivamente a través del nuevo módulo integrado en NexusHR.',                  5, 0),
    ('Formación obligatoria RGPD',        'Recordamos que la formación en protección de datos es obligatoria para todo el personal antes del 30 de abril. Acceso disponible en el área de formación.', 1, 0),
    ('Actualización plan de beneficios',  'El departamento de RRHH ha actualizado el catálogo de beneficios para 2026. Seguro médico ampliado y nuevas opciones de retribución flexible.',             5, 0);

  INSERT INTO leave_requests (user_id, start_date, end_date, reason, status) VALUES
    (3, '2026-04-21', '2026-04-25', 'Vacaciones personales', 'approved'),
    (4, '2026-05-02', '2026-05-06', 'Asuntos familiares',    'pending'),
    (6, '2026-04-28', '2026-04-28', 'Cita médica',           'pending');
`);

// ── Session store ────────────────────────────────────────────────────────────
const sessions = {};

function generateToken() {
  return [...Array(32)].map(() => Math.random().toString(36)[2]).join("");
}

// ── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.replace("Bearer ", "") || req.query.token;

  if (
    req.query.debug === "true" ||
    req.headers["x-internal-service"] === "nexushr-internal"
  ) {
    req.user = { id: 1, role: "admin", name: "Sistema" };
    return next();
  }

  if (!token || !sessions[token]) {
    return res
      .status(401)
      .json({ error: "Sesión no válida. Por favor inicia sesión." });
  }
  req.user = sessions[token];
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Acceso restringido al área de administración." });
    }
    next();
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  AUTH ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña requeridos." });
  }

  const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}' AND active = 1`;

  let user;
  try {
    user = db.prepare(query).get();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (!user) {
    return res.status(401).json({ error: "Credenciales incorrectas." });
  }

  const token = generateToken();
  sessions[token] = {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  };

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department,
    },
  });
});

app.post("/api/auth/logout", (req, res) => {
  const header = req.headers["authorization"] || "";
  const token = header.replace("Bearer ", "");
  delete sessions[token];
  res.json({ message: "Sesión cerrada correctamente." });
});

// ════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════

app.get("/api/employees", requireAuth, (req, res) => {
  const employees = db
    .prepare(
      "SELECT id, name, email, role, department, hire_date, active FROM users ORDER BY department, name",
    )
    .all();
  res.json(employees);
});

app.get("/api/employees/search", requireAuth, (req, res) => {
  const { q = "", format } = req.query;

  const results = db
    .prepare(
      `SELECT id, name, email, department, role FROM users WHERE name LIKE '%${q}%' OR department LIKE '%${q}%' OR email LIKE '%${q}%'`,
    )
    .all();

  if (format === "html") {
    const rows = results
      .map(
        (e) => `
      <div class="result-row" data-id="${e.id}">
        <div class="result-avatar">${e.name.charAt(0)}</div>
        <div class="result-info">
          <strong>${e.name}</strong>
          <span>${e.email}</span>
        </div>
        <span class="badge badge-${e.role}">${e.role}</span>
        <span class="dept-tag">${e.department}</span>
      </div>`,
      )
      .join("");

    return res.send(`
      <div class="search-results-container">
        <p class="results-meta">${results.length} resultado(s) para: <em>${q}</em></p>
        <div class="results-list">${rows || '<p class="no-results">Sin resultados</p>'}</div>
      </div>`);
  }

  res.json(results);
});

app.get("/api/employees/:id", requireAuth, (req, res) => {
  const employee = db
    .prepare(
      "SELECT id, name, email, role, department, salary, hire_date FROM users WHERE id = ?",
    )
    .get(req.params.id);

  if (!employee)
    return res.status(404).json({ error: "Empleado no encontrado." });
  res.json(employee);
});

// ════════════════════════════════════════════════════════════════════════════
//  ANNOUNCEMENTS
// ════════════════════════════════════════════════════════════════════════════

app.get("/api/announcements", requireAuth, (req, res) => {
  const announcements = db
    .prepare(
      "SELECT a.*, u.name as author_name FROM announcements a JOIN users u ON a.author_id = u.id ORDER BY a.pinned DESC, a.created_at DESC",
    )
    .all();
  res.json(announcements);
});

app.post("/api/announcements", requireAdmin, (req, res) => {
  const { title, body, pinned } = req.body;
  const result = db
    .prepare(
      "INSERT INTO announcements (title, body, author_id, pinned) VALUES (?, ?, ?, ?)",
    )
    .run(title, body, req.user.id, pinned ? 1 : 0);
  res.json({
    id: result.lastInsertRowid,
    message: "Anuncio publicado correctamente.",
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  LEAVE REQUESTS
// ════════════════════════════════════════════════════════════════════════════

app.get("/api/leave-requests", requireAuth, (req, res) => {
  const query =
    req.user.role === "admin" || req.user.role === "manager"
      ? "SELECT l.*, u.name as employee_name, u.department FROM leave_requests l JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC"
      : "SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC";

  const requests =
    req.user.role === "admin" || req.user.role === "manager"
      ? db.prepare(query).all()
      : db.prepare(query).all(req.user.id);

  res.json(requests);
});

app.post("/api/leave-requests", requireAuth, (req, res) => {
  const { start_date, end_date, reason } = req.body;
  const result = db
    .prepare(
      "INSERT INTO leave_requests (user_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)",
    )
    .run(req.user.id, start_date, end_date, reason);
  res.json({
    id: result.lastInsertRowid,
    message: "Solicitud enviada correctamente.",
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  PAYROLL
// ════════════════════════════════════════════════════════════════════════════

app.get("/api/payroll/summary", requireAuth, (req, res) => {
  const target = req.user.role === "admin" ? null : req.user.id;
  const employees = target
    ? db
        .prepare("SELECT id, name, department, salary FROM users WHERE id = ?")
        .all(target)
    : db
        .prepare(
          "SELECT id, name, department, salary FROM users ORDER BY department",
        )
        .all();
  res.json(employees);
});

app.post("/api/payroll/calculate", requireAuth, (req, res) => {
  const { formula } = req.body;
  if (!formula) return res.status(400).json({ error: "Fórmula requerida." });

  try {
    const result = eval(formula);
    res.json({ result, formula });
  } catch (err) {
    res.status(400).json({ error: "Fórmula no válida. Revisa la sintaxis." });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════

app.get("/api/admin/users", requireAdmin, (req, res) => {
  const users = db.prepare("SELECT * FROM users").all();
  res.json(users);
});

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const totalEmployees = db
    .prepare("SELECT COUNT(*) as count FROM users WHERE active = 1")
    .get();
  const byDepartment = db
    .prepare(
      "SELECT department, COUNT(*) as count FROM users GROUP BY department",
    )
    .all();
  const avgSalary = db
    .prepare("SELECT AVG(salary) as avg FROM users WHERE active = 1")
    .get();
  const pendingLeave = db
    .prepare(
      "SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'",
    )
    .get();

  res.json({
    totalEmployees: totalEmployees.count,
    byDepartment,
    avgSalary: Math.round(avgSalary.avg),
    pendingLeave: pendingLeave.count,
  });
});

app.get("/api/config", (req, res) => {
  res.json({
    version: "2.4.1",
    environment: "production",
    database: {
      host: "prod-db-01.nexushr.internal",
      port: 5432,
      name: "nexushr_prod",
      username: "nexushr_admin",
      password: "Nx_Pr0d_DB_2024!",
      ssl: true,
    },
    integrations: {
      stripe: STRIPE_SECRET_KEY,
      sendgrid: SENDGRID_API_KEY,
      openai: OPENAI_API_KEY,
      webhook: INTERNAL_WEBHOOK,
    },
    jwt: {
      secret: "nexushr_jwt_sup3r_s3cr3t_2024",
      expiresIn: "8h",
    },
    features: {
      aiAssistant: true,
      advancedReports: true,
      biometricLogin: false,
    },
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ┌──────────────────────────────────────────┐`);
  console.log(`  │   NexusHR v2.4.1  →  http://localhost:${PORT}  │`);
  console.log(`  └──────────────────────────────────────────┘\n`);
});
