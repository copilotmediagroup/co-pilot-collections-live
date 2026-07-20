import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function envSecretKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error("Supabase secret key is unavailable in the Edge Function environment.");
  try {
    const parsed = JSON.parse(raw);
    return parsed.default || Object.values(parsed)[0] || "";
  } catch {
    return raw;
  }
}

function asMoney(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100) / 100;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function normalizeNmiResponse(payload: any, httpOk: boolean) {
  const response = firstText(payload?.response, payload?.result?.response);
  const responseCode = firstText(payload?.response_code, payload?.responseCode, payload?.result?.response_code);
  const condition = firstText(payload?.condition, payload?.status, payload?.result?.condition).toLowerCase().replace(/[\s_-]/g, "");
  const success = httpOk && (
    payload?.success === true ||
    response === "1" ||
    responseCode === "100" ||
    ["approved", "complete", "completed", "pendingsettlement", "settled", "success"].includes(condition)
  );
  const transactionId = firstText(
    payload?.id,
    payload?.transaction_id,
    payload?.transactionid,
    payload?.payment_id,
    payload?.result?.id,
    payload?.result?.transaction_id,
  );
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
  try { return JSON.parse(raw); } catch {
    const params = new URLSearchParams(raw);
    return Object.fromEntries(params.entries());
  }
}

function sanitizeMetadata(value: any) {
  const allowed: Record<string, unknown> = {};
  for (const key of ["source", "notes", "billingEmail", "billingPhone", "accountNumber", "consumerName"]) {
    if (value?.[key] !== undefined && value?.[key] !== null) allowed[key] = String(value[key]).slice(0, 500);
  }
  return allowed;
}

function isAdminProfile(profile: any, email: string) {
  return email.toLowerCase() === "afinch2678@gmail.com" || String(profile?.role || "").toLowerCase() === "admin";
}

async function authenticate(req: Request, admin: any) {
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) throw new Response(JSON.stringify({ error: "Authentication required." }), { status: 401 });
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user?.email) throw new Response(JSON.stringify({ error: "Invalid or expired login session." }), { status: 401 });
  const email = userData.user.email.toLowerCase();
  const { data: profile } = await admin.from("app_users").select("*").ilike("email", email).maybeSingle();
  const hardAdmin = email === "afinch2678@gmail.com";
  if (!hardAdmin) {
    if (!profile) throw new Response(JSON.stringify({ error: "Application user profile was not found." }), { status: 403 });
    if (String(profile.role || "").toLowerCase() === "client") throw new Response(JSON.stringify({ error: "Client Portal users cannot process staff-entered payments." }), { status: 403 });
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
    if (assigned !== actor.email) throw new Response(JSON.stringify({ error: "Employees can process payments only on accounts assigned to them." }), { status: 403 });
  }
  return account;
}

async function callNmi(path: string, body: Record<string, unknown>) {
  const privateKey = Deno.env.get("NMI_PRIVATE_API_KEY")?.trim();
  if (!privateKey) throw new Error("NMI_PRIVATE_API_KEY has not been added to Supabase Edge Function Secrets.");
  const base = (Deno.env.get("NMI_API_BASE") || "https://secure.nmi.com").replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": privateKey,
    },
    body: JSON.stringify(body),
  });
  const payload = await parseGatewayResponse(response);
  return { response, payload, normalized: normalizeNmiResponse(payload, response.ok) };
}

