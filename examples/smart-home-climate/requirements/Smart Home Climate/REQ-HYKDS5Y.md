---
id: REQ-HYKDS5Y
type: test-case
title: Hub verification 14
status: Draft
priority: Medium
owner: N. Kamal
tags:
  - performance
  - cost
  - accessibility
parent: REQ-B69342G
order: aM
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 8c08ebec4abb
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 22 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Validate schedule entries and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
