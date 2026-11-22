---
id: REQ-8MKT8XF
type: test-case
title: "Regression: Tamper detection detects sensor readings"
status: Draft
priority: Medium
owner: N. Kamal
tags:
  - cost
  - safety
parent: REQ-B69342G
order: at
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
2. Synchronise firmware images and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
