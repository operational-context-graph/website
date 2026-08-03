import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Operational Context Graph",
  head: [
    [
      "link",
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/website/assets/img/logo/operational-context-graph-icon-color.svg",
      },
    ],
  ],
  description: "Understand the semantics of your infrastructure.",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [{ text: "Home", link: "/" }],

    logo: {
      src: "/assets/img/logo/operational-context-graph-icon-color.svg",
      width: 24,
      height: 24,
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/operational-context-graph" },
    ],
  },
});
