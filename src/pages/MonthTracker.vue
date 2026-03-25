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
        :base-finishing-hour="dailyFinishingHour"
        :extended-finishing-hour="extendedDailyFinishingHour"
        :is-extended-hour-range="isExtendedHourRange"
        :grid-template-columns="gridTemplateColumns"
        :corner-header-style="cornerHeaderStyle"
        :column-header-style="columnHeaderStyle"
        :row-header-style="rowHeaderStyle"
        :cell-style="cellStyle"
        :format-hour="formatHour"
        :get-day-total-label="getDayTotalLabel"
        :month-total-label="monthTotalLabel"
        :project-totals="projectTotals"
        :get-slot-summary="getSlotSummary"
        :get-slot-segments="getSlotSegments"
        :timesheet-fill-color="timesheetFillColor"
        :timesheet-border-color="timesheetBorderColor"
        :month-label="monthLabel"
        @select-slot="openDrawer"
        @toggle-hour-range="handleToggleHourRange"
        @tracker-saved="loadTimesheets"
        @tracker-error="handleTrackerError"
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
  DEFAULT_TIMESHEET_COLOR,
  getDefaultTimesheetColor,
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
const extendedDailyFinishingHour = 23
const cellHeight = '20px'
const cellMinWidth = '72px'
const dayHeaderWidth = '128px'
const defaultTimesheetColor = ref(DEFAULT_TIMESHEET_COLOR)
const timesheetFillColor = computed(() => toRgba(defaultTimesheetColor.value, 0.35))
const timesheetBorderColor = computed(() => toRgba(defaultTimesheetColor.value, 0.8))
const isExtendedHourRange = ref(false)

