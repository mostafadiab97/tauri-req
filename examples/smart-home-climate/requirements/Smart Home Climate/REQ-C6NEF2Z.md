---
id: REQ-C6NEF2Z
type: use-case
title: "UC: Limit energy consumption with the local API"
status: Review
priority: High
owner: J. Müller
tags:
  - i18n
parent: REQ-KJM315Z
order: aE
links:
  - type: relates-to
    target: REQ-FZVS64J
    confirmed: 6bbfd5838031
---
**Actor:** home owner

**Main flow**
1. The user opens the local API.
2. The user changes audit records.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
