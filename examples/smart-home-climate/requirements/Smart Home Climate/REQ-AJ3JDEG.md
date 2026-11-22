---
id: REQ-AJ3JDEG
type: test-case
title: Hub verification 17
status: Draft
owner: M. Farouk
tags:
  - i18n
  - connectivity
  - regulatory
parent: REQ-B69342G
order: aP
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 8c08ebec4abb
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 21 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Calibrate relay events and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