const selectedMonth = ref(startOfMonth(new Date()))
const isDrawerOpen = ref(false)
const selectedSlot = ref<{
  day: CalendarDay
  hour: number
  startMinute?: number
  endMinute?: number
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
    {
      length: (
        (isExtendedHourRange.value ? extendedDailyFinishingHour : dailyFinishingHour)
        - dailyStartingHour
        + 1
      ),
    },
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
  gridTemplateColumns: `${dayHeaderWidth} repeat(${hours.value.length}, minmax(${cellMinWidth}, 1fr))`,
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
  minWidth: cellMinWidth,
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
  overflow: 'visible',
  minWidth: cellMinWidth,
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

const dailyTotals = computed(() => {
  const totals = new Map<string, number>()

  for (const entry of timesheets.value) {
    if (!entry.time_to) {
      continue
    }

    const startDate = parseLocalDateTime(entry.time_from)
    const endDate = parseLocalDateTime(entry.time_to)

    if (!startDate || !endDate || endDate <= startDate) {
      continue
    }

    let cursor = new Date(startDate)

    while (cursor < endDate) {
      const dayIso = toIsoDate(cursor)
      const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
      const segmentEnd = endDate < dayEnd ? endDate : dayEnd
      const minutes = Math.round((segmentEnd.getTime() - cursor.getTime()) / 60000)

      if (minutes > 0) {
        totals.set(dayIso, (totals.get(dayIso) ?? 0) + minutes)
      }

      cursor = dayEnd
    }
  }

  return totals
})

const monthTotalMinutes = computed(() => {
  let total = 0
  for (const day of daysInMonth.value) {
    total += dailyTotals.value.get(day.iso) ?? 0
  }
  return total
})

const monthTotalLabel = computed(() => formatDuration(monthTotalMinutes.value, { showZero: true }))

const projectTotals = computed(() => {
  const monthStart = new Date(
    selectedMonth.value.getFullYear(),
    selectedMonth.value.getMonth(),
    1,
  )
  const monthEnd = new Date(
    selectedMonth.value.getFullYear(),
    selectedMonth.value.getMonth() + 1,
    1,
  )
  const totals = new Map<string, { id: number | null; name: string; color: string; minutes: number }>()

  for (const entry of timesheets.value) {
    if (!entry.time_to) {
      continue
    }

    const startDate = parseLocalDateTime(entry.time_from)
    const endDate = parseLocalDateTime(entry.time_to)

    if (!startDate || !endDate || endDate <= startDate) {
      continue
    }

    const clampedStart = startDate < monthStart ? monthStart : startDate
    const clampedEnd = endDate > monthEnd ? monthEnd : endDate

    if (clampedEnd <= clampedStart) {
      continue
    }

    const minutes = Math.round((clampedEnd.getTime() - clampedStart.getTime()) / 60000)
    if (minutes <= 0) {
      continue
    }

    const projectName = entry.project_name?.trim()
    const name = projectName
      ? projectName
      : entry.project_id === null
        ? 'Senza progetto'
        : 'Progetto sconosciuto'
    const key = entry.project_id !== null ? `id:${entry.project_id}` : 'none'

    const current = totals.get(key) ?? {
      id: entry.project_id,
      name,
      color: resolveTimesheetColor(entry),
      minutes: 0,
    }

    current.minutes += minutes
    totals.set(key, current)
  }

  return Array.from(totals.values())
    .filter((item) => item.minutes > 0)
    .map((item) => ({
      ...item,
      totalLabel: formatDuration(item.minutes, { showZero: true }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it-IT', { sensitivity: 'base' }))
})

type SlotSegment = {
  startMinute: number
  endMinute: number
  entryId: number
  isStart: boolean
  isEnd: boolean
  fillColor: string
  borderColor: string
}

type SlotSelectionPayload = {
  day: CalendarDay
  hour: number
  startMinute: number
  endMinute: number
  entryId: number | null
}

const segmentsBySlot = computed(() => {
  const map = new Map<string, SlotSegment[]>()

  for (const entry of timesheets.value) {
    if (!entry.time_to) {
      continue
    }

    const entryColor = resolveTimesheetColor(entry)
    const fillColor = toRgba(entryColor, 0.35)
    const borderColor = toRgba(entryColor, 0.8)

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
        fillColor,
        borderColor,
      })
      map.set(key, list)
    }
  }

  return map
})

const entryById = computed(() => {
  const map = new Map<number, TimesheetEntry>()

  for (const entry of timesheets.value) {
    map.set(entry.id, entry)
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

function handleToggleHourRange(nextValue: boolean) {
  isExtendedHourRange.value = nextValue
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function openDrawer(payload: SlotSelectionPayload) {
  const {
    day,
    hour,
    startMinute,
    endMinute,
    entryId,
  } = payload

  selectedSlot.value = { day, hour, startMinute, endMinute }
  selectedEntry.value = entryId !== null ? entryById.value.get(entryId) ?? null : null
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

function getDayTotalLabel(dayIso: string) {
  const totalMinutes = dailyTotals.value.get(dayIso)
  if (!totalMinutes) {
    return ''
  }

  return formatDuration(totalMinutes)
}

function getSlotSegments(dayIso: string, hour: number) {
  return segmentsBySlot.value.get(slotKey(dayIso, hour)) ?? []
}

function resolveTimesheetColor(entry: TimesheetEntry) {
  return (
    normalizeHexColor(entry.project_color)
    ?? normalizeHexColor(defaultTimesheetColor.value)
    ?? DEFAULT_TIMESHEET_COLOR
  )
}

function normalizeHexColor(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return null
  }

  const match6 = /^#([0-9a-f]{6})$/.exec(trimmed)
  if (match6) {
    return `#${match6[1]}`
  }

  const match3 = /^#([0-9a-f]{3})$/.exec(trimmed)
  if (match3) {
    return `#${match3[1].split('').map((ch) => ch + ch).join('')}`
  }

  return null
}

function toRgba(hex: string, alpha: number) {
  const normalized = normalizeHexColor(hex) ?? DEFAULT_TIMESHEET_COLOR
  const value = normalized.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function formatDuration(
  totalMinutes: number,
  options: { showZero?: boolean } = {},
) {
  if (totalMinutes <= 0) {
    return options.showZero ? '00:00' : ''
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

async function loadTimesheets() {
  if (!hasActiveDatabase.value) {
    timesheets.value = []
    loadError.value = ''
    isLoadingTimesheets.value = false
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

async function loadDefaultTimesheetColor() {
  if (!hasActiveDatabase.value) {
    defaultTimesheetColor.value = DEFAULT_TIMESHEET_COLOR
    return
  }

  try {
    defaultTimesheetColor.value = await getDefaultTimesheetColor()
  } catch {
    defaultTimesheetColor.value = DEFAULT_TIMESHEET_COLOR
  }
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Si e\' verificato un errore inatteso.'
}

function handleTrackerError(message: string) {
  loadError.value = message
}

watch([selectedMonth, activeDatabaseName], () => {
  loadTimesheets()
  loadDefaultTimesheetColor()
}, { immediate: true })
</script>
