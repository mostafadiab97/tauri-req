---
id: REQ-VHM7VBB
type: test-case
title: "Regression: User account service limits schedule entries"
status: Obsolete
priority: Medium
owner: A. Hassan
tags:
  - security
parent: REQ-B69342G
order: b1P
links:
  - type: verifies
    target: REQ-YJR0PV7
    confirmed: 32afdf3f5d82
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 23 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Encrypt firmware images and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
