---
id: REQ-NTJF98Y
type: software-requirement
title: Notification service validates firmware images
status: Review
owner: J. Müller
parent: REQ-JAMSS27
order: a2
links:
  - type: refines
    target: REQ-JAMSS27
    confirmed: df6cf4d22dad
---
The notification service shall store humidity values in under 3 s.

**Acceptance criteria**
- Measured on 3 production samples
- Authenticates correctly in under 3 s
- No error entries in the device log
