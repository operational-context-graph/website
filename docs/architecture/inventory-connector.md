# Inventory Connector

The Inventory Connector ingests static or slowly changing asset data into the OCG. It reads from external inventory systems, transforms records into OCG-compatible representations, and writes them into the Infrastructure Knowledge Base through Data Ingestion. It keeps the central inventory synchronized with external systems of record.

For now the Inventory Connector reads raw inventory records from NetBox and delivers them to [Data Ingestion](./data-ingestion/) via the `IngestionService` gRPC interface.

The connector runs as a Kubernetes `Job`. Each run pages all configured NetBox endpoints, wraps each record in a `MessageEnvelope`, and publishes the batch. It covers the internal component structure, run sequence, partition and watermark shape, batching, authentication, observability, configuration, and deployment.

The connector does not manage watermarks itself. It embeds a partition key and a watermark value in each envelope and lets the OCG pipeline own the state.

## 1. Governing Decisions

### 1.1 Partition and watermark shape

The `IngestionService` interface requires each `MessageEnvelope` to carry a `partition` and a `watermark`. The Connector uses the NetBox integer `id` as the watermark value, and the endpoint path as the partition key.

## 2. Design Views

### 2.1 Context

The connector sits between NetBox and the OCG Data Ingestion service.

```mermaid
%%{init: {'flowchart': {'useMaxWidth': false}}}%%
flowchart LR
    NB["NetBox\n(DCIM/IPAM source)"]
    IC["Inventory Connector\n(Kubernetes Job)"]
    DI["Data Ingestion\n(IngestionService gRPC)"]
    VT["Secrets Vault\n(OpenBao)"]

    VT -->|"TLS cert+key\n(k8s secret mount)"| IC
    IC -->|"Paginated GET\n(HTTPS + token auth)"| NB
    NB -->|"[]json.RawMessage"| IC
    IC -->|"IngestionService.Ingest\n(gRPC / TLS)"| DI
```

### 2.2 Run sequence

Each run is a single pass over all configured endpoints. There is no partial retry - a failure at any point exits the run immediately.

```mermaid
%%{init: {'sequence': {'useMaxWidth': false}}}%%
sequenceDiagram
    participant K8s as Kubernetes Job
    participant Connector
    participant NetBox
    participant Publisher
    participant DI as Data Ingestion

    K8s->>Connector: start with mounted secrets and loaded config

    loop for each endpoint
        Connector->>NetBox: fetch records page by page
        NetBox-->>Connector: raw records
        note over Connector: wrap each record in a message envelope
        note over Connector: assign partition, watermark, and artifact type
        Connector->>Publisher: publish message envelopes
        loop per batch
            Publisher->>DI: ingest batch
            DI-->>Publisher: acknowledgement
        end
        alt unavailable
            Publisher-->>Connector: error
            Connector->>K8s: exit 1
        end
    end

    Connector->>K8s: exit 0 with summary log
```

### 2.3 Envelope batching

The `GRPCPublisher` accumulates envelopes and flushes each batch when either limit is reached:

- **1000 messages** per batch (record count limit)
- **4 MiB** per batch (size limit)

If Data Ingestion returns `UNAVAILABLE`, the run aborts and the Kubernetes Job controller retries the entire run.

### 2.4 Authentication and transport security

When `CONNECTOR_GRPC__CERT_FILE` and `CONNECTOR_GRPC__KEY_FILE` are set, the connector loads the X.509 client certificate and presents it on every gRPC call to Data Ingestion. Without them, the connection uses no TLS. The connector fails fast at startup if the files are configured but cannot be loaded.

NetBox communication uses HTTPS with a bearer token read from a mounted secret.
