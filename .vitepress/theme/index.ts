import DefaultTheme from "vitepress/theme";
import "./style.css";
import AppFooter from "../components/AppFooter.vue";
import GlowEffect from "./GlowEffect.vue";
import { h } from "vue";

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "layout-bottom": () => [h(AppFooter), h(GlowEffect)],
    });
  },
};
