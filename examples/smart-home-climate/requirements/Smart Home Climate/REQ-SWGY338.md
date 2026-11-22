---
id: REQ-SWGY338
type: hardware-requirement
title: Device registry reports the operating mode
status: Approved
priority: High
owner: É. Laurent
tags:
  - performance
  - release-2.0
parent: REQ-YJR0PV7
order: a0
links:
  - type: refines
    target: REQ-YJR0PV7
    confirmed: 32afdf3f5d82
---
The user account service shall store sensor readings when the network is unavailable.

**Acceptance criteria**
- Measured on 3 production samples
- Reports correctly below 0.5 W in standby
- No error entries in the device log
