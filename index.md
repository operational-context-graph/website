---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Operational Context Graph"
  text: "Understand the semantics of your infrastructure."
  tagline: "Connect the dots. Act with confidence."
  image:
    src: "./assets/img/logo/operational-context-graph-icon-color.svg"
    alt: "Operational Context Graph logo"

features:
  - icon: Layers
    title: Ingest from any source
    details: Collect inventory and telemetry via OpenTelemetry (OTLP) and native protocols. Normalize data from any infrastructure source into a unified model.
    link: /docs/architecture/data-ingestion/
  - icon: Network
    title: Semantic infrastructure graph
    details: Model your infrastructure as a connected graph of entities and relationships. Query dependencies, correlate signals, and reason about your operational state.
    link: /docs/introduction/components
  - icon: Globe
    title: Foundation for any domain
    details: Use OCG as a shared data foundation across your organization. Power incident response, sustainability reporting, capacity planning, compliance, and any workflow that needs rich infrastructure context.
    link: /docs/introduction/motivation
---
