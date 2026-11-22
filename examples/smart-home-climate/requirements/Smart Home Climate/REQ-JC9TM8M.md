---
id: REQ-JC9TM8M
type: test-case
title: "Regression: Heating controller synchronises safety limits"
status: Review
priority: Medium
tags:
  - power
parent: REQ-B69342G
order: b0v
links:
  - type: verifies
    target: REQ-CT5MG99
    confirmed: ba9b4f21444e
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 22 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Validate schedule entries and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
