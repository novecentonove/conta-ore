<template>
  <div class="w-full flex items-center justify-end">
    <div class="w-full px-3 flex flex-col items-end gap-2 text-right">
      <div v-if="projectTotals.length > 0" class="flex flex-col items-end gap-1">
        <div
          v-for="project in projectTotals"
          :key="project.id ?? project.name"
          class="flex items-center gap-2"
        >
          <span
            class="text-[11px] font-semibold uppercase text-white/45 underline underline-offset-4"
            :style="{ textDecorationColor: project.color }"
          >
            {{ project.name }}
          </span>
          <span class="text-[12px] text-white/60 tabular-nums">
            {{ project.totalLabel }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold uppercase text-white/45">
          Totale
        </span>
        <span class="text-base font-semibold text-white/60 tabular-nums">
          {{ totalLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hours: number[]
  cellStyle: Record<string, string | number>
  totalLabel: string
  projectTotals: { id: number | null; name: string; color: string; totalLabel: string }[]
}>()
</script>
