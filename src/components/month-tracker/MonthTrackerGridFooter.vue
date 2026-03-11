<template>
  <div :style="rowHeaderStyle" class="flex items-center justify-center mt-12">
    <div class="px-3 flex items-center space-x-2">
      <span class="text-left text-xs font-semibold uppercase text-white/45">
        Totale
      </span>
      <span class="text-base font-semibold text-white/60 tabular-nums">
        {{ totalLabel }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hours: number[]
  rowHeaderStyle: Record<string, string | number>
  cellStyle: Record<string, string | number>
  totalLabel: string
}>()
</script>
