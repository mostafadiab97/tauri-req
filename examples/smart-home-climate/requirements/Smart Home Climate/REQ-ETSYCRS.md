---
id: REQ-ETSYCRS
type: use-case
title: "UC: Encrypt error conditions with the relay board"
status: Approved
priority: Medium
owner: R. Nabil
tags:
  - cost
parent: REQ-1G75ENR
order: aD
links:
  - type: relates-to
    target: REQ-A06FYG0
    confirmed: e091269171bd
---
**Actor:** home owner

**Main flow**
1. The user opens the relay board.
2. The user changes safety limits.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
