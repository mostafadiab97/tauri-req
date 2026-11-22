---
id: REQ-19PMW27
type: use-case
title: "UC: Restore the set point with the notification service"
status: Approved
priority: High
owner: N. Kamal
parent: REQ-M95KQCN
order: aE
links:
  - type: relates-to
    target: REQ-R16XR1E
    confirmed: 6e2078da20fa
---
**Actor:** home owner

**Main flow**
1. The user opens the notification service.
2. The user changes access tokens.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
