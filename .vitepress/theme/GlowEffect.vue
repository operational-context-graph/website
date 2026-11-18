<script setup lang="ts">
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const attached = new WeakMap<Element, (e: MouseEvent) => void>()

function attachGlow() {
  nextTick(() => {
    document.querySelectorAll<HTMLElement>('.VPFeature').forEach(el => {
      if (attached.has(el)) return
      const handler = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect()
        el.style.setProperty('--glow-x', `${e.clientX - rect.left}px`)
        el.style.setProperty('--glow-y', `${e.clientY - rect.top}px`)
      }
      attached.set(el, handler)
      el.addEventListener('mousemove', handler)
    })
  })
}

onMounted(attachGlow)
watch(() => route.path, attachGlow)
</script>

<template></template>
