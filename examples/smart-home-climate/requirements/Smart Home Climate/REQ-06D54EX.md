---
id: REQ-06D54EX
type: test-case
title: "Regression: Main PCB validates sensor readings"
status: Draft
priority: High
owner: محمد علي
parent: REQ-B69342G
order: b1T
links:
  - type: verifies
    target: REQ-S8P86G3
    confirmed: 3b877fc1ed12
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 23 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Display the connection state and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
