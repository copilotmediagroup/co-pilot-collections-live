import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const port = process.env.PORT || 5173;
const ADMIN_EMAIL = "afinch2678@gmail.com";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".sql": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

const accountMap = {
  portfolio: "portfolio",
  accountDescription: "account_description",
  clientAccountNumber: "client_account_number",
  accountId: "source_account_id",
  accountNumber: "account_number",
  firstName: "first_name",
  middleName: "middle_name",
  lastName: "last_name",
  fullName: "full_name",
  ssn: "ssn",
  dob: "dob",
  address: "address",
  address2: "address2",
  city: "city",
  state: "state",
  zip: "zip",
  employer: "employer",
  email: "email",
  originalCreditor: "original_creditor",
  typeOfDebt: "type_of_debt",
  originalBalance: "original_balance",
  principal: "principal",
  currentBalance: "current_balance",
  openDate: "open_date",
  dateAccountOpened: "date_account_opened",
  delinquencyDate: "delinquency_date",
  chargeOffDate: "charge_off_date",
  origLastPmtDate: "orig_last_pmt_date",
  lastPaymentDate: "last_payment_date",
  lastPaymentAmount: "last_payment_amount",
  bankRoutingNumber: "bank_routing_number",
  bankAccountNumber: "bank_account_number",
  phone1: "phone1",
  phone2: "phone2",
  phone3: "phone3",
  phone4: "phone4",
  phone5: "phone5",
  phone6: "phone6",
  status: "status",
  disposition: "disposition",
  lastContactNumber: "last_contact_number"
};

const numericKeys = new Set(["originalBalance", "principal", "currentBalance", "lastPaymentAmount"]);

function env(name) {
  return process.env[name] || "";
}

function dbConfig() {
  // Bolt does not allow custom secret names starting with SUPABASE_.
  // Use the CO_PILOT_* names in Bolt Secrets.
  const url =
    env("CO_PILOT_SUPABASE_URL") ||
    env("VITE_SUPABASE_URL") ||
    env("BOLT_DATABASE_URL");

  const anon =
    env("CO_PILOT_SUPABASE_ANON_KEY") ||
    env("VITE_SUPABASE_ANON_KEY");

  const service =
    env("CO_PILOT_SUPABASE_SERVICE_ROLE_KEY") ||
    env("VITE_SUPABASE_SERVICE_ROLE_KEY");

  return { url, anon, service };
}

function hasAuthConfig() {
  const c = dbConfig();
  return Boolean(c.url && c.anon);
}

function hasDbConfig() {
  const c = dbConfig();
  return Boolean(c.url && c.anon && c.service);
}

function missingConfigMessage() {
  const c = dbConfig();
  const missing = [];
  if (!c.url) missing.push("CO_PILOT_SUPABASE_URL");
  if (!c.anon) missing.push("CO_PILOT_SUPABASE_ANON_KEY");
  if (!c.service) missing.push("CO_PILOT_SUPABASE_SERVICE_ROLE_KEY");
  return "Database secrets missing: " + missing.join(", ") + ". Add them in Bolt Database -> Secrets, then restart the app. Do not use the blocked SUPABASE_ prefix.";
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function text(res, status, data, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(data);
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function getBearer(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

async function authFetch(path, options = {}, token = "") {
  const { url, anon } = dbConfig();
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      "apikey": anon,
      "Authorization": token ? `Bearer ${token}` : `Bearer ${anon}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.msg || data.message || data.error_description || data.error || "Auth request failed");
  }
  return data;
}

async function dbFetch(path, options = {}) {
  const { url, service } = dbConfig();
  const res = await fetch(`${url}/rest/v1${path}`, {
    ...options,
    headers: {
      "apikey": service,
      "Authorization": `Bearer ${service}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(options.headers || {})
    }
  });

  const textBody = await res.text();
  let data = null;
  try { data = textBody ? JSON.parse(textBody) : null; } catch { data = textBody; }

  if (!res.ok) {
    throw new Error(typeof data === "string" ? data : (data?.message || data?.hint || "Database request failed"));
  }
  return data;
}

async function getUserAndProfile(req) {
  if (!hasDbConfig()) throw new Error(missingConfigMessage());
  const token = getBearer(req);
  if (!token) {
    const err = new Error("Missing login token");
    err.status = 401;
    throw err;
  }

  const user = await authFetch("/auth/v1/user", { method: "GET" }, token);
  const email = String(user.email || "").toLowerCase();
  const userId = user.id;

  let profiles = await dbFetch(`/app_profiles?email=eq.${encodeURIComponent(email)}&select=*`);
  let profile = profiles?.[0];

  if (!profile) {
    const role = email === ADMIN_EMAIL ? "admin" : "employee";
    const inserted = await dbFetch("/app_profiles", {
      method: "POST",
      body: JSON.stringify([{ email, user_id: userId, role }])
    });
    profile = inserted[0];
  } else if (!profile.user_id && userId) {
    const updated = await dbFetch(`/app_profiles?id=eq.${profile.id}`, {
      method: "PATCH",
      body: JSON.stringify({ user_id: userId, updated_at: new Date().toISOString() })
    });
    profile = updated[0] || profile;
  }

  return { token, user, profile, email, role: profile.role || "employee" };
}

