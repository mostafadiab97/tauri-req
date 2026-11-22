---
id: REQ-EMDKC58
type: use-case
title: "UC: Restore firmware images with the power supply"
status: Draft
priority: Medium
owner: M. Farouk
tags:
  - cost
  - i18n
  - accessibility
parent: REQ-1G75ENR
order: aF
links:
  - type: relates-to
    target: REQ-2C3NP09
    confirmed: 85705232c9a6
---
**Actor:** home owner

**Main flow**
1. The user opens the power supply.
2. The user changes safety limits.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
