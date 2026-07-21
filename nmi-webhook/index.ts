import { createClient } from "npm:@supabase/supabase-js@2";

function envSecretKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error("Supabase secret key is unavailable.");
  try {
    const parsed = JSON.parse(raw);
    return parsed.default || Object.values(parsed)[0] || "";
  } catch { return raw; }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function verifyWebhook(rawBody: string, signatureHeader: string, signingKey: string) {
  const match = signatureHeader.match(/t=([^,]+),s=([^,]+)/i);
  if (!match) return false;
  const nonce = match[1];
  const sentSignature = match[2].toLowerCase();
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(signingKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${nonce}.${rawBody}`));
  return safeEqual(hex(signature), sentSignature);
}

function firstText(...values: unknown[]) {
  for (const value of values) if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  return "";
}

function isSuccessEvent(eventType: string, body: any) {
  const type = eventType.toLowerCase();
  const condition = firstText(body?.condition, body?.status, body?.response_text).toLowerCase();
  return type.includes("success") || ["approved", "complete", "completed", "settled", "pending settlement", "pending_settlement"].includes(condition);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const signingKey = Deno.env.get("NMI_WEBHOOK_SIGNING_KEY")?.trim();
    if (!signingKey) return json({ error: "Webhook signing key is not configured." }, 503);
    const rawBody = await req.text();
    const signature = req.headers.get("Webhook-Signature") || req.headers.get("webhook-signature") || "";
    if (!signature || !(await verifyWebhook(rawBody, signature, signingKey))) return json({ error: "Invalid webhook signature." }, 401);

    const payload = JSON.parse(rawBody || "{}");
    const eventId = firstText(payload.event_id, payload.id);
    const eventType = firstText(payload.event_type, payload.type);
    const body = payload.event_body || payload.data || {};
    const gatewayTransactionId = firstText(body.transaction_id, body.transactionid, body.id, payload.transaction_id);
    if (!eventId) return json({ error: "Webhook event ID is missing." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");
    const admin = createClient(supabaseUrl, envSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: saved, error: saveError } = await admin.from("nmi_webhook_events").insert({
      event_id: eventId,
      event_type: eventType,
      gateway_transaction_id: gatewayTransactionId || null,
      signature_verified: true,
      payload,
      processing_status: "received",
    }).select("*").single();
    if (saveError && String(saveError.code) === "23505") return json({ received: true, duplicate: true });
    if (saveError) throw saveError;

    let processingStatus = "recorded";
    let processingError = "";
    try {
      if (gatewayTransactionId && isSuccessEvent(eventType, body)) {
        const { data: tx } = await admin.from("nmi_transactions").select("*").eq("gateway_transaction_id", gatewayTransactionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (tx && !tx.ledger_id && ["gateway_approved", "gateway_approved_needs_reconciliation", "processing", "pending"].includes(tx.status)) {
          if (tx.action === "sale") {
            const { data: finalized, error } = await admin.rpc("cpcm_nmi_finalize_sale", {
              p_nmi_transaction_id: tx.id,
              p_gateway_transaction_id: gatewayTransactionId,
              p_gateway_status: firstText(body.condition, body.status, "Webhook approved"),
              p_response_payload: payload,
              p_response_code: firstText(body.response_code, body.response),
              p_response_text: firstText(body.response_text, "Webhook approved"),
              p_authorization_code: firstText(body.auth_code, body.authcode),
              p_card_brand: firstText(body.card_type, body.cc_type),
              p_card_last4: firstText(body.card_last4, body.cc_last_four),
            });
            if (error) throw error;
            if (tx.approval_request_id) {
              await admin.from("payment_approval_requests").update({
                status: "approved",
                nmi_transaction_id: tx.id,
                ledger_id: finalized?.ledger_id || tx.ledger_id || null,
                gateway_transaction_id: gatewayTransactionId,
                decision_notes: "Reconciled from verified NMI webhook.",
                updated_at: new Date().toISOString(),
              }).eq("id", tx.approval_request_id);
            }
            processingStatus = "sale_reconciled";
          } else if (tx.action === "refund" || tx.action === "void") {
            const { error } = await admin.rpc("cpcm_nmi_apply_adjustment", {
              p_nmi_transaction_id: tx.id,
              p_gateway_transaction_id: gatewayTransactionId,
              p_gateway_status: firstText(body.condition, body.status, "Webhook approved"),
              p_response_payload: payload,
              p_response_code: firstText(body.response_code, body.response),
              p_response_text: firstText(body.response_text, "Webhook approved"),
              p_authorization_code: firstText(body.auth_code, body.authcode),
            });
            if (error) throw error;
            processingStatus = `${tx.action}_reconciled`;
          }
        } else if (!tx && /refund|void/i.test(eventType)) {
          processingStatus = "external_adjustment_review";
          processingError = "NMI reported a refund/void that was not initiated through Co Pilot. Review the gateway and ledger before changing balances.";
        }
      }
    } catch (error) {
      processingStatus = "reconciliation_failed";
      processingError = error instanceof Error ? error.message : String(error);
    }

    await admin.from("nmi_webhook_events").update({
      processing_status: processingStatus,
      processing_error: processingError || null,
      processed_at: new Date().toISOString(),
    }).eq("id", saved.id);

    return json({ received: true, eventId, processingStatus });
  } catch (error) {
    console.error("NMI webhook error", error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : "Webhook processing error." }, 500);
  }
});
