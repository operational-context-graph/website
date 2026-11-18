import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    ignoreDeadLinks: [
      /^\.\/LICENSE$/,
      /^\.\/REUSE\.toml$/,
      /^\.\/AGENTS(\.md)?$/,
    ],
    title: "Operational Context Graph",
    head: [
      [
        "link",
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/assets/img/logo/operational-context-graph-icon-color.svg",
        },
      ],
    ],
    description: "Understand the semantics of your infrastructure.",
    lastUpdated: true,
    vite: {
      resolve: {
        alias: [
          {
            find: /^.*\/VPFeature\.vue$/,
            replacement: resolve(__dirname, "./theme/VPFeature.vue"),
          },
        ],
      },
      optimizeDeps: {
        include: [
          "fastdom",
          "fastdom/extensions/fastdom-promised.js",
          "cytoscape-fcose",
          "dayjs/plugin/duration",
        ],
      },
    },
    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      nav: [
        { text: "Home", link: "/" },
        { text: "Documentation", link: "/docs/", activeMatch: "/docs/" },
      ],

      logo: {
        src: "/assets/img/logo/operational-context-graph-icon-color.svg",
        width: 24,
        height: 24,
      },

      socialLinks: [
        {
          icon: "github",
          link: "https://github.com/operational-context-graph",
        },
      ],

      sidebar: {
        "/docs/": [
          {
            text: "Introduction",
            collapsed: true,
            link: "/docs/introduction/",
            items: [
              { text: "Context", link: "/docs/introduction/context" },
              { text: "Motivation", link: "/docs/introduction/motivation" },
              { text: "Components", link: "/docs/introduction/components" },
            ],
          },
          {
            text: "Architecture",
            collapsed: true,
            link: "/docs/architecture/",
            items: [
              {
                text: "Data Ingestion",
                collapsed: true,
                link: "/docs/architecture/data-ingestion/",
                items: [
                  {
                    text: "Ingestion Protocol",
                    link: "/docs/architecture/data-ingestion/ingestion-protocol",
                  },
                  {
                    text: "OTLP ingestion",
                    link: "/docs/architecture/data-ingestion/otlp-ingestion",
                  },
                  {
                    text: "Implementation",
                    link: "/docs/architecture/data-ingestion/ingestion-implementation",
                  },
                ],
              },
              {
                text: "Inventory Connector",
                link: "/docs/architecture/inventory-connector",
              },
              {
                text: "Inventory Store",
                link: "/docs/architecture/inventory-store",
              },
              { text: "OCM Bundle", link: "/docs/architecture/ocm-bundle" },
              {
                text: "Telemetry Store",
                link: "/docs/architecture/telemetry-store",
              },
            ],
          },
        ],
      },
    },
  }),
);