async function createOrReadTransaction(admin: any, row: Record<string, unknown>) {
  const { data, error } = await admin.from("nmi_transactions").insert(row).select("*").single();
  if (!error) return { row: data, existing: false };
  if (String(error.code) !== "23505") throw error;
  const { data: existing, error: readError } = await admin.from("nmi_transactions").select("*").eq("idempotency_key", row.idempotency_key).single();
  if (readError) throw readError;
  return { row: existing, existing: true };
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
    const idempotencyKey = String(input.idempotencyKey || "").trim();
    if (!idempotencyKey || idempotencyKey.length < 12 || idempotencyKey.length > 160) return json({ error: "A valid payment request ID is required." }, 400);

    if (action === "sale") {
      const accountId = String(input.accountId || "").trim();
      const paymentToken = String(input.paymentToken || "").trim();
      const amount = asMoney(input.amount);
      if (!accountId || !paymentToken || amount <= 0) return json({ error: "Account, amount, and NMI payment token are required." }, 400);
      const account = await getAccount(admin, accountId, actor);
      const currentBalance = asMoney(account.current_balance ?? account.principal ?? account.original_balance);
      if (amount > currentBalance + 0.01) return json({ error: `Payment cannot exceed the current balance of $${currentBalance.toFixed(2)}.` }, 400);

      const created = await createOrReadTransaction(admin, {
        account_id: accountId,
        action: "sale",
        idempotency_key: idempotencyKey,
        amount,
        currency: "USD",
        status: "pending",
        request_metadata: sanitizeMetadata(input.metadata),
        created_by_email: actor.email,
      });

      if (created.existing) {
        if (created.row.status === "approved" && created.row.ledger_id) {
          const { data: ledger } = await admin.from("payments_ledger").select("*").eq("id", created.row.ledger_id).maybeSingle();
          return json({ success: true, duplicate: true, transaction: created.row, ledger });
        }
        if (created.row.status === "pending" || created.row.status === "processing") {
          return json({ success: false, pending: true, error: "This payment request is already processing. Do not submit it again." }, 409);
        }
        return json({ success: false, duplicate: true, error: created.row.response_text || "This payment request was already attempted." }, 409);
      }

      await admin.from("nmi_transactions").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", created.row.id);

      const nameParts = String(input.billing?.cardholderName || input.metadata?.consumerName || "").trim().split(/\s+/);
      const firstName = nameParts.shift() || "";
      const lastName = nameParts.join(" ");
      const billingAddress: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        address1: String(input.billing?.address1 || "").trim(),
        address2: String(input.billing?.address2 || "").trim(),
        city: String(input.billing?.city || "").trim(),
        state: String(input.billing?.state || "").trim().slice(0, 2).toUpperCase(),
        zip: String(input.billing?.zip || "").trim(),
        country: "US",
        phone: String(input.billing?.phone || "").trim(),
        email: String(input.billing?.email || "").trim(),
      };
      Object.keys(billingAddress).forEach((key) => { if (!billingAddress[key]) delete billingAddress[key]; });

      const gateway = await callNmi("/api/v5/payments/sale", {
        amount,
        currency: "USD",
        dup_seconds: 120,
        industry: "moto",
        customer_receipt: false,
        payment_details: { payment_token: paymentToken },
        billing_address: billingAddress,
      });

      const result = gateway.normalized;
      const txUpdate = {
        status: result.success ? "gateway_approved" : "declined",
        gateway_transaction_id: result.transactionId || null,
        response_code: result.responseCode || result.response || null,
        response_text: result.text || (result.success ? "Approved" : "Declined"),
        authorization_code: result.authCode || null,
        card_brand: result.cardBrand || String(input.cardMetadata?.brand || "") || null,
        card_last4: result.cardLast4 || String(input.cardMetadata?.last4 || "") || null,
        response_payload: gateway.payload,
        updated_at: new Date().toISOString(),
      };
      await admin.from("nmi_transactions").update(txUpdate).eq("id", created.row.id);

      if (!result.success) {
        return json({
          success: false,
          declined: gateway.response.ok,
          error: result.text || "The card payment was not approved.",
          responseCode: result.responseCode || result.response || "",
        }, gateway.response.ok ? 402 : gateway.response.status || 502);
      }
      if (!result.transactionId) {
        await admin.from("nmi_transactions").update({ status: "needs_review", response_text: "NMI approved the request but returned no transaction ID." }).eq("id", created.row.id);
        return json({ success: false, needsReview: true, error: "The gateway approved the request but did not return a transaction ID. Do not retry; review the NMI portal." }, 502);
      }

      const { data: finalized, error: finalizeError } = await admin.rpc("cpcm_nmi_finalize_sale", {
        p_nmi_transaction_id: created.row.id,
        p_gateway_transaction_id: result.transactionId,
        p_gateway_status: result.condition || "Approved",
        p_response_payload: gateway.payload,
        p_response_code: result.responseCode || result.response || null,
        p_response_text: result.text || "Approved",
        p_authorization_code: result.authCode || null,
        p_card_brand: result.cardBrand || String(input.cardMetadata?.brand || "") || null,
        p_card_last4: result.cardLast4 || String(input.cardMetadata?.last4 || "") || null,
      });
      if (finalizeError) {
        await admin.from("nmi_transactions").update({ status: "gateway_approved_needs_reconciliation", response_text: `Approved by NMI; database finalization failed: ${finalizeError.message}` }).eq("id", created.row.id);
        return json({
          success: false,
          gatewayApproved: true,
          needsReview: true,
          transactionId: result.transactionId,
          error: "NMI approved the card, but Co Pilot could not finish the ledger update. Do not retry this payment. Use the transaction ID to reconcile it.",
        }, 500);
      }

      return json({
        success: true,
        transactionId: result.transactionId,
        authorizationCode: result.authCode,
        cardBrand: result.cardBrand || String(input.cardMetadata?.brand || ""),
        cardLast4: result.cardLast4 || String(input.cardMetadata?.last4 || ""),
        ...finalized,
      });
    }

    if (action === "void" || action === "refund") {
      if (!actor.isAdmin) return json({ error: "Only an administrator can void or refund NMI payments." }, 403);
      const originalLedgerId = String(input.originalLedgerId || "").trim();
      if (!originalLedgerId) return json({ error: "Original ledger payment is required." }, 400);
      const { data: original, error: originalError } = await admin.from("payments_ledger").select("*").eq("id", originalLedgerId).maybeSingle();
      if (originalError || !original || String(original.gateway_provider || "").toUpperCase() !== "NMI" || !original.gateway_transaction_id) {
        return json({ error: "Original NMI payment was not found." }, 404);
      }
      const remainingRefundable = Math.max(0, asMoney(original.amount) - asMoney(original.refunded_amount));
      const amount = action === "void" ? remainingRefundable : asMoney(input.amount);
      if (amount <= 0 || amount > remainingRefundable + 0.01) return json({ error: `Refundable amount is $${remainingRefundable.toFixed(2)}.` }, 400);
      if (action === "void" && asMoney(original.refunded_amount) > 0) return json({ error: "A partially refunded payment cannot be voided. Refund the remaining amount instead." }, 400);

      const created = await createOrReadTransaction(admin, {
        account_id: original.account_id,
        parent_ledger_id: original.id,
        action,
        idempotency_key: idempotencyKey,
        amount,
        currency: "USD",
        status: "pending",
        parent_gateway_transaction_id: original.gateway_transaction_id,
        request_metadata: sanitizeMetadata(input.metadata),
        created_by_email: actor.email,
      });
      if (created.existing) {
        if (created.row.status === "approved" && created.row.ledger_id) return json({ success: true, duplicate: true, transaction: created.row });
        return json({ success: false, pending: true, error: "This adjustment request has already been submitted." }, 409);
      }
      await admin.from("nmi_transactions").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", created.row.id);

      const path = action === "void"
        ? `/api/v5/payments/${encodeURIComponent(original.gateway_transaction_id)}/void`
        : `/api/v5/payments/${encodeURIComponent(original.gateway_transaction_id)}/refund`;
      const gatewayBody = action === "void" ? {} : { amount, payment: "creditcard" };
      const gateway = await callNmi(path, gatewayBody);
      const result = gateway.normalized;
      await admin.from("nmi_transactions").update({
        status: result.success ? "gateway_approved" : "declined",
        gateway_transaction_id: result.transactionId || null,
        response_code: result.responseCode || result.response || null,
        response_text: result.text || (result.success ? "Approved" : "Declined"),
        authorization_code: result.authCode || null,
        response_payload: gateway.payload,
        updated_at: new Date().toISOString(),
      }).eq("id", created.row.id);

      if (!result.success) return json({ success: false, error: result.text || `The ${action} was not approved.` }, gateway.response.ok ? 402 : gateway.response.status || 502);
      const gatewayTransactionId = result.transactionId || original.gateway_transaction_id;
      const { data: finalized, error: finalizeError } = await admin.rpc("cpcm_nmi_apply_adjustment", {
        p_nmi_transaction_id: created.row.id,
        p_gateway_transaction_id: gatewayTransactionId,
        p_gateway_status: result.condition || `${action} approved`,
        p_response_payload: gateway.payload,
        p_response_code: result.responseCode || result.response || null,
        p_response_text: result.text || "Approved",
        p_authorization_code: result.authCode || null,
      });
      if (finalizeError) {
        await admin.from("nmi_transactions").update({ status: "gateway_approved_needs_reconciliation", response_text: `Approved by NMI; database finalization failed: ${finalizeError.message}` }).eq("id", created.row.id);
        return json({ success: false, gatewayApproved: true, needsReview: true, transactionId: gatewayTransactionId, error: `NMI approved the ${action}, but Co Pilot could not finish the ledger update. Do not retry.` }, 500);
      }
      return json({ success: true, transactionId: gatewayTransactionId, ...finalized });
    }

    return json({ error: "Unsupported NMI action." }, 400);
  } catch (error) {
    if (error instanceof Response) {
      const text = await error.text();
      return new Response(text, { status: error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.error("NMI payment function error", error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : "Unexpected payment processing error." }, 500);
  }
});
