---
id: REQ-GYK88Q1
type: test-case
title: "Regression: Touch display authenticates the operating mode"
status: Approved
priority: High
tags:
  - release-1.0
parent: REQ-B69342G
order: b0d
links:
  - type: verifies
    target: REQ-MF1EB6Z
    confirmed: a4a5e02caf12
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 18 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Synchronise safety limits and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
