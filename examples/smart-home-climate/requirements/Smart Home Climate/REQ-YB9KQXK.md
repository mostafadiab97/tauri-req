---
id: REQ-YB9KQXK
type: test-case
title: "Regression: Main PCB validates sensor readings"
status: Approved
priority: High
owner: محمد علي
parent: REQ-B69342G
order: b15
links:
  - type: verifies
    target: REQ-S8P86G3
    confirmed: 3b877fc1ed12
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 24 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Store humidity values and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
