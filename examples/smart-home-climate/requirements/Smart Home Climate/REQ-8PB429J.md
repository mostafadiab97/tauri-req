---
id: REQ-8PB429J
type: test-case
title: "Regression: Local API stores access tokens"
status: Review
priority: High
owner: A. Hassan
tags:
  - safety
  - power
  - security
parent: REQ-B69342G
order: b0h
links:
  - type: verifies
    target: REQ-Y6F6G8Q
    confirmed: 8a058aaa1b53
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 21 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Validate the set point and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
