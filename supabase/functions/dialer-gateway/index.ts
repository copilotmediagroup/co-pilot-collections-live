import {
  OriginateCallRequest,
  OriginateCallResult,
} from "../_shared/telephony-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizePhone(value: unknown): string {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (raw.startsWith("+")) {
    return "+" + raw.slice(1).replace(/\D/g, "");
  }

  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;

  return "";
}

function validateOriginateRequest(
  input: OriginateCallRequest
): OriginateCallRequest {
  const destination = normalizePhone(input.destination);

  if (!destination) {
    throw new Error("A valid destination phone number is required.");
  }

  const transferNumber = input.transferNumber
    ? normalizePhone(input.transferNumber)
    : undefined;

  if (input.transferNumber && !transferNumber) {
    throw new Error("Transfer number is invalid.");
  }

  return {
    ...input,
    destination,
    transferNumber,
    connectMode:
      input.connectMode === "auto_transfer"
        ? "auto_transfer"
        : "press_1",
  };
}

async function dryRunOriginate(
  request: OriginateCallRequest
): Promise<OriginateCallResult> {
  /*
   * SAFETY:
   *
   * This function deliberately does NOT contact Asterisk yet.
   *
   * It proves that Co Pilot can validate and prepare a provider-neutral
   * dialing request before we introduce an external telephone server.
   */

  const simulatedId =
    "dry_" +
    crypto.randomUUID();

  console.log("[dialer-gateway] DRY RUN originate", {
    provider: "asterisk",
    destination: request.destination,
    campaignId: request.campaignId || null,
    campaignAccountId: request.campaignAccountId || null,
    accountId: request.accountId || null,
    connectMode: request.connectMode || "press_1",
    hasRecording: Boolean(request.recordingUrl),
    hasTransferNumber: Boolean(request.transferNumber),
  });

  return {
    ok: true,
    provider: "asterisk",
    providerCallId: simulatedId,
    status: "dry_run",
    message:
      "Dial request validated. No telephone call was placed.",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();

    if (action === "health") {
      return json({
        ok: true,
        service: "co-pilot-dialer-gateway",
        provider: "asterisk",
        mode: "dry_run",
      });
    }

    if (action === "originate") {
      const request = validateOriginateRequest(
        body?.call || {}
      );

      const result = await dryRunOriginate(request);

      return json(result);
    }

    return json(
      {
        error: "Unknown dialer action.",
        allowedActions: ["health", "originate"],
      },
      400
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("[dialer-gateway]", message);

    return json({ ok: false, error: message }, 400);
  }
});
