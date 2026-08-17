# Co Pilot Collections — Asterisk Dialer Architecture

## Goal

Replace Twilio-specific call execution with a Co Pilot controlled dialer engine.

The existing Collections application remains responsible for:

- campaigns
- account selection
- dialing rate
- simultaneous call limits
- retry attempts
- call history
- active recordings
- Press 1 workflow
- RingCentral transfer destination
- collector workflow
- compliance/suppression rules

Asterisk will be responsible for:

- originating SIP calls
- call state
- audio playback
- DTMF detection
- bridging calls
- hangup control
- SIP trunk connectivity

## Target flow

Co Pilot Collections
    ->
Co Pilot Dialer Gateway
    ->
Asterisk
    ->
Approved SIP Trunk
    ->
Public Telephone Network
    ->
Consumer
    ->
Recorded Message / Press 1
    ->
RingCentral Collector Queue

## Migration rule

Do not remove the existing Twilio implementation until the Asterisk path is independently tested.

During development:

1. Existing Twilio code remains untouched.
2. Asterisk integration is built alongside it.
3. Provider selection is explicit.
4. Production cutover happens only after successful controlled testing.

## Security

Asterisk must never be exposed as an unauthenticated public dialing endpoint.

The future dialer gateway must authenticate every originate request and restrict:

- destination format
- caller identity
- campaign ownership
- rate
- concurrency
- allowed transfer numbers
