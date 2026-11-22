---
id: REQ-ZVJ5P1H
type: test-case
title: "Regression: Notification service synchronises humidity values"
status: Review
priority: Medium
owner: A. Hassan
tags:
  - ux
parent: REQ-B69342G
order: b2R
links:
  - type: verifies
    target: REQ-JAMSS27
    confirmed: df6cf4d22dad
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 20 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Limit audit records and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
