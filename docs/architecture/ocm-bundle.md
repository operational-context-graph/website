# OCM Bundle

This document defines how the Operational Context Graph (OCG) is packaged using the [Open Component Model (OCM)](https://github.com/open-component-model/open-component-model). It covers the component model, build process, and transport design for two deployment environments: connected (OCI registry) and air-gapped.

OCG ships one Helm chart and one container image for each of its services: Schema Registry, Data Ingestion, Telemetry Store, Inventory Store, and Connector Interface. The OCG bundle contains only these parts. Third-party software that OCG needs at runtime ships in separate dependency bundles, and the framework distribution combines both. See [Runtime dependencies and distributions](#runtime-dependencies-and-distributions). The design targets OCM CLI v0.16.0.

In this document, a _service_ is one of the five OCG parts, and a _component_ is always an OCM component.

## Design overview

```text
 source checkout ──build──▶ bin/images/<service>.oci.tar    (one per OCG service)
                            bin/ocg-<version>.tgz           (Helm chart)
                                        │
                         ocm add component-version
                                        ▼
                              CTF archive (bin/ctf)   ◀── sign ── verify
                                        │
              ┌─────────────────────────┴─────────────────────────┐
              ▼                                                   ▼
     Route A: OCI registry                            Route B: air-gap archive
     ocm transfer component-version                   archive of bin/ctf, moved offline,
                                                      imported into an internal registry
              │                                                   │
              ▼                                                   ▼
   consumer: verify with OCM ▶ deploy on Kubernetes with own tooling
```

The CTF archive is the unit of everything: signed, pushed to a registry, and carried across the air gap. There is no second artifact format. Neither transport route accepts a bundle it has not verified.

Both routes ship the same signed CTF. Route A pushes it to an OCI registry using `ocm transfer component-version`. Route B archives it, moves it offline, and imports it into a registry inside the air gap with the same command. The transfer copies every embedded resource into the target registry by default, without changing the signed part of the descriptor, so the signature stays valid. Publishing on either route never rebuilds: it takes the bundle from `bin/ctf`, re-verifies the signature, and ships.

Consumers verify the bundle in the registry and deploy the chart from there, with every image pinned by digest. Route B therefore imports the bundle into a registry inside the air gap, which the Kubernetes nodes pull from.

## Component model

### Constructor and descriptor

Two artifacts exist:

- The **component constructor** (`ocm/component-constructor.yaml`) is hand-authored. It declares what to package and where the build put the files. It is committed to the repository.
- The **component descriptor** is generated from the constructor by `ocm add component-version` and stored inside the CTF. It records resolved values and content-addressed blob references. The signature covers this generated descriptor, not the constructor.

### Identity

| Element          | Value                                                            | Rationale                                                                                                                  |
| ---------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Component name   | `github.com/operational-context-graph/operational-context-graph` | A namespace the project controls. Component identity is permanent once versions are published.                             |
| Provider         | `operational-context-graph`                                      | The organisation that produces and signs the bundle.                                                                       |
| Chart resource   | `chart`, type `helmChart`                                        | The top-level OCG Helm chart, which contains the chart of every OCG service. See [Helm charts](#helm-charts).              |
| Image resources  | One per OCG service, type `ociImage`                             | Named after the service: `schema-registry`, `data-ingestion`, `telemetry-store`, `inventory-store`, `connector-interface`. |
| Bundle manifest  | `bundle-manifest`, type `blob`                                   | Version metadata and image inventory. See [bundle manifest](#bundle-manifest).                                             |
| Image values     | `image-values`, type `blob`                                      | Helm values that pin every image by digest. See [Image values](#image-values).                                             |
| Variant identity | None                                                             | Each image is one multi-platform image index. The Kubernetes node selects the variant it runs on.                          |

### Constructor

The constructor has one image entry per OCG service. Image entries differ only in `name` and `input.path`. Adding a service is one entry here plus its source folder, with no schema impact.

```yaml
components:
  - name: github.com/operational-context-graph/operational-context-graph
    version: ${VERSION}
    provider:
      name: operational-context-graph
    resources:
      - name: chart
        type: helmChart
        version: ${VERSION}
        input:
          type: Helm/v1
          path: ./bin/ocg-${VERSION}.tgz
      - name: schema-registry
        type: ociImage
        version: ${VERSION}
        input:
          type: File/v1
          path: ./bin/images/schema-registry.oci.tar
          mediaType: application/vnd.ocm.software.oci.layout.v1+tar
      # …one entry each for data-ingestion, telemetry-store, inventory-store, connector-interface
      - name: bundle-manifest
        type: blob
        version: ${VERSION}
        input:
          type: File/v1
          path: ./bin/bundle-manifest.yaml
          mediaType: application/yaml
      - name: image-values
        type: blob
        version: ${VERSION}
        input:
          type: File/v1
          path: ./bin/image-values.yaml
          mediaType: application/yaml
```

A few decisions are encoded here:

- `${VERSION}` is expanded from an environment variable at build time, not hardcoded. The constructor cannot disagree with the build invocation. OCM turns an unset variable into an empty string, so the preflight checks that `VERSION` is set.
- Every resource is embedded by value. `Helm/v1` stores the packaged chart as an OCI artifact, and `File/v1` with the OCI layout media type stores each image as an OCI image index. Each appears in the generated descriptor as a `LocalBlob/v1` reference, making the CTF self-contained.
- Each image tar has exactly one top-level entry in its `index.json`, the multi-platform image index. OCM refuses a layout where it cannot tell which image is meant.
- Paths are relative to the repository root, not to `ocm/`. Packaging runs from the root with `--working-directory .`, so chart and image paths resolve the same way.
- The production platform set is `linux/amd64` and `linux/arm64`, the same as the Autonomous Operations Satellite. Each image carries both platforms in one image index, so the `extraIdentity` pattern is not needed.

### Descriptor

The generated descriptor records the type, version, access, and digest of every resource. Abridged:

```yaml
meta:
  schemaVersion: v2
component:
  name: github.com/operational-context-graph/operational-context-graph
  version: 1.2.3
  provider: operational-context-graph
  resources:
    - name: chart
      type: helmChart
      version: 1.2.3
      relation: local
      access:
        {
          type: LocalBlob/v1,
          localReference: "sha256:<chart digest>",
          mediaType: application/vnd.oci.image.manifest.v1+json,
        }
      digest:
        {
          hashAlgorithm: SHA-256,
          normalisationAlgorithm: genericBlobDigest/v1,
          value: "<chart digest>",
        }
    - name: schema-registry
      type: ociImage
      version: 1.2.3
      relation: local
      access:
        {
          type: LocalBlob/v1,
          localReference: "sha256:<image index digest>",
          mediaType: application/vnd.oci.image.index.v1+json,
        }
      digest:
        {
          hashAlgorithm: SHA-256,
          normalisationAlgorithm: genericBlobDigest/v1,
          value: "<image index digest>",
        }
    # …the other four images, bundle-manifest, and image-values follow the same shape
signatures:
  - name: ocg-sig
    digest:
      {
        hashAlgorithm: SHA-256,
        normalisationAlgorithm: jsonNormalisation/v4alpha1,
        value: "<descriptor digest>",
      }
    signature:
      {
        algorithm: RSASSA-PSS,
        mediaType: application/vnd.ocm.signature.rsa.pss,
        value: "<signature>",
      }
```

The access stays `LocalBlob/v1` when the bundle is transferred into a registry. OCM stores the chart and each image as regular OCI artifacts in the component's repository, at `<registry>/<path>/component-descriptors/<component name>@<digest>`. OCM tooling fetches every resource from this digest-pinned location in whichever registry holds the bundle. Image locations therefore never need rewriting when the bundle moves between registries.

The signature covers `digest.value`, but not `access.localReference`, which is where OCM fetches the content from. Both must be equal. Deployment checks this (see [Deployment](#deployment)).

### Bundle manifest

The `bundle-manifest` resource is a plain YAML summary of the bundle that deployment tooling can read without parsing the OCM descriptor. It carries the version split into `major`, `minor`, and `patch`, the source commit, and an inventory of the services with their resource name, version, and image digest.

```yaml
kind: BundleManifest
version: 1.2.3
semver: { major: 1, minor: 2, patch: 3 }
source:
  commit: <git commit>
services:
  - name: schema-registry
    resource: schema-registry
    version: 1.2.3
    digest: sha256:<image index digest>
  # …one entry per OCG service
```

The build generates the manifest from the same inputs as the constructor, and the inspect stage checks its digests against the descriptor, so the two cannot drift. The descriptor remains authoritative. The signature covers the manifest like any other resource.

### Versioning

The bundle version is the git release tag. The build reads `VERSION` from the nearest `vX.Y.Z` tag, strips the leading `v`, and rejects anything that is not valid `major.minor.patch` semver. An explicit override is allowed for local testing but cannot pass the publish checks.

One version covers the whole bundle: the component, every resource, the `version` and `appVersion` of the top-level chart and every service chart, and the image tags. The charts in the repository carry a placeholder version that the build replaces.

Three constraints enforce that a published version always maps to an exact, clean tag:

- The working tree must be clean. Uncommitted or untracked files are rejected before signing.
- The current commit must carry the tag `v<VERSION>`. Any commit between two releases fails this check.
- A version is published once. Different content is never published under an existing version. `ocm transfer` overwrites an existing version without warning, so publishing first checks that the version does not exist in the target. Target registries should also enforce tag immutability.

### Image values

The `image-values` resource is a Helm values file that pins every image of the bundle by digest. The build generates it from the same image digests as the descriptor. It is needed because after the transfer the charts must point at the images in the target registry, and writing the digests by hand is error-prone. Because the file is signed with the bundle, the digests in it are exactly the ones the signature covers.

```yaml
schema-registry:
  image:
    repository: ${IMAGE_REPOSITORY}
    digest: sha256:<image index digest>
# …one entry per OCG service
```

The digests are known at build time. The repository is not, because it depends on the registry the bundle is transferred into. The file therefore uses the placeholder `${IMAGE_REPOSITORY}`, which deployment replaces with the bundle's location in the registry. Every bundle with a chart carries its own `image-values` file. Dependency bundles use the image value names of their upstream charts.

## Helm charts

Each OCG service defines its own Helm chart next to its source, in `services/<service>/helm/`. The service owns its image and its chart together.

The top-level chart in `helm/ocg/` bundles the service charts. It declares each one as a dependency with a local `file://` path and a `<service>.enabled` condition. The build pulls the service charts into the top-level chart before packaging, so the packaged chart contains all of them. The bundle still carries one chart resource.

One version covers all charts. The build sets the release version on the top-level chart, on every service chart, and on the dependency entries, so the charts cannot drift apart. Shared template logic, such as how an image reference is rendered, can live in a library chart that the service charts depend on. Helm does not resolve a service chart's own dependencies when it pulls the chart in, so the build resolves the service charts' dependencies first and the top-level chart's last.

Every service chart exposes the same image values: repository, tag, and digest. A digest, when set, takes precedence over the tag. In the top-level chart, these values sit under the service's key, for example `schema-registry.image.digest`. Every deployment sets repository and digest from the bundle, so the cluster runs exactly the images the signature covers. The tag default keeps a plain `helm install` usable during development.

After transfer, the images live in a different registry than the chart defaults expect. Every chart in a distribution, including the dependency charts, must therefore meet these requirements:

- Every container image, including init containers and sidecars, is set from values. No image is hardcoded.
- Each image is configurable by repository and digest, not only by registry.
- Pull secrets are set through an `imagePullSecrets` value.
- Images that an operator starts at runtime are configurable the same way. A dependency that cannot meet this needs a wrapper chart.

## Repository layout

OCM packaging adds the charts, the `ocm/` folder, and one folder per service to the `operational-context-graph` git repository.

```text
operational-context-graph/               # the operational-context-graph git repository
├── services/
│   ├── schema-registry/                 # service source and Dockerfile
│   │   └── helm/                        # service Helm chart
│   │       ├── Chart.yaml               # placeholder version, set at build time
│   │       ├── values.yaml
│   │       └── templates/
│   ├── data-ingestion/
│   ├── telemetry-store/
│   ├── inventory-store/
│   └── connector-interface/
├── helm/
│   └── ocg/                             # top-level OCG Helm chart, bundles the service charts
│       ├── Chart.yaml                   # placeholder version, set at build time
│       ├── values.yaml
│       └── charts/                      # git-ignored, filled from the service charts at build time
├── ocm/
│   ├── component-constructor.yaml       # hand-authored OCM input (see above)
│   └── ocg.pub.pem                      # public verification key (safe to commit)
├── bin/                                 # git-ignored — build output
│   ├── images/<service>.oci.tar         # one multi-platform image per service
│   ├── ocg-<version>.tgz                # packaged top-level chart
│   ├── bundle-manifest.yaml
│   ├── image-values.yaml                # Helm values that pin every image by digest
│   ├── ctf/                             # the CTF archive (the shipped unit)
│   └── ocg-<version>.ctf.tgz            # Route B archive (contents of bin/ctf at the archive root)
├── Makefile
└── …
```

The service name is the single key the build uses to find everything. `services/<name>/` holds the source and Dockerfile, `services/<name>/helm/` the chart, and `bin/images/<name>.oci.tar` the built image. `<name>` is also the OCM resource name and the service's key in the top-level chart. The repository's `.gitignore` ignores `*.pem`, so the public key needs an explicit exception.

## Build design

OCM packaging lives as a set of Makefile targets alongside existing build, lint, and coverage targets. The design is defined by its invariants:

- A single target produces the finished bundle. Its output is always a signed and verified CTF. No target produces a shippable bundle without signing.
- Cheap checks run before building: semver validity, a set `VERSION`, service-list consistency between the source folders, the constructor, and the top-level chart's dependencies, presence of both key files, and a clean working tree.
- The CTF is deleted before each packaging run. The CLI's default conflict policy aborts on an existing version, and nothing from a previous run may carry over.
- Signing and verification use separate configurations. Only the signing configuration contains the private key. The verification configuration contains the public key and, where needed, registry credentials. CI verifies its own output using the key consumers will use, and publishing never touches the signing configuration.

### Build stages

1. **Preflight**: the checks above.
2. **Build**: one multi-platform image build per service (`linux/amd64`, `linux/arm64`), each written as an OCI image layout. The service charts are pulled into the top-level chart, the top-level chart is packaged with the release version, and the bundle manifest and image values are generated.
3. **Package**: one `ocm add component-version` invocation reads the constructor, collects the chart, all images, the bundle manifest, and the image values, and writes the CTF.
4. **Inspect**: `ocm get component-version -o yaml` prints the generated descriptor. A check then compares the digests in the bundle manifest and the image values with the descriptor.
5. **Sign**: `ocm sign component-version` against the CTF, using the signature name `ocg-sig`. One signature covers all resources.
6. **Verify**: `ocm verify component-version` against the CTF, using the verification configuration.

Sign and verify pass their configuration with `--config`. In OCM v0.16.0, the signer and the keys are both defined in these configuration files rather than on the command line, and each key entry names the signature it belongs to. CI writes the private key outside the repository checkout, for example `/tmp/ocg-sign.key`. A key file inside it counts as an untracked file and stops the preflight.

For Route B, the contents of `bin/ctf` are archived with `artifact-index.json` and `blobs/` at the archive root. OCM reads a `.tgz` CTF directly, so the archive is verified and imported without unpacking. For a distribution, both the export into a CTF and the import run `ocm transfer component-version` with `--recursive` to include every referenced bundle.

## Deployment

The framework distribution references everything needed to deploy OCG on Kubernetes: the OCG bundle and the dependency bundles, with their charts, images, and digests. Consumers deploy it with their own tooling.

Deployment does not push images. The transfer already stores every image in the target registry, by digest, under `<registry>/<path>/component-descriptors/<component name>`. The tagged component version references the images, so registry garbage collection keeps them. The Kubernetes nodes pull from this registry. Pre-pulled images are not used. They need write access to every node and bypass the registry the bundle was verified in.

A deployment runs these steps for every bundle with a chart. Each run downloads into a new, empty directory, because `ocm download resource` appends to existing files.

1. **Verify the bundle.** `ocm verify component-version` checks one component version and does not follow references. The consumer runs it for the distribution and for every bundle it references, with the public key.
2. **Check the resource locations.** For every resource, `access.localReference` must equal `sha256:` plus `digest.value`. This check is needed because the signature covers `digest.value` only, and OCM downloads content by `localReference` without comparing the two. It is a small script in the deployment tooling.
3. **Extract the chart.** `ocm download resource` with the `helm` transformer extracts the chart as a standard chart archive.
4. **Prepare the image values.** `ocm download resource` downloads `image-values`. Its SHA-256 is checked against the signed `digest.value`. The same check applies to `bundle-manifest` if the tooling reads it. Then `${IMAGE_REPOSITORY}` is replaced with the bundle's location in the registry, for example with `envsubst '${IMAGE_REPOSITORY}'`.
5. **Install.** `helm install` with the image values file plus any environment values.

```yaml
# image values after the placeholder is replaced
schema-registry:
  image:
    repository: registry.internal/ocg/component-descriptors/github.com/operational-context-graph/operational-context-graph
    digest: sha256:<image index digest>
```

**Registry requirements.** The registry must support nested repository paths several levels deep, OCI image indexes that contain other image indexes, custom artifact types, and pulling by digest. OCM stores every component version this way. Tag immutability is recommended.

## Runtime dependencies and distributions

OCG needs software it does not build itself, for example a relational database, a time-series database, or a knowledge graph. Downloading it at runtime breaks the air-gap requirement. As with the Autonomous Operations Satellite bundle, OCG and its runtime dependencies are packaged as separate bundles, and a distribution combines them. The Kubernetes cluster itself is a prerequisite and not part of any bundle.

### Contents

| Bundle                 | Contents                                                                                   | Component name (example)                                         |
| ---------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| OCG bundle             | The OCG chart, the five OCG images, the bundle manifest, and the image values.             | `github.com/operational-context-graph/operational-context-graph` |
| Dependency bundles     | Chart, images, bundle manifest, and image values of third-party software OCG needs.        | `<namespace>/<dependency>`                                       |
| Framework distribution | References to the OCG bundle and every dependency bundle, at the versions tested together. | `<namespace>/ocg-framework`                                      |
| Custom distributions   | A reference to the framework distribution, plus a consumer's extensions.                   | `<namespace>/ocg-<environment>`                                  |

A **distribution** is a bundle that can be installed on its own: it combines OCG with all its runtime dependencies. Every image covers `linux/amd64` and `linux/arm64`. Deployment tooling (the OCM CLI and Helm) is provided by the target environment and is not part of any bundle.

All bundles are signed in CI with the same key, so one public key verifies everything a consumer deploys.

### Dependency bundles

The OCG chart does not deploy OCG's dependencies. Each service chart takes connection settings for its dependencies as values, so it works with dependency bundles or with services the environment already runs.

Dependency images are fetched from upstream release channels in CI by pinned digest and embedded via `File/v1` inputs, exactly like OCG's own images. OCM only allows `relation: local` for embedded resources, so the bundle manifest records their upstream origin. Upstream release integrity (digests, and signatures where published) must be verified before embedding. The verified source and version are pinned in the build configuration. Dependency bundles are versioned independently and follow the upstream releases they package.

### Framework and custom distributions

The framework distribution is the product bundle of the vanilla OCG framework and the base for every consumer. It references the OCG bundle and every dependency bundle by component reference. OCM records the digest of each referenced version, so the framework distribution pins exactly the combination that was tested together. Air-gap transport carries it and every bundle it references in one CTF by transferring it recursively.

Every consumer can use the framework distribution as it is, or extend and customise it into a custom distribution. Rolling out OCG in SCI is an example. A custom distribution references the framework distribution and adds what its environment needs, such as values. The referenced bundles keep their own signatures and stay unchanged.

The five OCG services themselves stay in one OCM component. They are built from one repository and released together, so splitting them would add versions to coordinate without adding flexibility. This should be revisited if services start to release independently.

## Signing and verification

### Trust model

Plain RSA signatures with a pinned public key. The team generates a 4096-bit RSA key pair once. Signatures use RSASSA-PSS with SHA-256, the OCM CLI's defaults. The signature is stored in the descriptor, and verification requires the public key supplied separately via OCM configuration.

- The **private key** lives in the CI secrets manager, is never committed, and is written at build time to a file outside the checkout.
- The **public key** is committed at `ocm/ocg.pub.pem` and distributed to every environment where verification happens, including every consumer that verifies the bundle before deployment.

**Key rotation** requires generating a new RSA key pair, rotating the CI secret, committing the new public key, and distributing it to every verification environment through the same trusted channel used for initial provisioning. For air-gapped environments this means a coordinated update.

### What the signature covers

Signing hashes a normalised form of the descriptor, which records every resource's digest. One signature covers the chart, all images, the bundle manifest, and the image values. Replacing any one of them is detected, as long as deployment checks the resource locations and uses the signed digests. The normalisation leaves out each resource's `access`. This is why a transfer keeps the signature valid, and why deployment checks `localReference` separately.

### Verification points

1. In CI, immediately after signing.
2. Before publishing, on both routes.
3. Against the registry copy, after pushing (Route A) and after importing (Route B).
4. Before deployment, by the consumer with OCM tooling.

### Delivering the public key to the air-gapped side

The key arrives through a separate trusted channel, pre-provisioned with the environment, or delivered and checked independently. The specific mechanism (base image provisioning, out-of-band disk transfer with hash verified against a published fingerprint, environment bootstrap scripts) is defined per deployment context and is not prescribed here. The key must not travel inside the same archive as the bundle, because the archive must not vouch for itself. The OCM CLI and Helm arrive through the same channel.
