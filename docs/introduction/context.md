# Context

## Autonomous operations

The OCG was created as part of the [Autonomous Operations framework (AO)](https://autonomous-operations.dev). The AO is a system that automates the detection and resolution of operational issues in a data center - anomaly detection, root cause analysis, workload optimization, and remediation - without requiring human intervention for routine tasks.

Autonomous operations requires many components to share a consistent, up-to-date picture of the data center. The OCG was built to be that shared foundation. Every component reads from it; no component maintains its own operational state.

## A standalone project

The OCG has since been extracted as a standalone project. The reasons are practical: a single, well-structured data store for a data center is valuable on its own, independent of the systems that consume it.

Organizations that are not ready for or not interested in full autonomous operations still benefit from having one authoritative data source. They can integrate it with purpose-built tools for sustainability, compliance, capacity planning, or general infrastructure observability.

## Use cases

The OCG is designed to support the following categories of use cases, though the current focus is on autonomous operations.

### Autonomous operations

The Insight and Automation Platform (IAP) reads from the OCG to detect anomalies, trace root causes, and drive autonomous remediation. It reads telemetry, semantic network state, prior analysis results, and operational policies. It writes findings back into the Insights Repository so future reasoning cycles can build on them.

### Sustainability and workload placement

Scheduling and placement systems use OCG data to decide where workloads run and when to move them. They combine capacity telemetry, physical topology, energy consumption data, and sustainability indicators to balance performance, cost, and environmental targets.

### Compliance and audit

Compliance consumers read the Recorded Actions Repository and Audit Log Service to produce regulatory and security audit evidence. Every action - manual or automated - is recorded in write-once storage with cryptographic chaining, making it tamper-evident.

### Infrastructure observability

Any system that needs a consistent, versioned view of the data center's infrastructure topology, configuration state, or operational history can query the OCG. The OCG maintains a temporal index, so consumers can reconstruct the data center's state at any past point in time.
