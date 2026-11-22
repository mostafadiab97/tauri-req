---
id: REQ-KA8NECM
type: use-case
title: "UC: Switch access tokens with the Wi-Fi module"
status: Approved
owner: H. Fathy
tags:
  - security
  - performance
parent: REQ-KJM315Z
order: aF
links:
  - type: relates-to
    target: REQ-DHV2PRT
    confirmed: 28af65a937ba
---
**Actor:** home owner

**Main flow**
1. The user opens the Wi-Fi module.
2. The user changes the connection state.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
