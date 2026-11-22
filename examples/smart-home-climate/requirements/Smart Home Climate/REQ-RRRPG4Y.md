---
id: REQ-RRRPG4Y
type: defect
title: "Defect: local API does not detect access tokens"
status: Approved
priority: Medium
tags:
  - connectivity
parent: REQ-31R7Q34
order: a0
links:
  - type: relates-to
    target: REQ-7FTFE9G
    confirmed: 0e4c34625fa6
  - type: relates-to
    target: REQ-Y6F6G8Q
    confirmed: 8a058aaa1b53
---
Found during regression testing of build 2.3.22.

**Observed:** the local API did not limit the set point.
**Expected:** The local API shall report user preferences after a power loss.

```
ERR 0x0b7f at local_API.c:883
```
