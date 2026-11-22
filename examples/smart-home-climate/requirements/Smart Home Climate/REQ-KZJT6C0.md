---
id: REQ-KZJT6C0
type: test-case
title: "Regression: Main PCB validates sensor readings"
status: Approved
priority: Medium
owner: É. Laurent
tags:
  - release-2.0
  - regulatory
  - security
parent: REQ-B69342G
order: b1a
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
2. Notify energy consumption and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
