CO PILOT COLLECTIONS MANAGER — LIVE NMI EMPLOYEE → ADMIN APPROVAL QUEUE R8N17

PURPOSE
Employees may securely enter authorized payment information, but they cannot run a card.
Only a LIVE administrator can approve and process the exact submitted amount.

SECURE FLOW
1. Employee opens Secure Card Payment (NMI).
2. Employee enters the exact authorized amount and NMI-hosted card fields.
3. Submit for Admin Approval creates a temporary NMI Customer Vault reference.
4. No charge occurs and the account balance does not change.
5. Administrator opens Payment Approvals.
6. Approve & Process sends the exact amount to NMI.
7. Approved sales post to the ledger, balance, receipts, remittance, activity, and statistics.
8. Declined, cancelled, expired, approved, and gateway-declined requests delete the temporary vault reference.

SERVER ENFORCEMENT
- Employees are rejected if they call the sale action directly.
- Only administrators can approve, decline, run sales, void, or refund.
- Employees can submit only for accounts assigned to them.
- Approval amount cannot be increased or edited.
- Full card number and CVV never enter Co Pilot or Supabase.
- The NMI vault ID never returns to the browser.
- Requests expire after 24 hours by default.

INSTALL ORDER
1. Upload the package files to co-pilot-collections-live.
2. PRESERVE your existing public/nmi-config.js. This ZIP intentionally does not include it.
3. Run SQL_TO_RUN_IN_SUPABASE/RUN_THIS_NMI_ADMIN_APPROVAL_QUEUE_R8N17.sql in LIVE Supabase.
4. Replace the LIVE nmi-payments Edge Function with supabase/functions/nmi-payments/index.ts.
5. Replace the LIVE nmi-webhook Edge Function with supabase/functions/nmi-webhook/index.ts.
6. Keep Verify JWT OFF for both functions.
7. Existing secrets remain unchanged:
   NMI_PRIVATE_API_KEY
   NMI_WEBHOOK_SIGNING_KEY
8. Hard refresh the LIVE site and confirm R8N17 LIVE.

OPTIONAL
Set the Supabase Edge Function secret NMI_APPROVAL_TTL_HOURS to 1–72. Default is 24.

TEST
- Employee: submit a small authorized payment request. Confirm no NMI sale and no balance change.
- Admin: open Approvals, approve the request, and confirm one NMI sale and one ledger entry.
- Employee direct sale attempts must return 403.
- Declining a request must show no sale in NMI.
