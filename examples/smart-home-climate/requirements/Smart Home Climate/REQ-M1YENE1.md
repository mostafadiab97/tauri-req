---
id: REQ-M1YENE1
type: test-case
title: "Regression: Status LED reports firmware images"
status: Approved
tags:
  - EMC
  - connectivity
parent: REQ-B69342G
order: b1R
links:
  - type: verifies
    target: REQ-RWVZ2AE
    confirmed: e1289f82812f
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 20 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Detect relay events and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
