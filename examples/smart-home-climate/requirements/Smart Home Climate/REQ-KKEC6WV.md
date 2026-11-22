---
id: REQ-KKEC6WV
type: hardware-requirement
title: User account service limits energy consumption
status: Approved
priority: Medium
owner: É. Laurent
tags:
  - safety
  - security
  - customer-request
parent: REQ-G8QZJW8
order: a1
links:
  - type: refines
    target: REQ-G8QZJW8
    confirmed: e8d8227d66fc
---
The cloud backend shall report sensor readings in under 3 s.

**Acceptance criteria**
- Measured on 3 production samples
- Displays correctly below 0.5 W in standby
- No error entries in the device log
