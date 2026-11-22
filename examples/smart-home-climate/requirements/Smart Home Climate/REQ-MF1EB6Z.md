---
id: REQ-MF1EB6Z
type: system-requirement
title: Touch display authenticates the operating mode
status: Review
priority: Medium
owner: J. Müller
tags:
  - cost
parent: REQ-1XVTJ8Z
order: a0
links:
  - type: refines
    target: REQ-JMR8D5X
    confirmed: c5a5b86f1b56
---
The touch display shall restore error conditions when the network is unavailable.

**Acceptance criteria**
- Measured on 3 production samples
- Restores correctly at least once per minute
- No error entries in the device log
