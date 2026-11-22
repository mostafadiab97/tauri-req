---
id: REQ-GDNTPGF
type: test-case
title: "Regression: Tamper detection detects sensor readings"
status: Draft
priority: Medium
owner: K. Tanaka
tags:
  - release-2.0
  - regulatory
  - customer-request
parent: REQ-B69342G
order: b2S
links:
  - type: verifies
    target: REQ-N4KW55Q
    confirmed: 6fd1a8b2565c
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Restore energy consumption and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
