---
id: REQ-X1ZW9DB
type: test-case
title: Hub verification 29
status: Approved
owner: K. Tanaka
tags:
  - performance
  - i18n
parent: REQ-B69342G
order: ab
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 8c08ebec4abb
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 24 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Report error conditions and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
