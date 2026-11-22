---
id: REQ-QTQH0SJ
type: hardware-requirement
title: Main PCB stores the operating mode
status: Draft
priority: Low
owner: Y. Saber
tags:
  - accessibility
parent: REQ-S8P86G3
order: a1
links:
  - type: refines
    target: REQ-S8P86G3
    confirmed: 3b877fc1ed12
---
The main PCB shall notify schedule entries for up to 8 zones.

**Acceptance criteria**
- Measured on 3 production samples
- Logs correctly within 200 ms
- No error entries in the device log
