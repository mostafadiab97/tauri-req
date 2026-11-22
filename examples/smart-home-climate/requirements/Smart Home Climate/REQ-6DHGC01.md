---
id: REQ-6DHGC01
type: test-case
title: Hub verification 19
status: Draft
priority: High
owner: Y. Saber
tags:
  - cost
  - customer-request
  - ux
parent: REQ-B69342G
order: aR
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 8c08ebec4abb
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 18 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Encrypt user preferences and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
