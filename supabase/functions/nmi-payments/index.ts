import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function envSecretKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error("Supabase secret key is unavailable in the Edge Function environment.");
  try { const parsed = JSON.parse(raw); return parsed.default || Object.values(parsed)[0] || ""; } catch { return raw; }
}

function asMoney(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function firstText(...values: unknown[]): string {
  for (const value of values) if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  return "";
}

function normalizeNmiResponse(payload: any, httpOk: boolean) {
  const response = firstText(payload?.response, payload?.result?.response);
  const responseCode = firstText(payload?.response_code, payload?.responseCode, payload?.result?.response_code);
  const condition = firstText(payload?.condition, payload?.status, payload?.result?.condition).toLowerCase().replace(/[\s_-]/g, "");
  const success = httpOk && (payload?.success === true || response === "1" || responseCode === "100" || ["approved","complete","completed","pendingsettlement","settled","success"].includes(condition));
  const transactionId = firstText(payload?.id, payload?.transaction_id, payload?.transactionid, payload?.payment_id, payload?.result?.id, payload?.result?.transaction_id);
  const text = firstText(payload?.response_text, payload?.responsetext, payload?.message, payload?.error, payload?.result?.response_text);
  const authCode = firstText(payload?.auth_code, payload?.authcode, payload?.authorization_code, payload?.result?.auth_code);
  const cardBrand = firstText(payload?.card?.type, payload?.card_type, payload?.cc_type, payload?.payment_method?.card?.brand, payload?.result?.card_type);
  const masked = firstText(payload?.card?.number, payload?.masked_card, payload?.card_number, payload?.payment_method?.card?.masked_number);
  const cardLast4 = firstText(payload?.card_last4, payload?.last_four, payload?.cc_last_four, masked.replace(/\D/g, "").slice(-4));
  return { success, transactionId, response, responseCode, text, authCode, cardBrand, cardLast4, condition };
}

async function parseGatewayResponse(response: Response) {
  const raw = await response.text();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return Object.fromEntries(new URLSearchParams(raw).entries()); }
}

function sanitizeMetadata(value: any) {
  const allowed: Record<string, unknown> = {};
  for (const key of ["source","notes","billingEmail","billingPhone","accountNumber","consumerName"]) {
    if (value?.[key] !== undefined && value?.[key] !== null) allowed[key] = String(value[key]).slice(0, 500);
  }
  return allowed;
}

function isAdminProfile(profile: any, email: string) {
  return email.toLowerCase() === "afinch2678@gmail.com" || String(profile?.role || "").toLowerCase() === "admin";
}

async function authenticate(req: Request, admin: any) {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) throw new Response(JSON.stringify({ error: "Authentication required." }), { status: 401 });
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user?.email) throw new Response(JSON.stringify({ error: "Invalid or expired login session." }), { status: 401 });
  const email = userData.user.email.toLowerCase();
  const { data: profile } = await admin.from("app_users").select("*").ilike("email", email).maybeSingle();
  const hardAdmin = email === "afinch2678@gmail.com";
  if (!hardAdmin) {
    if (!profile) throw new Response(JSON.stringify({ error: "Application user profile was not found." }), { status: 403 });
    if (String(profile.role || "").toLowerCase() === "client") throw new Response(JSON.stringify({ error: "Client Portal users cannot access staff payment processing." }), { status: 403 });
    if (profile.is_approved === false || profile.is_active === false || String(profile.approval_status || "approved").toLowerCase() !== "approved") {
      throw new Response(JSON.stringify({ error: "Your staff account is not approved and active." }), { status: 403 });
    }
  }
  return { email, profile, isAdmin: isAdminProfile(profile, email) };
}

async function getAccount(admin: any, accountId: string, actor: any) {
  const { data: account, error } = await admin.from("accounts").select("*").eq("id", accountId).maybeSingle();
  if (error || !account) throw new Response(JSON.stringify({ error: "Account was not found." }), { status: 404 });
  if (!actor.isAdmin) {
    const assigned = String(account.assigned_to_email || "").toLowerCase();
    if (assigned !== actor.email) throw new Response(JSON.stringify({ error: "Employees may submit payments only for accounts assigned to them." }), { status: 403 });
  }
  return account;
}

