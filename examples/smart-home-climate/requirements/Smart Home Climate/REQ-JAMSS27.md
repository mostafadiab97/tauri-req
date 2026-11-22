---
id: REQ-JAMSS27
type: system-requirement
title: Notification service synchronises humidity values
status: Review
priority: Low
owner: J. Müller
parent: REQ-68PC6TZ
order: a1
links:
  - type: refines
    target: REQ-S1QMH2W
    confirmed: 75ff6afd36dc
  - type: mitigates
    target: REQ-NMSKCXH
    confirmed: 79fd37bbd290
---
The notification service shall display relay events after a power loss.

**Acceptance criteria**
- Measured on 3 production samples
- Logs correctly for at least 10 years
- No error entries in the device log
