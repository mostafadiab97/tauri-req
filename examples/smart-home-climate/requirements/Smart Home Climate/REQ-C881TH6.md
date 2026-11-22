---
id: REQ-C881TH6
type: test-case
title: "Regression: Heating controller synchronises safety limits"
status: Review
priority: High
owner: A. Hassan
parent: REQ-B69342G
order: b2X
links:
  - type: verifies
    target: REQ-CT5MG99
    confirmed: ba9b4f21444e
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 21 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Log error conditions and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
