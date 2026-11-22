---
id: REQ-ZNRNDYP
type: test-case
title: "Verify: User account service limits schedule entries"
status: Approved
tags:
  - customer-request
  - ux
  - cost
parent: REQ-VEKDQA9
order: a1
links:
  - type: verifies
    target: REQ-YJR0PV7
    confirmed: 32afdf3f5d82
  - type: verifies
    target: REQ-2Q43XD1
    confirmed: 0373ba116ecf
---
**Objective:** verify that the user account service behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 20 °C ± 1 °C

**Steps**
1. Configure the user account service with default settings.
2. Log relay events and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
