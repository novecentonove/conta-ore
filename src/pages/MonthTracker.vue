<template>
  <InnerPage>
    <section class="flex min-h-0 flex-1 flex-col gap-6">
      <MonthTrackerHeader
        :month-label="monthLabel"
        @previous="goToPreviousMonth"
        @next="goToNextMonth"
      />

      <MonthTrackerGrid
        :days="daysInMonth"
        :hours="hours"
        :grid-template-columns="gridTemplateColumns"
        :corner-header-style="cornerHeaderStyle"
        :column-header-style="columnHeaderStyle"
        :row-header-style="rowHeaderStyle"
        :cell-style="cellStyle"
        :format-hour="formatHour"
        :get-slot-summary="getSlotSummary"
        :get-slot-segments="getSlotSegments"
        :timesheet-fill-color="timesheetFillColor"
        :timesheet-border-color="timesheetBorderColor"
        @select-slot="openDrawer"
      />

      <p v-if="isLoadingTimesheets" class="text-xs text-white/45">
        Caricamento ore...
      </p>
      <p v-if="loadError" class="text-sm text-rose-300">
        {{ loadError }}
      </p>

      <TimesheetDrawer
        v-model:open="isDrawerOpen"
        :selected-slot="selectedSlot"
        :existing-entry="selectedEntry"
        :has-active-database="hasActiveDatabase"
        @saved="loadTimesheets"
      />
    </section>
  </InnerPage>
</template>

<script setup lang="ts">
import InnerPage from '@/components/layout/innerPage.vue'
import MonthTrackerGrid from '@/components/month-tracker/MonthTrackerGrid.vue'
import MonthTrackerHeader from '@/components/month-tracker/MonthTrackerHeader.vue'
import TimesheetDrawer from '@/components/month-tracker/TimesheetDrawer.vue'
import {
  activeDatabaseName,
  listTimesheetsBetween,
  type TimesheetEntry,
} from '@/lib/database'
import {
  formatHour,
  formatLocalDateTime,
  normalizeWeekdayLabel,
  parseLocalDateTime,
  slotKey,
  slotKeyFromTime,
  toIsoDate,
  type CalendarDay,
} from '@/lib/time'
import { computed, ref, watch } from 'vue'

const dailyStartingHour = 9
const dailyFinishingHour = 19
const cellHeight = '20px'
const cellWidth = '100px'
const dayHeaderWidth = '92px'
const timesheetFillColor = 'rgba(120, 170, 255, 0.35)'
const timesheetBorderColor = 'rgba(120, 170, 255, 0.8)'

const selectedMonth = ref(startOfMonth(new Date()))
const isDrawerOpen = ref(false)
const selectedSlot = ref<{
  day: CalendarDay
  hour: number
} | null>(null)
const selectedEntry = ref<TimesheetEntry | null>(null)
const timesheets = ref<TimesheetEntry[]>([])
const loadError = ref('')
const isLoadingTimesheets = ref(false)

const monthFormatter = new Intl.DateTimeFormat('it-IT', {
  month: 'long',
  year: 'numeric',
})

const weekdayFormatter = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
})

const monthLabel = computed(() => {
  const formattedMonth = monthFormatter.format(selectedMonth.value)
  return formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1)
})

const hours = computed(() =>
  Array.from(
    { length: dailyFinishingHour - dailyStartingHour + 1 },
    (_, index) => dailyStartingHour + index,
  ),
)

