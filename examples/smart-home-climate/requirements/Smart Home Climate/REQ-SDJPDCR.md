---
id: REQ-SDJPDCR
type: test-case
title: "Regression: Notification service synchronises humidity values"
status: Draft
priority: Medium
owner: L. Samir
tags:
  - i18n
parent: REQ-B69342G
order: b12
links:
  - type: verifies
    target: REQ-JAMSS27
    confirmed: df6cf4d22dad
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 21 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Validate firmware images and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
