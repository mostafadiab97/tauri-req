---
id: REQ-PHGEKCE
type: test-case
title: "Regression: Cloud backend limits firmware images"
status: Draft
priority: High
owner: N. Kamal
tags:
  - cost
parent: REQ-B69342G
order: b0t
links:
  - type: verifies
    target: REQ-G8QZJW8
    confirmed: e8d8227d66fc
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 25 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Switch relay events and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
