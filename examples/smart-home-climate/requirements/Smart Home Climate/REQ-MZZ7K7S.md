---
id: REQ-MZZ7K7S
type: test-case
title: "Regression: Notification service validates humidity values"
status: Approved
priority: Medium
owner: A. Hassan
tags:
  - release-1.0
  - customer-request
  - safety
parent: REQ-B69342G
order: b0S
links:
  - type: verifies
    target: REQ-32EN75V
    confirmed: 3f36222bb4ce
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 18 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Store relay events and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
