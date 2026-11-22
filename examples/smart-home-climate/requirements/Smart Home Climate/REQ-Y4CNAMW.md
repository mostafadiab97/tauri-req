---
id: REQ-Y4CNAMW
type: test-case
title: "Regression: Tamper detection detects sensor readings"
status: Obsolete
priority: Medium
tags:
  - release-1.0
parent: REQ-B69342G
order: b0i
links:
  - type: verifies
    target: REQ-N4KW55Q
    confirmed: 6fd1a8b2565c
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 25 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Encrypt humidity values and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
