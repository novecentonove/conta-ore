<template>
  <div class="flex-1 min-h-0 min-w-0 overflow-scroll">
    <div
      class="grid w-max gap-px rounded"
      :style="gridTemplateColumns"
    >
      <div
        class="left-0 top-0 z-30 flex items-end px-4 pb-3 text-xs font-semibold uppercase text-white/35"
        :style="cornerHeaderStyle"
      />

      <div
        v-for="hour in hours"
        :key="`hour-${hour}`"
        class="top-0 z-20 flex items-end px-1 pb-1 text-left"
        :style="columnHeaderStyle"
      >
        <span class="mt-2 text-xs font-semibold leading-none text-white">
          {{ formatHour(hour) }}
        </span>
      </div>

      <template v-for="day in days" :key="`row-${day.iso}`">
        <div :style="rowHeaderStyle" class="flex justify-center items-center">
          <div>
            <div class="px-4 flex items-center space-x-3">
              <span class="text-right w-6 text-sm font-semibold text-white tabular-nums">
                {{ day.dayNumber }}
              </span>

              <span class="w-12 text-left text-xs font-semibold uppercase text-white/45">
                {{ day.weekdayLabel }}
              </span>
            </div>
          </div>
        </div>

        <button
          v-for="hour in hours"
          :key="`${day.iso}-${hour}`"
          type="button"
          class="bg-[#20202A] px-3 py-1 text-left transition hover:bg-[#2A2A38] focus:outline-none focus:ring-2 focus:ring-white/20"
          :style="cellStyle"
          @click="emit('select-slot', day, hour)"
        >
          <span class="sr-only">
            Registra ore per il {{ day.dayNumber }} {{ day.weekdayLabel }} alle {{ formatHour(hour) }}
          </span>
          <span
            v-if="getSlotSummary(day.iso, hour)"
            class="text-[10px] font-semibold text-white/80"
          >
            {{ getSlotSummary(day.iso, hour) }}
          </span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CalendarDay } from '@/lib/time'

defineProps<{
  days: CalendarDay[]
  hours: number[]
  gridTemplateColumns: Record<string, string>
  cornerHeaderStyle: Record<string, string | number>
  columnHeaderStyle: Record<string, string | number>
  rowHeaderStyle: Record<string, string | number>
  cellStyle: Record<string, string | number>
  formatHour: (hour: number) => string
  getSlotSummary: (dayIso: string, hour: number) => string
}>()

const emit = defineEmits<{
  (event: 'select-slot', day: CalendarDay, hour: number): void
}>()
</script>
