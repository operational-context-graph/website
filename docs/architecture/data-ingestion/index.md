# Data Ingestion

Data Ingestion is the write path into the Operational Context Graph (OCG). It takes data from connectors, filters and normalizes each record against the schemas in the Schema Registry, and forwards it to the store or repository that owns it. It is the single entry point that keeps every write consistent and attributed.

Data Ingestion turns raw connector output into clean, uniform records and places each in the correct store. It applies no business logic. Data Ingestion filters and normalizes against the registered schema, preserves source attribution, and records ingestion events for audit.

## Subpages

- [Ingestion Protocol](./ingestion-protocol.md) — interfaces connectors use to submit records
- [Data Ingestion Implementation](./ingestion-implementation.md) — internal pipeline: validation, normalization, and routing
- [OTLP Data Ingestion](./otlp-ingestion.md) — native OpenTelemetry Protocol write path
