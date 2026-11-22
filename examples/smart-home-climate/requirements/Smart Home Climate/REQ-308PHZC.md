---
id: REQ-308PHZC
type: test-case
title: "Regression: User account service limits schedule entries"
status: Draft
priority: Medium
owner: Y. Saber
parent: REQ-B69342G
order: b2L
links:
  - type: verifies
    target: REQ-YJR0PV7
    confirmed: 32afdf3f5d82
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 21 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Notify energy consumption and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
