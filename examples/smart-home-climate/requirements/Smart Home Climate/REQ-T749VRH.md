---
id: REQ-T749VRH
type: test-case
title: "Regression: Relay board stores error conditions"
status: Approved
priority: Low
owner: M. Farouk
parent: REQ-B69342G
order: b0M
links:
  - type: verifies
    target: REQ-3AKF29V
    confirmed: e955400bcb3b
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 25 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Restore humidity values and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
