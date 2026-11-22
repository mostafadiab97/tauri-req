---
id: REQ-S45HFYR
type: test-case
title: "Verify: Relay board stores error conditions"
status: Approved
priority: High
owner: Y. Saber
parent: REQ-JKP73AN
order: a0
links:
  - type: verifies
    target: REQ-3AKF29V
    confirmed: e955400bcb3b
  - type: verifies
    target: REQ-VS9MVJ3
    confirmed: 12088e23f66b
---
**Objective:** verify that the relay board behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 22 °C ± 1 °C

**Steps**
1. Configure the relay board with default settings.
2. Notify energy consumption and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
