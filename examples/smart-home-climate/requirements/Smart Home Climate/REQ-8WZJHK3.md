---
id: REQ-8WZJHK3
type: use-case
title: "UC: Measure safety limits with the heating controller"
status: Review
priority: High
owner: Y. Saber
tags:
  - i18n
  - power
parent: REQ-J96VY48
order: aD
links:
  - type: relates-to
    target: REQ-MTJR6NX
    confirmed: b8a4c00165fe
---
**Actor:** home owner

**Main flow**
1. The user opens the heating controller.
2. The user changes humidity values.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
