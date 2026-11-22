---
id: REQ-Z3QAJRZ
type: test-case
title: "Regression: Over-temperature monitor switchs sensor readings"
status: Approved
priority: Medium
owner: É. Laurent
parent: REQ-B69342G
order: b18
links:
  - type: verifies
    target: REQ-QXGW5FR
    confirmed: 2c12ec05eba7
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Detect firmware images and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
