---
id: REQ-JSS8NYQ
type: use-case
title: "UC: Report humidity values with the OTA server"
status: Review
owner: H. Fathy
parent: REQ-N3NG8TT
order: aE
links:
  - type: relates-to
    target: REQ-8V5RZGG
    confirmed: 28fb085544cc
---
**Actor:** home owner

**Main flow**
1. The user opens the OTA server.
2. The user changes the operating mode.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