function billingAddress(input: any) {
  const nameParts = String(input.billing?.cardholderName || input.metadata?.consumerName || "").trim().split(/\s+/);
  const firstName = nameParts.shift() || "";
  const lastName = nameParts.join(" ");
  const address: Record<string, unknown> = {
    first_name: firstName, last_name: lastName, address1: String(input.billing?.address1 || "").trim(),
    city: String(input.billing?.city || "").trim(), state: String(input.billing?.state || "").trim().slice(0,2).toUpperCase(),
    zip: String(input.billing?.zip || "").trim(), country: "US", phone: String(input.billing?.phone || "").trim(),
    email: String(input.billing?.email || "").trim(),
  };
  Object.keys(address).forEach((key) => { if (!address[key]) delete address[key]; });
  return address;
}

async function callNmi(path: string, method = "POST", body?: Record<string, unknown>) {
  const privateKey = Deno.env.get("NMI_PRIVATE_API_KEY")?.trim();
  if (!privateKey) throw new Error("NMI_PRIVATE_API_KEY has not been added to Supabase Edge Function Secrets.");
  const base = (Deno.env.get("NMI_API_BASE") || "https://secure.nmi.com").replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": privateKey },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await parseGatewayResponse(response);
  return { response, payload, normalized: normalizeNmiResponse(payload, response.ok) };
}

