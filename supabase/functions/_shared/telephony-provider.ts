export type DialerProvider = "twilio" | "asterisk";

export interface OriginateCallRequest {
  destination: string;
  callerId?: string;
  campaignId?: string;
  campaignAccountId?: string;
  accountId?: string;
  recordingUrl?: string;
  transferNumber?: string;
  connectMode?: "press_1" | "auto_transfer";
}

export interface OriginateCallResult {
  ok: boolean;
  provider: DialerProvider;
  providerCallId?: string;
  status?: string;
  message?: string;
}

export interface HangupCallRequest {
  providerCallId: string;
}

export interface TelephonyProvider {
  readonly name: DialerProvider;

  checkConnection(): Promise<{
    ok: boolean;
    provider: DialerProvider;
    message?: string;
  }>;

  originate(
    request: OriginateCallRequest
  ): Promise<OriginateCallResult>;

  hangup(
    request: HangupCallRequest
  ): Promise<{
    ok: boolean;
    provider: DialerProvider;
    message?: string;
  }>;
}
