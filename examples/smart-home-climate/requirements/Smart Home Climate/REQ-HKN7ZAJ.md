---
id: REQ-HKN7ZAJ
type: use-case
title: "UC: Log safety limits with the regulation loop"
status: Review
priority: Medium
owner: Y. Saber
parent: REQ-J96VY48
order: aG
links:
  - type: relates-to
    target: REQ-KC0HFPA
    confirmed: aa5e4143dbe7
---
**Actor:** home owner

**Main flow**
1. The user opens the regulation loop.
2. The user changes the connection state.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
