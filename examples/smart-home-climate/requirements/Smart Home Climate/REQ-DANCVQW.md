---
id: REQ-DANCVQW
type: use-case
title: "UC: Display access tokens with the watchdog"
status: Approved
owner: S. Adel
tags:
  - safety
parent: REQ-AJ8BM92
order: aE
links:
  - type: relates-to
    target: REQ-ZWYXZAV
    confirmed: 2dd8b456c321
---
**Actor:** home owner

**Main flow**
1. The user opens the watchdog.
2. The user changes access tokens.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
