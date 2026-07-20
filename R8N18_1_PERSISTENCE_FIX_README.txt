CO PILOT COLLECTIONS MANAGER — R8N18.1 LIVE
DIALER PERSISTENCE FIX

WHY THIS REPAIR EXISTS
The earlier R8N18 package contained the RingCentral SQL and Edge Functions, but its root index.html still contained the R8N17 frontend. A temporary Bolt preview could show a dialer change, then a browser reload restored the saved older frontend and the Dialer disappeared.

WHAT R8N18.1 FIXES
- Adds the persistent RingCentral Dialer button to the top navigation and left rail.
- Re-inserts the button after application role/UI refreshes so it stays after reload.
- Adds the Admin Campaigns, RingCentral Setup, Live Monitor, and Agent Console screens.
- Builds campaigns from phone numbers already stored on uploaded accounts.
- Adds collector availability, next-call dispatch, screen-pop polling, call timer, and required wrap-up.
- Saves dialer dispositions into the existing account/activity system.
- Preserves NMI and all R8N17 functionality.

UPLOAD
Upload the CONTENTS of this package to the ROOT of co-pilot-collections-live.
Preserve the existing public/nmi-config.js already in GitHub.
The visible version badge must read:
STABLE_SINGLE_FILE_QA_LOCK_2026_07_20_R8N18_1 • LIVE
