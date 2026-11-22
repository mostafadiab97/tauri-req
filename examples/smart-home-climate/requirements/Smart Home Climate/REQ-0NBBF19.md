---
id: REQ-0NBBF19
type: test-case
title: "Regression: Local API stores access tokens"
status: Approved
priority: High
owner: محمد علي
parent: REQ-B69342G
order: b0F
links:
  - type: verifies
    target: REQ-Y6F6G8Q
    confirmed: 8a058aaa1b53
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 23 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Switch user preferences and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
