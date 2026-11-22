---
id: REQ-09SBTX2
type: use-case
title: "UC: Calibrate the set point with the relay board"
status: Approved
priority: Medium
owner: Y. Saber
tags:
  - power
parent: REQ-1G75ENR
order: aC
links:
  - type: relates-to
    target: REQ-0989G57
    confirmed: f334dd4c5b6f
---
**Actor:** home owner

**Main flow**
1. The user opens the relay board.
2. The user changes safety limits.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
