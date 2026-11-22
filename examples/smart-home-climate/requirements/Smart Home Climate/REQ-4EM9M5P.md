---
id: REQ-4EM9M5P
type: test-case
title: "Regression: Heating controller synchronises safety limits"
status: Draft
priority: Low
owner: A. Hassan
tags:
  - release-1.0
parent: REQ-B69342G
order: b1i
links:
  - type: verifies
    target: REQ-CT5MG99
    confirmed: ba9b4f21444e
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 22 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Limit the connection state and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
