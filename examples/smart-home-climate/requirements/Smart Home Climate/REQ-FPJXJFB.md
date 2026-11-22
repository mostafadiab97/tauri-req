---
id: REQ-FPJXJFB
type: test-case
title: "Regression: Notification service synchronises humidity values"
status: Approved
priority: Medium
owner: H. Fathy
tags:
  - regulatory
  - customer-request
parent: REQ-B69342G
order: b0C
links:
  - type: verifies
    target: REQ-JAMSS27
    confirmed: df6cf4d22dad
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 24 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Display the set point and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
