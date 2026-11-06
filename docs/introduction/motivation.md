# Motivation

## The shared-state problem

Running a data center involves many systems. Each system needs an up-to-date picture of the environment to do its job. Without a shared store, each system maintains its own copy of the operational state.

Copies diverge. Divergence causes inconsistencies, blind spots, and conflicting decisions. A system acting on stale data can make the situation worse rather than better. In autonomous operations, where actions execute without human review, the cost of a stale view is high.

## One source of truth

The OCG solves this by being the one place where all operational data lands. It receives data from every source, organizes it, and serves it to every consumer through a single access-controlled API.

No component maintains its own copy of the infrastructure state. Every consumer reads from the same source. If the OCG does not know something, no component does.

## Derivation without decision

The OCG's most important design principle is that it stores and serves data only. It does not analyze data, form opinions about it, or act on it.

Every operational outcome - anomaly detection, root cause analysis, workload placement - is the responsibility of a consuming system. The OCG records what happened. It never triggers or directs what happens next.

This principle has a practical consequence: the OCG can serve as a neutral, trusted foundation for many different consuming systems at once. A sustainability optimizer and an autonomous operations engine can read from the same data store without the store itself taking sides or applying conflicting logic.

The one active role the OCG plays is building and maintaining the **semantic network** - a continuously updated map of the data center's entities and their relationships. This is a derived artifact, not a decision. The OCG builds it automatically from the raw data it stores.

## A stable foundation for evolving consumers

Data center tooling changes. Automation strategies evolve. Teams add new analytics consumers and retire old ones.

The OCG provides a stable foundation that outlasts any individual consuming system. Because it applies no business logic, it does not need to change when consuming systems change their strategy. A new consumer reads the same data as the old one, with no migration required.