async function deleteVault(admin: any, request: any) {
  const vaultId = String(request?.nmi_customer_vault_id || "").trim();
  if (!vaultId) return { deleted: true };
  try {
    const gateway = await callNmi(`/api/v5/customers/${encodeURIComponent(vaultId)}`, "DELETE");
    if (!gateway.response.ok && gateway.response.status !== 404) throw new Error(firstText(gateway.payload?.response_text, gateway.payload?.message, `NMI vault deletion failed with status ${gateway.response.status}.`));
    await admin.from("payment_approval_requests").update({ vault_deleted_at: new Date().toISOString(), vault_delete_error: null, updated_at: new Date().toISOString() }).eq("id", request.id);
    return { deleted: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("payment_approval_requests").update({ vault_delete_error: message, updated_at: new Date().toISOString() }).eq("id", request.id);
    return { deleted: false, error: message };
  }
}

async function insertActivity(admin: any, accountId: string, type: string, text: string, email: string) {
  try { await admin.from("activity_logs").insert({ account_id: accountId, action_type: type, action_text: text, created_by_email: email, created_at: new Date().toISOString() }); } catch { /* non-payment telemetry must not block payment security */ }
}

async function insertAudit(admin: any, type: string, text: string, targetType: string, targetId: string, email: string) {
  try { await admin.from("audit_logs").insert({ action_type: type, action_text: text, target_type: targetType, target_id: targetId, created_by_email: email }); } catch { /* audit insert failure is separately visible in Edge Function logs */ }
}

function sanitizedRequest(row: any) {
  return {
    id: row.id, accountId: row.account_id, amount: row.amount, balanceAtRequest: row.balance_at_request,
    status: row.status, cardBrand: row.card_brand, cardLast4: row.card_last4, cardholderName: row.cardholder_name,
    consumerName: row.consumer_name, accountNumber: row.account_number, authorizationNotes: row.authorization_notes,
    requestedByEmail: row.requested_by_email, reviewedByEmail: row.reviewed_by_email, reviewedAt: row.reviewed_at,
    decisionNotes: row.decision_notes, expiresAt: row.expires_at, gatewayTransactionId: row.gateway_transaction_id,
    ledgerId: row.ledger_id, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function expireRequests(admin: any) {
  const now = new Date().toISOString();
  const { data: expired } = await admin.from("payment_approval_requests").select("*").eq("status", "pending").lt("expires_at", now).limit(25);
  for (const row of expired || []) {
    const { data: claimed } = await admin.from("payment_approval_requests").update({ status: "expired", decision_notes: "Approval window expired before administrator processing.", reviewed_at: now, updated_at: now }).eq("id", row.id).eq("status", "pending").select("*").maybeSingle();
    if (claimed) await deleteVault(admin, claimed);
  }
}

async function createOrReadTransaction(admin: any, row: Record<string, unknown>) {
  const { data, error } = await admin.from("nmi_transactions").insert(row).select("*").single();
  if (!error) return { row: data, existing: false };
  if (String(error.code) !== "23505") throw error;
  const { data: existing, error: readError } = await admin.from("nmi_transactions").select("*").eq("idempotency_key", row.idempotency_key).single();
  if (readError) throw readError;
  return { row: existing, existing: true };
}

async function processSale(admin: any, actor: any, input: any, options: { paymentToken?: string; vaultId?: string; approvalRequest?: any }) {
  if (!actor.isAdmin) return json({ error: "Only an administrator can process a card charge." }, 403);
  const accountId = String(input.accountId || options.approvalRequest?.account_id || "").trim();
  const amount = asMoney(input.amount ?? options.approvalRequest?.amount);
  const idempotencyKey = String(input.idempotencyKey || "").trim();
  if (!accountId || amount <= 0 || !idempotencyKey) return json({ error: "Account, amount, and payment request ID are required." }, 400);
  const account = await getAccount(admin, accountId, actor);
  const currentBalance = asMoney(account.current_balance ?? account.principal ?? account.original_balance);
  if (amount > currentBalance + 0.01) return json({ error: `Payment cannot exceed the current balance of $${currentBalance.toFixed(2)}.` }, 400);

  const requestedBy = String(options.approvalRequest?.requested_by_email || actor.email).toLowerCase();
  const created = await createOrReadTransaction(admin, {
    account_id: accountId, approval_request_id: options.approvalRequest?.id || null, approved_by_email: actor.email,
    action: "sale", idempotency_key: idempotencyKey, amount, currency: "USD", status: "pending",
    request_metadata: sanitizeMetadata(input.metadata || options.approvalRequest?.request_metadata), created_by_email: requestedBy,
  });
  if (created.existing) {
    if (created.row.status === "approved" && created.row.ledger_id) {
      const { data: ledger } = await admin.from("payments_ledger").select("*").eq("id", created.row.ledger_id).maybeSingle();
      return json({ success: true, duplicate: true, transaction: created.row, ...ledger });
    }
    return json({ success: false, pending: true, error: "This payment request was already submitted. Do not process it again." }, 409);
  }
  await admin.from("nmi_transactions").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", created.row.id);

  let gateway;
  try {
    gateway = await callNmi("/api/v5/payments/sale", "POST", {
      amount, currency: "USD", industry: "moto", customer_receipt: false,
      payment_details: options.vaultId ? { customer_vault_id: options.vaultId } : { payment_token: options.paymentToken },
      ...(options.vaultId ? {} : { billing_address: billingAddress(input) }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("nmi_transactions").update({ status: "needs_review", response_text: `NMI response unknown: ${message}`, updated_at: new Date().toISOString() }).eq("id", created.row.id);
    if (options.approvalRequest) await admin.from("payment_approval_requests").update({ status: "needs_review", nmi_transaction_id: created.row.id, reviewed_by_email: actor.email, reviewed_at: new Date().toISOString(), decision_notes: "NMI response was not received. Check the gateway before retrying.", updated_at: new Date().toISOString() }).eq("id", options.approvalRequest.id);
    return json({ success: false, needsReview: true, error: "NMI did not return a final response. Do not retry until the gateway report is checked." }, 502);
  }

  const result = gateway.normalized;
  const cardBrand = result.cardBrand || String(input.cardMetadata?.brand || options.approvalRequest?.card_brand || "") || null;
  const cardLast4 = result.cardLast4 || String(input.cardMetadata?.last4 || options.approvalRequest?.card_last4 || "") || null;
  await admin.from("nmi_transactions").update({
    status: result.success ? "gateway_approved" : "declined", gateway_transaction_id: result.transactionId || null,
    response_code: result.responseCode || result.response || null, response_text: result.text || (result.success ? "Approved" : "Declined"),
    authorization_code: result.authCode || null, card_brand: cardBrand, card_last4: cardLast4,
    response_payload: gateway.payload, updated_at: new Date().toISOString(),
  }).eq("id", created.row.id);

  if (!result.success) {
    if (options.approvalRequest) {
      await admin.from("payment_approval_requests").update({ status: "gateway_declined", nmi_transaction_id: created.row.id, reviewed_by_email: actor.email, reviewed_at: new Date().toISOString(), decision_notes: result.text || "NMI declined the payment.", updated_at: new Date().toISOString() }).eq("id", options.approvalRequest.id);
      await deleteVault(admin, options.approvalRequest);
    }
    return json({ success: false, declined: gateway.response.ok, error: result.text || "The card payment was not approved.", responseCode: result.responseCode || result.response || "" }, gateway.response.ok ? 402 : gateway.response.status || 502);
  }
  if (!result.transactionId) {
    await admin.from("nmi_transactions").update({ status: "needs_review", response_text: "NMI approved the request but returned no transaction ID." }).eq("id", created.row.id);
    if (options.approvalRequest) await admin.from("payment_approval_requests").update({ status: "needs_review", nmi_transaction_id: created.row.id, reviewed_by_email: actor.email, reviewed_at: new Date().toISOString(), decision_notes: "Approved response lacked a transaction ID. Check NMI.", updated_at: new Date().toISOString() }).eq("id", options.approvalRequest.id);
    return json({ success: false, gatewayApproved: true, needsReview: true, error: "The gateway approved the request but returned no transaction ID. Do not retry; review NMI." }, 502);
  }

  const { data: finalized, error: finalizeError } = await admin.rpc("cpcm_nmi_finalize_sale", {
    p_nmi_transaction_id: created.row.id, p_gateway_transaction_id: result.transactionId,
    p_gateway_status: result.condition || "Approved", p_response_payload: gateway.payload,
    p_response_code: result.responseCode || result.response || null, p_response_text: result.text || "Approved",
    p_authorization_code: result.authCode || null, p_card_brand: cardBrand, p_card_last4: cardLast4,
  });
  if (finalizeError) {
    await admin.from("nmi_transactions").update({ status: "gateway_approved_needs_reconciliation", response_text: `Approved by NMI; database finalization failed: ${finalizeError.message}` }).eq("id", created.row.id);
    if (options.approvalRequest) {
      await admin.from("payment_approval_requests").update({ status: "needs_review", nmi_transaction_id: created.row.id, gateway_transaction_id: result.transactionId, reviewed_by_email: actor.email, reviewed_at: new Date().toISOString(), decision_notes: "NMI approved the card but the Co Pilot ledger requires reconciliation.", updated_at: new Date().toISOString() }).eq("id", options.approvalRequest.id);
      await deleteVault(admin, options.approvalRequest);
    }
    return json({ success: false, gatewayApproved: true, needsReview: true, transactionId: result.transactionId, error: "NMI approved the card, but Co Pilot could not finish the ledger update. Do not retry this payment." }, 500);
  }

  if (options.approvalRequest) {
    await admin.from("payment_approval_requests").update({
      status: "approved", nmi_transaction_id: created.row.id, ledger_id: finalized?.ledger_id || null,
      gateway_transaction_id: result.transactionId, reviewed_by_email: actor.email, reviewed_at: new Date().toISOString(),
      decision_notes: "Approved and processed by administrator.", updated_at: new Date().toISOString(),
    }).eq("id", options.approvalRequest.id);
    await deleteVault(admin, options.approvalRequest);
    await insertAudit(admin, "NMI Payment Approval", `Approved $${amount.toFixed(2)} request submitted by ${requestedBy}. NMI transaction ${result.transactionId}.`, "payment_approval_request", options.approvalRequest.id, actor.email);
  }

  return json({ success: true, accountId, amount, transactionId: result.transactionId, authorizationCode: result.authCode, cardBrand, cardLast4, ...finalized });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");
    const admin = createClient(supabaseUrl, envSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    const actor = await authenticate(req, admin);
    const input = await req.json().catch(() => ({}));
    const action = String(input.action || "sale").toLowerCase();

    if (action === "approval_count" || action === "list_approval_requests") {
      await expireRequests(admin);
      let query = admin.from("payment_approval_requests").select("*").order("created_at", { ascending: false }).limit(action === "approval_count" ? 1 : 200);
      if (!actor.isAdmin) query = query.ilike("requested_by_email", actor.email);
      const { data: rows, error } = await query;
      if (error) throw error;
      let countQuery = admin.from("payment_approval_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
      if (!actor.isAdmin) countQuery = countQuery.ilike("requested_by_email", actor.email);
      const { count } = await countQuery;
      return json({ success: true, pendingCount: count || 0, requests: action === "list_approval_requests" ? (rows || []).map(sanitizedRequest) : [] });
    }

    const idempotencyKey = String(input.idempotencyKey || "").trim();
    if (!idempotencyKey || idempotencyKey.length < 12 || idempotencyKey.length > 180) return json({ error: "A valid payment request ID is required." }, 400);

    if (action === "submit_for_approval") {
      const accountId = String(input.accountId || "").trim();
      const paymentToken = String(input.paymentToken || "").trim();
      const amount = asMoney(input.amount);
      if (!accountId || !paymentToken || amount <= 0) return json({ error: "Account, amount, and secure NMI payment token are required." }, 400);
      if (input.authorizationConfirmed !== true) return json({ error: "Consumer authorization confirmation is required." }, 400);
      const account = await getAccount(admin, accountId, actor);
      const currentBalance = asMoney(account.current_balance ?? account.principal ?? account.original_balance);
      if (amount > currentBalance + 0.01) return json({ error: `Payment cannot exceed the current balance of $${currentBalance.toFixed(2)}.` }, 400);
      const metadata = sanitizeMetadata(input.metadata);
      const expiresHours = Math.min(72, Math.max(1, Number(Deno.env.get("NMI_APPROVAL_TTL_HOURS") || 24)));
      const expiresAt = new Date(Date.now() + expiresHours * 3600000).toISOString();
      const row = {
        account_id: accountId, amount, balance_at_request: currentBalance, currency: "USD", status: "vaulting", idempotency_key: idempotencyKey,
        card_brand: String(input.cardMetadata?.brand || "") || null, card_last4: String(input.cardMetadata?.last4 || "") || null,
        cardholder_name: String(input.billing?.cardholderName || "").slice(0,200), billing_address1: String(input.billing?.address1 || "").slice(0,300),
        billing_city: String(input.billing?.city || "").slice(0,120), billing_state: String(input.billing?.state || "").slice(0,10),
        billing_zip: String(input.billing?.zip || "").slice(0,30), billing_email: String(input.billing?.email || "").slice(0,250),
        billing_phone: String(input.billing?.phone || "").slice(0,60), consumer_name: String(metadata.consumerName || "").slice(0,250),
        account_number: String(metadata.accountNumber || "").slice(0,150), authorization_confirmed: true,
        authorization_notes: String(metadata.notes || "").slice(0,2000), request_metadata: metadata, requested_by_email: actor.email,
        expires_at: expiresAt, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      const { data: created, error: createError } = await admin.from("payment_approval_requests").insert(row).select("*").single();
      if (createError) {
        if (String(createError.code) === "23505") {
          const { data: existing } = await admin.from("payment_approval_requests").select("*").eq("idempotency_key", idempotencyKey).maybeSingle();
          if (existing && existing.status === "pending") return json({ success: true, duplicate: true, ...sanitizedRequest(existing) });
          return json({ error: "This approval request was already submitted." }, 409);
        }
        throw createError;
      }

      let gateway;
      try {
        gateway = await callNmi("/api/v5/customers", "POST", { payment_details: { payment_token: paymentToken }, billing_address: billingAddress(input) });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await admin.from("payment_approval_requests").update({ status: "failed", decision_notes: `NMI vault creation failed: ${message}`, updated_at: new Date().toISOString() }).eq("id", created.id);
        return json({ error: "NMI could not secure the card for administrator approval. No charge occurred." }, 502);
      }
      const vaultId = firstText(gateway.payload?.id, gateway.payload?.customer_vault_id, gateway.payload?.customer_id, gateway.payload?.result?.id);
      if (!gateway.response.ok || !vaultId) {
        const message = firstText(gateway.payload?.response_text, gateway.payload?.message, gateway.payload?.error, "NMI could not create a secure vault reference.");
        await admin.from("payment_approval_requests").update({ status: "failed", decision_notes: message, updated_at: new Date().toISOString() }).eq("id", created.id);
        return json({ error: `${message} No charge occurred.` }, gateway.response.status || 502);
      }
      const { data: pending, error: pendingError } = await admin.from("payment_approval_requests").update({ status: "pending", nmi_customer_vault_id: vaultId, updated_at: new Date().toISOString() }).eq("id", created.id).select("*").single();
      if (pendingError) {
        await callNmi(`/api/v5/customers/${encodeURIComponent(vaultId)}`, "DELETE").catch(() => null);
        throw pendingError;
      }
      await insertActivity(admin, accountId, "Payment Approval Submitted", `Submitted a $${amount.toFixed(2)} NMI card payment for administrator approval. No charge occurred.`, actor.email);
      await insertAudit(admin, "Payment Approval Submitted", `${actor.email} submitted $${amount.toFixed(2)} for ${String(metadata.consumerName || "consumer")}.`, "payment_approval_request", pending.id, actor.email);
      return json({ success: true, amount, ...sanitizedRequest(pending) });
    }

    if (action === "sale") {
      if (!actor.isAdmin) return json({ error: "Employees cannot run cards. Submit the payment for administrator approval." }, 403);
      const paymentToken = String(input.paymentToken || "").trim();
      if (!paymentToken) return json({ error: "A secure NMI payment token is required." }, 400);
      return await processSale(admin, actor, input, { paymentToken });
    }

    if (action === "approve_request") {
      if (!actor.isAdmin) return json({ error: "Only an administrator can approve and process a card." }, 403);
      const requestId = String(input.requestId || "").trim();
      if (!requestId) return json({ error: "Payment approval request is required." }, 400);
      const now = new Date().toISOString();
      const { data: claimed, error: claimError } = await admin.from("payment_approval_requests").update({ status: "processing", reviewed_by_email: actor.email, reviewed_at: now, updated_at: now }).eq("id", requestId).eq("status", "pending").gt("expires_at", now).select("*").maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) {
        const { data: existing } = await admin.from("payment_approval_requests").select("*").eq("id", requestId).maybeSingle();
        if (!existing) return json({ error: "Payment approval request was not found." }, 404);
        if (existing.status === "approved" && existing.ledger_id) return json({ success: true, duplicate: true, accountId: existing.account_id, amount: existing.amount, transactionId: existing.gateway_transaction_id, ledger_id: existing.ledger_id });
        if (existing.status === "pending" && new Date(existing.expires_at).getTime() <= Date.now()) {
          await admin.from("payment_approval_requests").update({ status: "expired", reviewed_by_email: actor.email, reviewed_at: now, decision_notes: "Expired before administrator approval.", updated_at: now }).eq("id", existing.id);
          await deleteVault(admin, existing);
          return json({ error: "This payment request expired. The employee must obtain fresh authorization and card information." }, 410);
        }
        return json({ error: `This request cannot be processed because its status is ${existing.status}.` }, 409);
      }
      if (!claimed.nmi_customer_vault_id) {
        await admin.from("payment_approval_requests").update({ status: "failed", decision_notes: "Secure NMI vault reference was missing.", updated_at: now }).eq("id", claimed.id);
        return json({ error: "The secure NMI payment reference is missing. Do not attempt to process this request." }, 409);
      }
      const approvalAccount = await getAccount(admin, claimed.account_id, actor);
      const approvalBalance = asMoney(approvalAccount.current_balance ?? approvalAccount.principal ?? approvalAccount.original_balance);
      if (asMoney(claimed.amount) > approvalBalance + 0.01) {
        await admin.from("payment_approval_requests").update({
          status: "failed",
          decision_notes: `Approval blocked because the current balance is $${approvalBalance.toFixed(2)}, below the requested $${asMoney(claimed.amount).toFixed(2)}.`,
          updated_at: new Date().toISOString(),
        }).eq("id", claimed.id);
        await deleteVault(admin, claimed);
        return json({ error: `The account balance changed. This request cannot exceed the current balance of $${approvalBalance.toFixed(2)}.` }, 409);
      }
      const saleInput = { accountId: claimed.account_id, amount: claimed.amount, idempotencyKey: `approval-sale-${claimed.id}`, metadata: claimed.request_metadata, cardMetadata: { brand: claimed.card_brand, last4: claimed.card_last4 } };
      return await processSale(admin, actor, saleInput, { vaultId: claimed.nmi_customer_vault_id, approvalRequest: claimed });
    }

    if (action === "decline_request" || action === "cancel_request") {
      const requestId = String(input.requestId || "").trim();
      if (!requestId) return json({ error: "Payment approval request is required." }, 400);
      const targetStatus = action === "decline_request" ? "declined" : "cancelled";
      if (action === "decline_request" && !actor.isAdmin) return json({ error: "Only an administrator can decline payment requests." }, 403);
      let query = admin.from("payment_approval_requests").update({ status: targetStatus, reviewed_by_email: actor.email, reviewed_at: new Date().toISOString(), decision_notes: String(input.decisionNotes || (targetStatus === "cancelled" ? "Cancelled by submitting employee." : "Declined by administrator.")).slice(0,2000), updated_at: new Date().toISOString() }).eq("id", requestId).eq("status", "pending");
      if (!actor.isAdmin) query = query.ilike("requested_by_email", actor.email);
      const { data: changed, error } = await query.select("*").maybeSingle();
      if (error) throw error;
      if (!changed) return json({ error: "This request is no longer pending or you do not have permission to change it." }, 409);
      const cleanup = await deleteVault(admin, changed);
      await insertAudit(admin, targetStatus === "declined" ? "Payment Approval Declined" : "Payment Approval Cancelled", `${targetStatus} $${asMoney(changed.amount).toFixed(2)} request.`, "payment_approval_request", changed.id, actor.email);
      return json({ success: true, status: targetStatus, vaultDeleted: cleanup.deleted });
    }

    if (action === "void" || action === "refund") {
      if (!actor.isAdmin) return json({ error: "Only an administrator can void or refund NMI payments." }, 403);
      const originalLedgerId = String(input.originalLedgerId || "").trim();
      if (!originalLedgerId) return json({ error: "Original ledger payment is required." }, 400);
      const { data: original, error: originalError } = await admin.from("payments_ledger").select("*").eq("id", originalLedgerId).maybeSingle();
      if (originalError || !original || String(original.gateway_provider || "").toUpperCase() !== "NMI" || !original.gateway_transaction_id) return json({ error: "Original NMI payment was not found." }, 404);
      const remainingRefundable = Math.max(0, asMoney(original.amount) - asMoney(original.refunded_amount));
      const adjustmentAmount = action === "void" ? remainingRefundable : asMoney(input.amount);
      if (adjustmentAmount <= 0 || adjustmentAmount > remainingRefundable + 0.01) return json({ error: `Refundable amount is $${remainingRefundable.toFixed(2)}.` }, 400);
      if (action === "void" && asMoney(original.refunded_amount) > 0) return json({ error: "A partially refunded payment cannot be voided. Refund the remaining amount instead." }, 400);
      const created = await createOrReadTransaction(admin, { account_id: original.account_id, parent_ledger_id: original.id, action, idempotency_key: idempotencyKey, amount: adjustmentAmount, currency: "USD", status: "pending", parent_gateway_transaction_id: original.gateway_transaction_id, request_metadata: sanitizeMetadata(input.metadata), created_by_email: actor.email });
      if (created.existing) return json({ error: "This adjustment request was already submitted." }, 409);
      await admin.from("nmi_transactions").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", created.row.id);
      const path = action === "void" ? `/api/v5/payments/${encodeURIComponent(original.gateway_transaction_id)}/void` : `/api/v5/payments/${encodeURIComponent(original.gateway_transaction_id)}/refund`;
      const gateway = await callNmi(path, "POST", action === "void" ? {} : { amount: adjustmentAmount, payment: "creditcard" });
      const result = gateway.normalized;
      await admin.from("nmi_transactions").update({ status: result.success ? "gateway_approved" : "declined", gateway_transaction_id: result.transactionId || null, response_code: result.responseCode || result.response || null, response_text: result.text || (result.success ? "Approved" : "Declined"), authorization_code: result.authCode || null, response_payload: gateway.payload, updated_at: new Date().toISOString() }).eq("id", created.row.id);
      if (!result.success) return json({ success: false, error: result.text || `The ${action} was not approved.` }, gateway.response.ok ? 402 : gateway.response.status || 502);
      const gatewayTransactionId = result.transactionId || original.gateway_transaction_id;
      const { data: finalized, error: finalizeError } = await admin.rpc("cpcm_nmi_apply_adjustment", { p_nmi_transaction_id: created.row.id, p_gateway_transaction_id: gatewayTransactionId, p_gateway_status: result.condition || `${action} approved`, p_response_payload: gateway.payload, p_response_code: result.responseCode || result.response || null, p_response_text: result.text || "Approved", p_authorization_code: result.authCode || null });
      if (finalizeError) {
        await admin.from("nmi_transactions").update({ status: "gateway_approved_needs_reconciliation", response_text: `Approved by NMI; database finalization failed: ${finalizeError.message}` }).eq("id", created.row.id);
        return json({ success: false, gatewayApproved: true, needsReview: true, transactionId: gatewayTransactionId, error: `NMI approved the ${action}, but Co Pilot could not finish the ledger update. Do not retry.` }, 500);
      }
      return json({ success: true, transactionId: gatewayTransactionId, ...finalized });
    }

    return json({ error: "Unsupported NMI action." }, 400);
  } catch (error) {
    if (error instanceof Response) return new Response(await error.text(), { status: error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    console.error("NMI payment function error", error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : "Unexpected payment processing error." }, 500);
  }
});
