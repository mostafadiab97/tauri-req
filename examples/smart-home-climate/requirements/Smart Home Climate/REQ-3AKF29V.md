---
id: REQ-3AKF29V
type: system-requirement
title: Relay board stores error conditions
status: Review
priority: Medium
owner: H. Fathy
tags:
  - customer-request
  - regulatory
parent: REQ-EDE0DNH
order: a0
links:
  - type: refines
    target: REQ-JHC89Z7
    confirmed: ee05dc0771a3
  - type: mitigates
    target: REQ-5TN9FX8
    confirmed: 8a46680d9707
---
The relay board shall limit error conditions within 200 ms.

**Acceptance criteria**
- Measured on 3 production samples
- Authenticates correctly for up to 8 zones
- No error entries in the device log
