---
id: REQ-C3E8GWX
type: test-case
title: "Regression: Over-temperature monitor switchs sensor readings"
status: Review
priority: Medium
owner: N. Kamal
parent: REQ-B69342G
order: b0l
links:
  - type: verifies
    target: REQ-QXGW5FR
    confirmed: 2c12ec05eba7
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 22 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Display relay events and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
