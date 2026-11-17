---
title: Getting Started
---

# Getting Started

This guide walks you through deploying the Operational Context Graph (OCG) on your own Kubernetes cluster. It targets the **first milestone release (0.0.1)** of the open-source repository.

> **Release link:** The 0.0.1 GitHub release and container images will be linked here once the tag is published. Track progress in the [operational-context-graph repository](https://github.com/operational-context-graph/operational-context-graph).

## Prerequisites

### Tools

- [`kubectl`](https://kubernetes.io/docs/tasks/tools/) configured against your target cluster
- [`helm`](https://helm.sh/docs/intro/install/) v3

### Cluster

- Kubernetes **1.27 or later**
- A default storage class that supports `ReadWriteOnce` volumes

### Access

- Access to a [NetBox](https://netbox.dev) instance reachable from the cluster, with a read-only API token
- No container registry authentication is required. All OCG images are published publicly to `ghcr.io/operational-context-graph`.

## Resource requirements

The following table lists the minimum resource requests for a functional deployment. These are drawn directly from the default Helm values.

| Component         | CPU request | Memory request | Storage                          |
| ----------------- | ----------- | -------------- | -------------------------------- |
| Doris FE          | 2           | 4 Gi           | 5 Gi (meta) + 5 Gi (log)         |
| Doris BE          | 4           | 8 Gi           | 20 Gi (storage) + 5 Gi (log)     |
| PostgreSQL        | —           | —              | 10 Gi                            |
| data-ingestion    | —           | —              | —                                |
| inventory-store   | —           | —              | —                                |
| telemetry-store   | —           | —              | —                                |

**Recommended minimum:** 12 CPU / 24 Gi RAM / 45 Gi persistent storage across the cluster.

## Step 1 — Install the Doris Operator (once per cluster)

The Doris Operator manages the Doris FE and BE StatefulSets. Install it once into its own namespace before deploying OCG.

```sh
helm install doris-operator \
  oci://registry-1.docker.io/selectdb/doris-operator \
  --version 25.8.0 \
  --namespace doris-operator \
  --create-namespace
```

Wait until the operator pod is `Running` before continuing.

```sh
kubectl get pods -n doris-operator
```

## Step 2 — Create a namespace and secrets

Create a dedicated namespace for OCG. Replace `<your-namespace>` with the namespace you want to use throughout this guide.

```sh
kubectl create namespace <your-namespace>
```

Create the PostgreSQL password secret. OCG uses this for the data-ingestion and inventory-store services.

```sh
kubectl create secret generic postgres-secret \
  --from-literal=password=<your-postgres-password> \
  -n <your-namespace> --dry-run=client -o yaml | kubectl apply -f -
```

Create the NetBox API token secret. The inventory connector uses this to authenticate with NetBox.

```sh
kubectl create secret generic netbox-token \
  --from-literal=token=<your-netbox-token> \
  -n <your-namespace> --dry-run=client -o yaml | kubectl apply -f -
```

## Step 3 — Clone the repository and deploy OCG without the telemetry store

Clone the repository at the 0.0.1 release tag.

```sh
git clone --depth 1 --branch 0.0.1 \
  https://github.com/operational-context-graph/operational-context-graph.git
cd operational-context-graph
```

Install the chart with `telemetry-store` disabled. The Doris root password is not yet set, so the telemetry-store secrets cannot be created at this point.

```sh
helm upgrade --install ocg helm/ \
  --namespace <your-namespace> \
  --set telemetry-store.enabled=false \
  --set inventory-connector.netbox.baseURL=<your-netbox-url>
```

Wait until the Doris cluster is healthy. FE must show `Available` and BE must show `Alive=true`.

```sh
kubectl get doriscluster -n <your-namespace>
```

## Step 4 — Set the Doris root password and create telemetry-store secrets

Once the Doris cluster is healthy, set the root password and create the three secrets the telemetry-store needs.

> **Note:** The telemetry-store currently connects to Doris using the `root` account. Dedicated read and write users are not yet provisioned by the chart. This will be addressed in a future release.

```sh
kubectl exec -n <your-namespace> ocg-doris-fe-0 \
  -- mysql -h 127.0.0.1 -P 9030 -u root \
  -e "SET PASSWORD FOR 'root'@'%' = PASSWORD('<your-doris-password>');"
```

```sh
kubectl create secret generic telemetry-store-doris-secret \
  --from-literal=DORIS_STREAM_LOAD_URL="http://ocg-doris-fe-service:8030" \
  --from-literal=DORIS_STREAM_LOAD_USER="root" \
  --from-literal=DORIS_STREAM_LOAD_PASSWORD="<your-doris-password>" \
  -n <your-namespace> --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic telemetry-store-doris-read-secret \
  --from-literal=DORIS_DSN="root:<your-doris-password>@tcp(ocg-doris-fe-service:9030)/" \
  -n <your-namespace> --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic telemetry-store-doris-ddl-secret \
  --from-literal=DORIS_MIGRATE_DSN="root:<your-doris-password>@tcp(ocg-doris-fe-service:9030)/" \
  -n <your-namespace> --dry-run=client -o yaml | kubectl apply -f -
```

## Step 5 — Enable the telemetry store and upgrade

Run this from the cloned repository directory.

```sh
helm upgrade --install ocg helm/ \
  --namespace <your-namespace> \
  --set inventory-connector.netbox.baseURL=<your-netbox-url>
```

## Verify the deployment

Check that all pods are running.

```sh
kubectl get pods -n <your-namespace>
```

Verify the Doris cluster state.

```sh
kubectl get doriscluster -n <your-namespace>
```

Check the health of the core services using port-forward and curl.

```sh
# data-ingestion
kubectl port-forward -n <your-namespace> svc/ocg-data-ingestion 8080:8080 &
curl -sf http://localhost:8080/healthz && echo "data-ingestion: ok"

# inventory-store
kubectl port-forward -n <your-namespace> svc/ocg-inventory-store 8081:8080 &
curl -sf http://localhost:8081/health && echo "inventory-store: ok"

# telemetry-store
kubectl port-forward -n <your-namespace> svc/ocg-telemetry-store 8082:8080 &
curl -sf http://localhost:8082/healthz && echo "telemetry-store: ok"
```

Each service returns `{"status":"ok"}` when healthy.

## Next steps

- **Send telemetry** — See [OTLP Ingestion](../architecture/data-ingestion/otlp-ingestion) to push metrics, logs, and traces into the telemetry store.
- **Report issues** — Use the [GitHub issue tracker](https://github.com/operational-context-graph/operational-context-graph/issues).
- **Contribute** — See the [Contribution Guidelines](https://github.com/operational-context-graph/.github/blob/main/CONTRIBUTING.md).
