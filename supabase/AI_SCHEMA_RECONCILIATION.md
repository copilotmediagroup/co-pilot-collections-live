# AI schema reconciliation

LIVE Supabase project: `bwvufgzbkaymffwxuuzr`

The following migrations exist in LIVE but are not yet represented as SQL files in this repository. Do not fabricate historical migration contents. Reconcile from inspected LIVE definitions and add an idempotent baseline before declaring AI calling production-ready.

- 20260929145645 add_isolated_ai_call_qa
- 20260929150019 add_ai_call_qa_classification
- 20260929152357 add_ai_collector_script_profiles
- 20260929152845 add_account_communication_compliance
- 20260929155524 add_ai_real_call_attempts
- 20260929160307 add_atomic_ai_call_authorization
- 20260929213457 add_ai_provider_send_feature_flag
- 20260929213508 add_atomic_ai_send_claim
- 20260929213718 add_atomic_ai_provider_result_update
- 20260929215013 add_atomic_ai_send_finalize
- 20260929215029 fix_ai_send_finalize_call_results_link
- 20260929215050 add_ai_queue_recovery_rpc
- 20261001013214 seed_federal_ai_call_disclosure_baseline
- 20261001014801 add_ai_collector_conversation_policy
- 20261001015722 add_ai_identity_verification_policy
- 20261001024454 add_ai_send_unknown_state

Current AI tables verified in LIVE:
- ai_call_qa
- ai_collector_script_profiles
- account_communication_compliance
- ai_real_call_attempts
- ai_call_runtime_config

Current AI RPCs verified in LIVE:
- cpcm_authorize_ai_call_attempt
- cpcm_claim_ai_call_send
- cpcm_apply_ai_provider_result
- cpcm_finalize_ai_call_send
- cpcm_fail_ai_call_send
- cpcm_recover_ai_queued_call
- cpcm_mark_ai_send_unknown

Production rule: LIVE remains authoritative until the repo baseline is reconstructed from inspected definitions and verified against a disposable/fresh schema. Do not replay guessed historical SQL against LIVE.
