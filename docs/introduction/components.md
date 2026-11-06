# Components

The OCG is made up of specialized stores and a semantic network that ties them together. This page gives a high-level overview. A detailed description is available in the Architecture section.

## The stores

Each store uses a storage engine matched to its workload. They cannot be collapsed into a single engine without degrading all of them.

| Store                             | What it holds                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| **Infrastructure Knowledge Base** | Inventory, configuration baselines, and component definitions                            |
| **Document Library**              | Runbooks and operational policy documents                                                |
| **Telemetry Store**               | Time-series metrics, logs, and traces from all data center systems                       |
| **Insights Repository**           | Analysis results and recommendations written by analytics consumers                      |
| **Recorded Actions Repository**   | Immutable, tamper-evident record of every manual and automated action                    |
| **Semantic Network**              | Property graph, vector index, and temporal index of all entities and their relationships |
| **Secrets Vault**                 | Credentials, API keys, and certificates                                                  |
| **Audit Log Service**             | Authentication, authorization, data access, and component lifecycle events               |

## The semantic network

The OCG's most important derived output is the **semantic network** - a continuously maintained map of the data center. It represents every infrastructure entity as a node in a directed graph. Typed edges connect them: `RUNS_ON`, `DEPENDS_ON`, `RESOLVED_BY`, and others.

The OCG builds and maintains this map automatically from the raw data across all stores. Consuming systems query it; they do not write to it directly.

The semantic network lets consumers answer questions such as: "Which services does this failing server host?", "What changed in the hour before this incident?", or "Which runbook has resolved a similar failure before?"

## Access

No component accesses the underlying stores directly. All components connect through the OCG's standard API. Access is service-account-based with least-privilege permissions.