const daysInMonth = computed(() => {
  const currentMonth = selectedMonth.value.getMonth()
  const cursor = new Date(selectedMonth.value)
  const days: CalendarDay[] = []

  while (cursor.getMonth() === currentMonth) {
    days.push({
      dayNumber: cursor.getDate(),
      iso: toIsoDate(cursor),
      weekdayLabel: normalizeWeekdayLabel(weekdayFormatter.format(cursor)),
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  return days
})

const hasActiveDatabase = computed(() => Boolean(activeDatabaseName.value))

const gridTemplateColumns = computed(() => ({
  gridTemplateColumns: `${dayHeaderWidth} repeat(${hours.value.length}, ${cellWidth})`,
}))

const cornerHeaderStyle = computed(() => ({
  minHeight: cellHeight,
  height: cellHeight,
  maxHeight: cellHeight,
  width: dayHeaderWidth,
}))

const columnHeaderStyle = computed(() => ({
  minHeight: cellHeight,
  height: cellHeight,
  maxHeight: cellHeight,
  boxSizing: 'border-box',
  overflow: 'hidden',
  minWidth: cellWidth,
  maxWidth: cellWidth,
}))

const rowHeaderStyle = computed(() => ({
  minHeight: cellHeight,
  height: cellHeight,
  maxHeight: cellHeight,
  width: dayHeaderWidth,
}))

const cellStyle = computed(() => ({
  minHeight: cellHeight,
  height: cellHeight,
  maxHeight: cellHeight,
  boxSizing: 'border-box',
  overflow: 'hidden',
  minWidth: cellWidth,
  maxWidth: cellWidth,
}))

const timesheetSummary = computed(() => {
  const summary = new Map<string, { totalMinutes: number; count: number }>()

  for (const entry of timesheets.value) {
    const key = slotKeyFromTime(entry.time_from)
    if (!key) {
      continue
    }

    const current = summary.get(key) ?? { totalMinutes: 0, count: 0 }
    const startDate = parseLocalDateTime(entry.time_from)
    const endDate = entry.time_to ? parseLocalDateTime(entry.time_to) : null

    if (startDate && endDate) {
      const minutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
      if (minutes > 0) {
        current.totalMinutes += minutes
      }
    }
    current.count += 1
    summary.set(key, current)
  }

  return summary
})

type SlotSegment = {
  startMinute: number
  endMinute: number
  entryId: number
  isStart: boolean
  isEnd: boolean
}

const segmentsBySlot = computed(() => {
  const map = new Map<string, SlotSegment[]>()

  for (const entry of timesheets.value) {
    if (!entry.time_to) {
      continue
    }

    const startDate = parseLocalDateTime(entry.time_from)
    const endDate = parseLocalDateTime(entry.time_to)

    if (!startDate || !endDate) {
      continue
    }

    const startTotal = startDate.getHours() * 60 + startDate.getMinutes()
    const endTotal = endDate.getHours() * 60 + endDate.getMinutes()

    if (endTotal <= startTotal) {
      continue
    }

    const dayIso = toIsoDate(startDate)
    const startHour = Math.floor(startTotal / 60)
    const endHour = Math.floor((endTotal - 1) / 60)

    for (let hour = startHour; hour <= endHour; hour += 1) {
      const hourStart = hour * 60
      const hourEnd = hourStart + 60
      const segmentStart = Math.max(startTotal, hourStart)
      const segmentEnd = Math.min(endTotal, hourEnd)

      if (segmentEnd <= segmentStart) {
        continue
      }

      const key = slotKey(dayIso, hour)
      const list = map.get(key) ?? []
      list.push({
        startMinute: segmentStart - hourStart,
        endMinute: segmentEnd - hourStart,
        entryId: entry.id,
        isStart: segmentStart === startTotal,
        isEnd: segmentEnd === endTotal,
      })
      map.set(key, list)
    }
  }

  return map
})

const entryBySlot = computed(() => {
  const map = new Map<string, TimesheetEntry>()

  for (const entry of timesheets.value) {
    const key = slotKeyFromTime(entry.time_from)
    if (!key) {
      continue
    }

    const current = map.get(key)
    if (!current || entry.time_from > current.time_from) {
      map.set(key, entry)
    }
  }

  return map
})

function goToPreviousMonth() {
  selectedMonth.value = new Date(
    selectedMonth.value.getFullYear(),
    selectedMonth.value.getMonth() - 1,
    1,
  )
}

function goToNextMonth() {
  selectedMonth.value = new Date(
    selectedMonth.value.getFullYear(),
    selectedMonth.value.getMonth() + 1,
    1,
  )
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function openDrawer(
  day: CalendarDay,
  hour: number,
) {
  selectedSlot.value = { day, hour }
  selectedEntry.value = entryBySlot.value.get(slotKey(day.iso, hour)) ?? null
  isDrawerOpen.value = true
}

function getSlotSummary(dayIso: string, hour: number) {
  const summary = timesheetSummary.value.get(slotKey(dayIso, hour))
  if (!summary) {
    return ''
  }

  if (summary.totalMinutes > 0) {
    return `${summary.totalMinutes}m`
  }

  return `${summary.count}×`
}

function getSlotSegments(dayIso: string, hour: number) {
  return segmentsBySlot.value.get(slotKey(dayIso, hour)) ?? []
}

async function loadTimesheets() {
  if (!hasActiveDatabase.value) {
    timesheets.value = []
    return
  }

  isLoadingTimesheets.value = true
  loadError.value = ''

  try {
    const startDate = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth(), 1)
    const endDate = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth() + 1, 1)
    timesheets.value = await listTimesheetsBetween(
      formatLocalDateTime(startDate),
      formatLocalDateTime(endDate),
    )
  } catch (error) {
    loadError.value = toErrorMessage(error)
  } finally {
    isLoadingTimesheets.value = false
  }
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Si e\' verificato un errore inatteso.'
}

watch([selectedMonth, activeDatabaseName], () => {
  loadTimesheets()
}, { immediate: true })
</script>