function requireAdmin(ctx) {
  if (ctx.email !== ADMIN_EMAIL && ctx.role !== "admin") {
    const err = new Error("Admin only");
    err.status = 403;
    throw err;
  }
}

function rowToAccount(row) {
  const out = { id: row.id };
  for (const [camel, snake] of Object.entries(accountMap)) out[camel] = row[snake] ?? "";
  out.createdAt = row.created_at;
  out.updatedAt = row.updated_at;
  return out;
}

function accountToRow(account, email = "") {
  const row = {};
  for (const [camel, snake] of Object.entries(accountMap)) {
    if (account[camel] !== undefined) {
      let value = account[camel];
      if (numericKeys.has(camel)) value = toNumberOrNull(value);
      row[snake] = value;
    }
  }

  row.full_name = row.full_name || [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" ");
  row.account_number = row.account_number || row.client_account_number || row.source_account_id || "";
  row.portfolio = row.portfolio || row.account_description || row.original_creditor || "Imported Portfolio";
  row.original_creditor = row.original_creditor || row.account_description || row.portfolio;
  row.status = row.status || "New";
  row.updated_at = new Date().toISOString();
  if (email && !row.created_by_email) row.created_by_email = email;
  return row;
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function csvEscape(v) {
  return `"${String(v ?? "").replaceAll('"', '""')}"`;
}

async function insertActivity(accountId, ctx, action_type, action_text, extra = {}) {
  await dbFetch("/activity_logs", {
    method: "POST",
    body: JSON.stringify([{
      account_id: accountId,
      action_type,
      action_text,
      phone_number: extra.phone_number || null,
      old_status: extra.old_status || null,
      new_status: extra.new_status || null,
      created_by: ctx.user.id,
      created_by_email: ctx.email
    }])
  });
}

async function handleApi(req, res, url) {
  try {
    if (url.pathname === "/api/config-check" && req.method === "GET") {
      const c = dbConfig();
      return json(res, 200, {
        hasUrl: Boolean(c.url),
        hasAnonKey: Boolean(c.anon),
        hasServiceRoleKey: Boolean(c.service),
        ready: hasDbConfig()
      });
    }

    if ((url.pathname === "/api/auth/login" || url.pathname === "/api/auth/signup") && !hasAuthConfig()) {
      return json(res, 500, { error: missingConfigMessage() });
    }

    if (!hasDbConfig() && !url.pathname.startsWith("/api/auth")) {
      return json(res, 500, { error: missingConfigMessage() });
    }

    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      const body = await readBody(req);
      const data = await authFetch("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email: body.email, password: body.password })
      });
      return json(res, 200, data);
    }

    if (url.pathname === "/api/auth/signup" && req.method === "POST") {
      const body = await readBody(req);
      const data = await authFetch("/auth/v1/signup", {
        method: "POST",
        body: JSON.stringify({ email: body.email, password: body.password })
      });
      return json(res, 200, data);
    }

    const ctx = await getUserAndProfile(req);

    if (url.pathname === "/api/me" && req.method === "GET") {
      return json(res, 200, { email: ctx.email, role: ctx.role, isAdmin: ctx.email === ADMIN_EMAIL || ctx.role === "admin" });
    }

    if (url.pathname === "/api/accounts" && req.method === "GET") {
      const rows = await dbFetch("/accounts?select=*&order=created_at.asc&limit=20000");
      return json(res, 200, rows.map(rowToAccount));
    }

    if (url.pathname === "/api/accounts" && req.method === "POST") {
      requireAdmin(ctx);
      const body = await readBody(req);
      const inserted = await dbFetch("/accounts", {
        method: "POST",
        body: JSON.stringify([accountToRow(body, ctx.email)])
      });
      await insertActivity(inserted[0].id, ctx, "Manual Add", "Account manually added");
      return json(res, 200, rowToAccount(inserted[0]));
    }

    if (url.pathname === "/api/accounts/import" && req.method === "POST") {
      requireAdmin(ctx);
      const body = await readBody(req);
      const accounts = Array.isArray(body.accounts) ? body.accounts : [];
      let insertedCount = 0;

      for (let i = 0; i < accounts.length; i += 500) {
        const chunk = accounts.slice(i, i + 500).map(a => accountToRow(a, ctx.email));
        if (!chunk.length) continue;
        await dbFetch("/accounts", { method: "POST", body: JSON.stringify(chunk), headers: { "Prefer": "return=minimal" } });
        insertedCount += chunk.length;
      }

      return json(res, 200, { imported: insertedCount });
    }

    if (url.pathname === "/api/export" && req.method === "GET") {
      requireAdmin(ctx);
      const rows = await dbFetch("/accounts?select=*&order=created_at.asc&limit=100000");
      const accounts = rows.map(rowToAccount);
      const headers = Object.keys(accountMap);
      const csv = [headers.join(",")].concat(
        accounts.map(a => headers.map(h => csvEscape(a[h])).join(","))
      ).join("\n");
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=co-pilot-accounts-export.csv"
      });
      return res.end(csv);
    }

    const statusMatch = url.pathname.match(/^\/api\/accounts\/([^/]+)\/status$/);
    if (statusMatch && req.method === "PATCH") {
      const accountId = statusMatch[1];
      const body = await readBody(req);
      const oldRows = await dbFetch(`/accounts?id=eq.${encodeURIComponent(accountId)}&select=status,disposition`);
      const oldStatus = oldRows?.[0]?.status || "";
      const status = body.status || (body.disposition === "Disputed" ? "Disputed" : body.disposition) || "New";
      const updated = await dbFetch(`/accounts?id=eq.${encodeURIComponent(accountId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status, disposition: body.disposition || status, updated_at: new Date().toISOString() })
      });
      await insertActivity(accountId, ctx, "Status Updated", `Disposition set to ${body.disposition || status}`, { old_status: oldStatus, new_status: status });
      return json(res, 200, rowToAccount(updated[0]));
    }

    const dialMatch = url.pathname.match(/^\/api\/accounts\/([^/]+)\/dial$/);
    if (dialMatch && req.method === "POST") {
      const accountId = dialMatch[1];
      const body = await readBody(req);
      await dbFetch(`/accounts?id=eq.${encodeURIComponent(accountId)}`, {
        method: "PATCH",
        body: JSON.stringify({ last_contact_number: body.phoneNumber || "", updated_at: new Date().toISOString() })
      });
      await insertActivity(accountId, ctx, "Outbound Call", `Clicked phone number ${body.phoneNumber || ""}`, { phone_number: body.phoneNumber || "" });
      return json(res, 200, { ok: true });
    }

    const notesMatch = url.pathname.match(/^\/api\/accounts\/([^/]+)\/notes$/);
    if (notesMatch && req.method === "POST") {
      const accountId = notesMatch[1];
      const body = await readBody(req);
      const note = String(body.note || "").trim();
      if (!note) return json(res, 400, { error: "Note required" });
      const inserted = await dbFetch("/account_notes", {
        method: "POST",
        body: JSON.stringify([{ account_id: accountId, note, created_by: ctx.user.id, created_by_email: ctx.email }])
      });
      await insertActivity(accountId, ctx, "Note", note);
      return json(res, 200, inserted[0]);
    }

    const historyMatch = url.pathname.match(/^\/api\/accounts\/([^/]+)\/history$/);
    if (historyMatch && req.method === "GET") {
      const accountId = historyMatch[1];
      const notes = await dbFetch(`/account_notes?account_id=eq.${encodeURIComponent(accountId)}&select=*&order=created_at.desc&limit=20`);
      const activity = await dbFetch(`/activity_logs?account_id=eq.${encodeURIComponent(accountId)}&select=*&order=created_at.desc&limit=20`);
      return json(res, 200, { notes, activity });
    }

    const accountMatch = url.pathname.match(/^\/api\/accounts\/([^/]+)$/);
    if (accountMatch && req.method === "PATCH") {
      requireAdmin(ctx);
      const accountId = accountMatch[1];
      const body = await readBody(req);
      const updated = await dbFetch(`/accounts?id=eq.${encodeURIComponent(accountId)}`, {
        method: "PATCH",
        body: JSON.stringify(accountToRow(body, ctx.email))
      });
      await insertActivity(accountId, ctx, "Admin Edit", "Account edited by admin");
      return json(res, 200, rowToAccount(updated[0]));
    }

    if (accountMatch && req.method === "DELETE") {
      requireAdmin(ctx);
      const accountId = accountMatch[1];
      await dbFetch(`/accounts?id=eq.${encodeURIComponent(accountId)}`, {
        method: "DELETE",
        headers: { "Prefer": "return=minimal" }
      });
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { error: "API route not found" });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "Server error" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    return handleApi(req, res, url);
  }

  const pathName = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(process.cwd(), pathName);

  if (!existsSync(filePath)) {
    return text(res, 404, "File not found");
  }

  const ext = extname(filePath);
  return text(res, 200, readFileSync(filePath), mimeTypes[ext] || "application/octet-stream");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Co Pilot CRM database version running on port ${port}`);
});
