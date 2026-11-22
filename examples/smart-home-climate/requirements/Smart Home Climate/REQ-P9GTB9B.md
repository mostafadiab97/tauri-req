---
id: REQ-P9GTB9B
type: use-case
title: "UC: Restore relay events with the mobile app"
status: Approved
owner: J. Müller
tags:
  - accessibility
  - safety
  - EMC
parent: REQ-M95KQCN
order: aF
links:
  - type: relates-to
    target: REQ-VJ4N4E2
    confirmed: 7e56ff23ea67
---
**Actor:** home owner

**Main flow**
1. The user opens the mobile app.
2. The user changes safety limits.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
