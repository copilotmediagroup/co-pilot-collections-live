import {
  HangupCallRequest,
  OriginateCallRequest,
  OriginateCallResult,
  TelephonyProvider,
} from "./telephony-provider.ts";

type GatewaySecrets = {
  url: string;
  token: string;
};

function gatewaySecrets(): GatewaySecrets {
  const url =
    Deno.env.get("COPILOT_DIALER_GATEWAY_URL")
      ?.trim()
      .replace(/\/$/, "") || "";

  const token =
    Deno.env.get("COPILOT_DIALER_GATEWAY_TOKEN")
      ?.trim() || "";

  if (!url || !token) {
    throw new Error(
      "Co Pilot Dialer Gateway is not configured. Required: COPILOT_DIALER_GATEWAY_URL and COPILOT_DIALER_GATEWAY_TOKEN."
    );
  }

  return { url, token };
}

async function gatewayRequest(
  action: string,
  payload: Record<string, unknown> = {}
) {
  const secrets = gatewaySecrets();

  const response = await fetch(secrets.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secrets.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      action,
      ...payload,
    }),
  });

  const text = await response.text();

  let body: any = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === "string"
        ? body
        : body?.error ||
          body?.message ||
          `Dialer gateway returned HTTP ${response.status}.`;

    throw new Error(message);
  }

  return body;
}

export class AsteriskProvider implements TelephonyProvider {
  readonly name = "asterisk" as const;

  async checkConnection() {
    const result = await gatewayRequest(
      "asterisk_check"
    );

    return {
      ok: Boolean(result?.ok),
      provider: this.name,
      message:
        "Co Pilot securely reached the VPS gateway and Asterisk.",
    };
  }

  async originate(
    request: OriginateCallRequest
  ): Promise<OriginateCallResult> {
    /*
     * SAFETY:
     *
     * Live dialing remains intentionally disabled.
     * The VPS gateway currently accepts health and
     * asterisk_check only.
     */

    return {
      ok: true,
      provider: this.name,
      providerCallId:
        "prepared_" + crypto.randomUUID(),
      status: "prepared",
      message:
        `Call request prepared for ${request.destination}. Live dialing remains disabled.`,
    };
  }

  async hangup(
    request: HangupCallRequest
  ) {
    if (!request.providerCallId) {
      throw new Error(
        "providerCallId is required."
      );
    }

    return {
      ok: true,
      provider: this.name,
      message:
        "Hangup request validated. Live hangup remains disabled.",
    };
  }
}
