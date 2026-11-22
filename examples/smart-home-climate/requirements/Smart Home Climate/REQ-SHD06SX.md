---
id: REQ-SHD06SX
type: test-case
title: "Regression: Heating controller validates safety limits"
status: Approved
priority: Medium
parent: REQ-B69342G
order: b09
links:
  - type: verifies
    target: REQ-XQTWYWP
    confirmed: 65adf430bd97
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 20 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Detect error conditions and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
