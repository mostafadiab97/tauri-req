---
id: REQ-62P3SHJ
type: use-case
title: "UC: Detect audit records with the Wi-Fi module"
status: Approved
owner: M. Farouk
tags:
  - power
parent: REQ-KJM315Z
order: aC
links:
  - type: relates-to
    target: REQ-8QGZ6Y1
    confirmed: 7053e135ce85
---
**Actor:** home owner

**Main flow**
1. The user opens the Wi-Fi module.
2. The user changes safety limits.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
