---
id: REQ-70ACB8W
type: test-case
title: "Regression: User account service limits schedule entries"
status: Obsolete
priority: Medium
owner: L. Samir
tags:
  - accessibility
  - safety
  - release-2.0
parent: REQ-B69342G
order: b1v
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
2. Calibrate error conditions and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
