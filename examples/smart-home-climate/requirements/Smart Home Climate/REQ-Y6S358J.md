---
id: REQ-Y6S358J
type: use-case
title: "UC: Switch access tokens with the boiler interface"
status: Approved
priority: Medium
owner: H. Fathy
tags:
  - EMC
  - i18n
parent: REQ-J96VY48
order: aE
links:
  - type: relates-to
    target: REQ-ANZRG6K
    confirmed: 8a56cb48b6c3
---
**Actor:** home owner

**Main flow**
1. The user opens the boiler interface.
2. The user changes user preferences.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
