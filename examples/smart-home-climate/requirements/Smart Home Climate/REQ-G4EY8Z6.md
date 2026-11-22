---
id: REQ-G4EY8Z6
type: test-case
title: "Regression: Local API stores access tokens"
status: Approved
priority: Medium
owner: محمد علي
parent: REQ-B69342G
order: b0P
links:
  - type: verifies
    target: REQ-Y6F6G8Q
    confirmed: 8a058aaa1b53
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Report the set point and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
