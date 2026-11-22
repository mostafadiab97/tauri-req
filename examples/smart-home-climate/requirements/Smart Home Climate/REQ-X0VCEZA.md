---
id: REQ-X0VCEZA
type: test-case
title: "Regression: Touch display authenticates the operating mode"
status: Draft
priority: High
owner: A. Hassan
parent: REQ-B69342G
order: b0H
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
2. Measure schedule entries and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
