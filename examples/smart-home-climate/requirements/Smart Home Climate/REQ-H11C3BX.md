---
id: REQ-H11C3BX
type: test-case
title: "Verify: Tamper detection detects sensor readings"
status: Draft
priority: Medium
parent: REQ-F5M0G3H
order: a0
links:
  - type: verifies
    target: REQ-N4KW55Q
    confirmed: 6fd1a8b2565c
  - type: verifies
    target: REQ-CZWW3BV
    confirmed: 89b09064d46f
---
**Objective:** verify that the tamper detection behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the tamper detection with default settings.
2. Limit energy consumption and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
