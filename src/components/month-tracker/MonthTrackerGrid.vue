<template>
  <div class="flex min-h-0 flex-1 min-w-0">
    <div
      class="min-h-0 min-w-0 flex-1"
      :class="props.isExtendedHourRange ? 'overflow-x-auto overflow-y-auto' : 'overflow-hidden'"
    >
      <div
        class="grid w-full min-w-max gap-px rounded"
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
              'relative bg-[#20202A] px-3 py-1 text-left transition focus:outline-none focus:ring-2 focus:ring-white/20',
              hasSegments(day.iso, hour) ? 'hover:bg-[#20202A]' : 'hover:bg-[#2A2A38]',
              isWeekend(day.iso) ? 'opacity-50' : '',
            ]"
            :style="cellStyle"
            @click="handleCellClick($event, day, hour)"
            @mousemove="handleCellMouseMove($event, day.iso, hour)"
            @mouseleave="handleCellMouseLeave(day.iso, hour)"
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
              <span
                v-if="isHoveredCell(day.iso, hour)"
                :class="hoveredRangeClass()"
                :style="hoveredRangeStyle()"
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

    <div class="ml-2 flex shrink-0 items-start pt-1">
      <button
        type="button"
        class="-mt-1 flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-white/10 text-white/70 transition hover:border-white/35 hover:bg-white/20 hover:text-white"
        :aria-label="hourRangeToggleTitle()"
        :aria-pressed="props.isExtendedHourRange"
        :title="hourRangeToggleTitle()"
        @click="handleHourRangeToggle"
      >
        <ChevronRight v-if="!props.isExtendedHourRange" class="h-3.5 w-3.5" />
        <ChevronLeft v-else class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CalendarDay } from '@/lib/time'
import { ref, type CSSProperties } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
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

type SlotHit = {
  startMinute: number
  endMinute: number
  entryId: number | null
}

const props = defineProps<{
  days: CalendarDay[]
  hours: number[]
  isExtendedHourRange: boolean
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
  (
    event: 'select-slot',
    payload: {
      day: CalendarDay
      hour: number
      startMinute: number
      endMinute: number
      entryId: number | null
    },
  ): void
  (event: 'toggle-hour-range', nextValue: boolean): void
}>()

const hoveredRange = ref<{
  cellKey: string
  startMinute: number
  endMinute: number
  isEntry: boolean
} | null>(null)

function segmentStyle(segment: SlotSegment): CSSProperties {
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

function hourRangeToggleTitle() {
  return props.isExtendedHourRange
    ? 'Mostra fino alle 19:00'
    : 'Estendi fino alle 23:00'
}

function handleHourRangeToggle() {
  emit('toggle-hour-range', !props.isExtendedHourRange)
}

function slotCellKey(dayIso: string, hour: number) {
  return `${dayIso}-${hour}`
}

function hasSegments(dayIso: string, hour: number) {
  return props.getSlotSegments(dayIso, hour).length > 0
}

function getSortedSegments(dayIso: string, hour: number) {
  return [...props.getSlotSegments(dayIso, hour)].sort((a, b) => (
    a.startMinute - b.startMinute || a.endMinute - b.endMinute
  ))
}

function clampMinute(minute: number) {
  if (Number.isNaN(minute)) {
    return 0
  }
  return Math.min(59, Math.max(0, minute))
}

function minuteFromPointer(event: MouseEvent, target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return 0
  }

  const rect = target.getBoundingClientRect()
  if (rect.width <= 0) {
    return 0
  }

  const offsetX = event.clientX - rect.left
  return clampMinute(Math.floor((offsetX / rect.width) * 60))
}

function getGapHit(dayIso: string, hour: number, minute: number): SlotHit {
  const segments = getSortedSegments(dayIso, hour)
  if (segments.length === 0) {
    return { startMinute: 0, endMinute: 60, entryId: null }
  }

  const occupied: Array<{ startMinute: number; endMinute: number }> = []
  for (const segment of segments) {
    const rangeStart = Math.max(0, segment.startMinute)
    const rangeEnd = Math.min(60, segment.endMinute)
    if (rangeEnd <= rangeStart) {
      continue
    }

    const lastRange = occupied[occupied.length - 1]
    if (!lastRange || rangeStart > lastRange.endMinute) {
      occupied.push({ startMinute: rangeStart, endMinute: rangeEnd })
      continue
    }

    lastRange.endMinute = Math.max(lastRange.endMinute, rangeEnd)
  }

  const gaps: Array<{ startMinute: number; endMinute: number }> = []
  let cursor = 0
  for (const range of occupied) {
    if (range.startMinute > cursor) {
      gaps.push({ startMinute: cursor, endMinute: range.startMinute })
    }
    cursor = Math.max(cursor, range.endMinute)
  }

  if (cursor < 60) {
    gaps.push({ startMinute: cursor, endMinute: 60 })
  }

  const hitGap = gaps.find((gap) => minute >= gap.startMinute && minute < gap.endMinute)
  if (hitGap) {
    return { ...hitGap, entryId: null }
  }

  const firstGap = gaps[0]
  if (firstGap) {
    return { ...firstGap, entryId: null }
  }

  return { startMinute: 0, endMinute: 60, entryId: null }
}

function resolveSlotHit(dayIso: string, hour: number, minute: number): SlotHit {
  const segments = getSortedSegments(dayIso, hour)
  const hitSegment = segments.find((segment) => (
    minute >= segment.startMinute && minute < segment.endMinute
  ))

  if (hitSegment) {
    return {
      startMinute: hitSegment.startMinute,
      endMinute: hitSegment.endMinute,
      entryId: hitSegment.entryId,
    }
  }

  return getGapHit(dayIso, hour, minute)
}

function handleCellClick(event: MouseEvent, day: CalendarDay, hour: number) {
  const minute = minuteFromPointer(event, event.currentTarget)
  const hit = resolveSlotHit(day.iso, hour, minute)
  emit('select-slot', {
    day,
    hour,
    startMinute: hit.startMinute,
    endMinute: hit.endMinute,
    entryId: hit.entryId,
  })
}

function handleCellMouseMove(event: MouseEvent, dayIso: string, hour: number) {
  if (!hasSegments(dayIso, hour)) {
    hoveredRange.value = null
    return
  }

  const minute = minuteFromPointer(event, event.currentTarget)
  const hit = resolveSlotHit(dayIso, hour, minute)
  hoveredRange.value = {
    cellKey: slotCellKey(dayIso, hour),
    startMinute: hit.startMinute,
    endMinute: hit.endMinute,
    isEntry: hit.entryId !== null,
  }
}

function handleCellMouseLeave(dayIso: string, hour: number) {
  if (hoveredRange.value?.cellKey === slotCellKey(dayIso, hour)) {
    hoveredRange.value = null
  }
}

function isHoveredCell(dayIso: string, hour: number) {
  return hoveredRange.value?.cellKey === slotCellKey(dayIso, hour)
}

function hoveredRangeClass() {
  return [
    'absolute inset-y-0',
    hoveredRange.value?.isEntry ? 'bg-white/15' : 'bg-white/8',
  ]
}

function hoveredRangeStyle() {
  if (!hoveredRange.value) {
    return {}
  }

  return {
    left: `${(hoveredRange.value.startMinute / 60) * 100}%`,
    width: `${((hoveredRange.value.endMinute - hoveredRange.value.startMinute) / 60) * 100}%`,
  }
}

function isWeekend(dayIso: string) {
  const date = new Date(`${dayIso}T00:00:00`)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}
</script>
