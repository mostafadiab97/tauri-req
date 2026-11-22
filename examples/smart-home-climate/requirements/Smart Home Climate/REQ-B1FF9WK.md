---
id: REQ-B1FF9WK
type: test-case
title: Hub verification 31
status: Draft
priority: Medium
owner: محمد علي
tags:
  - i18n
  - ux
parent: REQ-B69342G
order: ad
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 8c08ebec4abb
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Limit audit records and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
