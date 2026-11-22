---
id: REQ-2VJTKZS
type: use-case
title: "UC: Display safety limits with the pairing process"
status: Review
priority: Medium
owner: Y. Saber
tags:
  - connectivity
parent: REQ-KJM315Z
order: aG
links:
  - type: relates-to
    target: REQ-FK6VTBH
    confirmed: da78cd2fe2f7
---
**Actor:** home owner

**Main flow**
1. The user opens the pairing process.
2. The user changes audit records.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
