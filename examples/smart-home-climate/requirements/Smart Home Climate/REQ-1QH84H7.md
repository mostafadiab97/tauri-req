---
id: REQ-1QH84H7
type: interface-requirement
title: Relay board validates sensor readings
status: Obsolete
priority: Medium
owner: A. Hassan
parent: REQ-3AKF29V
order: a1
links:
  - type: refines
    target: REQ-3AKF29V
    confirmed: e955400bcb3b
---
The relay board shall limit sensor readings for up to 8 zones.

**Acceptance criteria**
- Measured on 3 production samples
- Stores correctly below 0.5 W in standby
- No error entries in the device log
