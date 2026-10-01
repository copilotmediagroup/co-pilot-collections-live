# Co Pilot Bland Collector Pathway V1

Status: provider configuration specification. Real provider send remains kill-switched OFF.

## Call-start request_data
Before identity verification allow only: first_name, attempt_id, verification_token.
Do not preload creditor, debt type, balance, account number, address, ZIP, SSN, DOB, bank/card data, or account-existence details.

## Flow
1. Intended person — ask for first_name only. If third party/unavailable, end without debt disclosure.
2. ZIP verification — collect mailing_zip_code and POST attempt_id, verification_token, mailing_zip_code to the bland-verify-identity Edge Function. Route on verified/locked/remaining_attempts. Permit at most one retry.
3. Verified context — POST attempt_id and verification_token to bland-verified-context. If authorized is not true, end/human review without debt disclosure.
4. Required disclosure — speak the returned disclosure exactly before substantive debt discussion.
5. Account conversation — use only returned creditor, debt type, current balance, and conversation policy. Never request SSN, DOB, bank/routing, card/security code, passwords, or security answers. Never invent settlement or payment-plan terms.
6. Outcomes — POST verified events to bland-conversation-outcome. Supported: dispute, stop_calling, callback_request, payment_plan_interest, settlement_request, already_paid, cannot_pay, human_requested, wrong_number, conversation_note. All remain requires_human_review=true.
7. End politely. Post-call lifecycle continues through bland-call-status. Recording remains OFF unless separately designed and approved.

## Failure rules
Webhook timeout/error fails closed. Two failed ZIP attempts lock the attempt. Context denial means no debt disclosure. Human-requested/uncertain branches stop substantive negotiation. Never automatically retry an ambiguous outbound provider send.

## Production prerequisites
Collector profile explicitly approved; production caller ID verified/enabled; Bland Pathway created and tested against this contract; synthetic Pathway test passes; real-provider kill switch remains OFF until controlled pilot authorization.
