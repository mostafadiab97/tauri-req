---
id: REQ-Y08XE5E
type: test-case
title: "Regression: Cloud backend limits firmware images"
status: Draft
priority: Medium
tags:
  - customer-request
parent: REQ-B69342G
order: b2J
links:
  - type: verifies
    target: REQ-G8QZJW8
    confirmed: e8d8227d66fc
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Display energy consumption and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
