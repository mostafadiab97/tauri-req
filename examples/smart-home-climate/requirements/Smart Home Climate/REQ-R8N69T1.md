---
id: REQ-R8N69T1
type: test-case
title: Hub verification 4
status: Draft
priority: Medium
owner: S. Adel
parent: REQ-B69342G
order: aC
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 4639507190ed
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 18 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Log schedule entries and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
