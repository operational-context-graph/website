<script setup lang="ts">
import { useSidebar } from "vitepress/theme";
import { withBase, useData } from "vitepress";
import euSupportImg from "/assets/img/BMWE-EU.png";

const { hasSidebar } = useSidebar();
const { isDark, title, theme } = useData();
const projectName = title;
</script>

<template>
  <footer class="VPFooter" :class="{ 'has-sidebar': hasSidebar }">
    <div class="container">
      <!-- Row 1: Funding notice + NeoNephos logo -->
      <div class="footer-top">
        <div class="funding-notice">
          <div class="funding-image">
            <div class="funding-image-container">
              <div class="funding-image-bg"></div>
              <img
                :src="euSupportImg"
                alt="EU and German government funding logos"
                class="funding-image-src"
              />
            </div>
          </div>
          <div class="funding-text">
            <p>
              <strong>Funded by the European Union – NextGenerationEU.</strong>
            </p>
            <p>
              The views and opinions expressed are solely those of the author(s)
              and do not necessarily reflect the views of the European Union or
              the European Commission. Neither the European Union nor the
              European Commission can be held responsible for them.
            </p>
          </div>
        </div>
      </div>

      <!-- Row 2: Copyright + Powered by -->
      <div class="footer-bottom">
        <div class="copyright">
          <p>
            <strong
              >Copyright © 2026 SAP SE or an SAP affiliate company and
              Operational Context Graph contributors.</strong
            >
          </p>
        </div>
      </div>

      <!-- Row 3: Legal links (always last) -->
      <div class="footer-legal-links">
        <a href="https://www.sap.com/about/legal/impressum-se.html">
          Legal Disclosure
        </a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.VPFooter {
  position: relative;
  z-index: var(--vp-z-index-footer);
  border-top: 1px solid var(--vp-c-gutter);
  padding: 32px 24px;
  background-color: var(--vp-c-bg);
}

.VPFooter.has-sidebar {
  display: none;
}

.VPFooter :deep(a) {
  text-decoration-line: underline;
  text-underline-offset: 2px;
  transition: color 0.25s;
}

.VPFooter :deep(a:hover) {
  color: var(--vp-c-text-1);
}

@media (min-width: 768px) {
  .VPFooter {
    padding: 32px;
  }
}

.container {
  max-width: 1152px;
  margin: 0 auto;
}

/* Row 1: Funding + NeoNephos logo */
.footer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 24px;
}

.funding-notice {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  min-width: 0;
}

.funding-image img {
  max-width: 200px;
  height: auto;
  display: block;
}

.funding-text {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  text-align: left;
}

.funding-text p {
  margin: 0;
}

.neonephos-logos {
  flex-shrink: 0;
}

.neonephos-logo {
  max-height: 50px;
  height: auto;
  display: block;
}

.neonephos-link {
  display: inline-block;
}

/* Row 2: Copyright + Powered by */
.footer-bottom {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 24px;
}

.copyright {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  text-align: left;
}

.copyright p {
  margin: 0;
}

.powered-by {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.powered-by-text {
  font-size: 12px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.netlify-logo {
  display: block;
  height: 28px;
}

/* Row 3: Legal links */
.footer-legal-links {
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 24px;
  padding-top: 16px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  text-align: center;
}

.footer-legal-links a {
  color: var(--vp-c-text-2);
  text-decoration: underline;
  margin: 0 4px;
  transition: color 0.2s;
}

.footer-legal-links a:hover {
  color: var(--vp-c-brand-1);
}

.footer-legal-sep {
  margin: 0 4px;
  color: var(--vp-c-divider);
}

/* Responsive */
@media (max-width: 768px) {
  .footer-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .funding-notice {
    flex-direction: column;
    align-items: flex-start;
  }

  .neonephos-logos {
    align-self: center;
  }

  .neonephos-logo {
    max-height: 40px;
  }

  .footer-bottom {
    flex-direction: column;
  }

  .powered-by {
    align-self: center;
  }
}
</style>
