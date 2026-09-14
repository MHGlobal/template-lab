# RS Storage Full Audit Harness

This directory belongs to the public runner audit harness only. The RS Storage private repository remains the source of truth and is checked out read-only during workflow execution.

Audit policy:
- use public GitHub-hosted runners where technically possible;
- never publish the private source as an artifact;
- automated tests alone cannot complete the audit;
- Android and Web screenshots/videos are required evidence for later audit waves;
- visual evidence must be reviewed before the final audit gate can pass;
- physical-device-only networking tests remain mandatory for Wi-Fi Direct, hotspot, RF and mobile-data routing behavior.
