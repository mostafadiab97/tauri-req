---
id: REQ-S90WER3
type: test-case
title: "Regression: Heating controller synchronises safety limits"
status: Approved
priority: Medium
owner: N. Kamal
parent: REQ-B69342G
order: b23
links:
  - type: verifies
    target: REQ-CT5MG99
    confirmed: ba9b4f21444e
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Report the set point and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
