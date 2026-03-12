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
            <div class="px-3 flex items-center space-x-2">
              <span
                :class="[
                  'text-right w-6 text-sm font-semibold text-white tabular-nums',
                  isWeekend(day.iso) ? 'opacity-50' : '',
                ]"
              >
                {{ day.dayNumber }}
              </span>

              <span
                :class="[
                  'w-10 text-left text-xs font-semibold uppercase text-white/45',
                  isWeekend(day.iso) ? 'opacity-50' : '',
                ]"
              >
                {{ day.weekdayLabel }}
              </span>

              <div class="w-12 text-[12px] text-white/60 tabular-nums">
                {{ getDayTotalLabel(day.iso) }}
              </div>

            </div>
          </div>
        </div>

        <button
          v-for="hour in hours"
          :key="`${day.iso}-${hour}`"
          type="button"
          :class="[
            'relative bg-[#20202A] px-3 py-1 text-left transition hover:bg-[#2A2A38] focus:outline-none focus:ring-2 focus:ring-white/20',
            isWeekend(day.iso) ? 'opacity-50' : '',
          ]"
          :style="cellStyle"
          @click="emit('select-slot', day, hour)"
        >
          <span class="sr-only">
            Registra ore per il {{ day.dayNumber }} {{ day.weekdayLabel }} alle {{ formatHour(hour) }}
          </span>
          <div class="pointer-events-none absolute inset-0">
            <span
              v-for="segment in getSlotSegments(day.iso, hour)"
              :key="`${day.iso}-${hour}-${segment.entryId}-${segment.startMinute}`"
              :class="segmentClass(segment)"
              :style="segmentStyle(segment)"
            />
          </div>
          <!-- <span
            v-if="getSlotSummary(day.iso, hour)"
            class="relative z-10 text-[10px] font-semibold text-white/80"
          >
            {{ getSlotSummary(day.iso, hour) }}
          </span> -->
        </button>
      </template>

      <MonthTrackerGridFooter
        :hours="hours"
        :row-header-style="rowHeaderStyle"
        :cell-style="cellStyle"
        :total-label="monthTotalLabel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CalendarDay } from '@/lib/time'
import MonthTrackerGridFooter from './MonthTrackerGridFooter.vue'

type SlotSegment = {
  startMinute: number
  endMinute: number
  entryId: number
  isStart: boolean
  isEnd: boolean
  fillColor?: string
  borderColor?: string
}

const props = defineProps<{
  days: CalendarDay[]
  hours: number[]
  gridTemplateColumns: Record<string, string>
  cornerHeaderStyle: Record<string, string | number>
  columnHeaderStyle: Record<string, string | number>
  rowHeaderStyle: Record<string, string | number>
  cellStyle: Record<string, string | number>
  formatHour: (hour: number) => string
  getDayTotalLabel: (dayIso: string) => string
  monthTotalLabel: string
  getSlotSummary: (dayIso: string, hour: number) => string
  getSlotSegments: (dayIso: string, hour: number) => SlotSegment[]
  timesheetFillColor: string
  timesheetBorderColor: string
}>()

const emit = defineEmits<{
  (event: 'select-slot', day: CalendarDay, hour: number): void
}>()

function segmentStyle(segment: SlotSegment) {
  const widthMinutes = Math.max(0, segment.endMinute - segment.startMinute)
  const gapBleedPx = segment.isEnd ? 0 : 1
  const fillColor = segment.fillColor ?? props.timesheetFillColor
  const borderColor = segment.borderColor ?? props.timesheetBorderColor
  return {
    left: `${(segment.startMinute / 60) * 100}%`,
    width: gapBleedPx
      ? `calc(${(widthMinutes / 60) * 100}% + ${gapBleedPx}px)`
      : `${(widthMinutes / 60) * 100}%`,
    backgroundColor: fillColor,
    boxSizing: 'border-box',
    borderTop: `1px solid ${borderColor}`,
    borderBottom: `1px solid ${borderColor}`,
    borderLeft: segment.isStart ? `1px solid ${borderColor}` : '0',
    borderRight: segment.isEnd ? `1px solid ${borderColor}` : '0',
  }
}

function segmentClass(segment: SlotSegment) {
  return [
    'absolute inset-y-0',
    segment.isStart ? 'rounded-l-[2px]' : '',
    segment.isEnd ? 'rounded-r-[2px]' : '',
    segment.isStart && segment.isEnd ? 'rounded-[2px]' : '',
  ]
}

function isWeekend(dayIso: string) {
  const date = new Date(`${dayIso}T00:00:00`)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}
</script>
