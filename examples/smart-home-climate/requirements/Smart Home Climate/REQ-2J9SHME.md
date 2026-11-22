---
id: REQ-2J9SHME
type: use-case
title: "UC: Restore energy consumption with the watchdog"
status: Approved
owner: J. Müller
tags:
  - customer-request
parent: REQ-AJ8BM92
order: aF
links:
  - type: relates-to
    target: REQ-KMXN4QP
    confirmed: eb9f5e2dcfa2
---
**Actor:** home owner

**Main flow**
1. The user opens the watchdog.
2. The user changes firmware images.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
