<template>
  <InnerPage>
    <section class="flex min-h-0 flex-1 flex-col gap-6">
      <MonthTrackerHeader
        :month-label="monthLabel"
        @previous="goToPreviousMonth"
        @next="goToNextMonth"
      />

      <MonthSimpleGrid
        :days="daysInMonth"
        :daily-starting-hour="dailyStartingHour"
        :get-day-entries="getDayEntries"
        :get-day-total-label="getDayTotalLabel"
        :get-day-project-totals="getDayProjectTotals"
        @select-slot="openDrawer"
      />

      <div class="w-full">
        <MonthlyFooter
          :hours="hours"
          :cell-style="cellStyle"
          :total-label="monthTotalLabel"
          :project-totals="projectTotals"
          :month-label="monthLabel"
          @saved="loadTimesheets"
          @error="handleTrackerError"
        />
      </div>

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
import MonthlyFooter from '@/components/month-tracker/MonthlyFooter.vue'
import MonthSimpleGrid from '@/components/month-tracker/MonthSimpleGrid.vue'
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
  formatLocalDateTime,
  formatTime,
  normalizeWeekdayLabel,
  parseLocalDateTime,
  toIsoDate,
  type CalendarDay,
} from '@/lib/time'
import { computed, ref, watch } from 'vue'

const dailyStartingHour = 9
const dailyFinishingHour = 19
const cellHeight = '20px'
const defaultTimesheetColor = ref(DEFAULT_TIMESHEET_COLOR)

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

const cellStyle = computed(() => ({
  minHeight: cellHeight,
  height: cellHeight,
  maxHeight: cellHeight,
}))

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

type DayEntry = {
  id: number
  label: string
  startHour: number
  startMinute: number
  endMinute: number
  textColor: string
  borderColor: string
  backgroundColor: string
}

type DayProjectTotal = {
  id: number | null
  name: string
  color: string
  totalLabel: string
}

type SlotSelectionPayload = {
  day: CalendarDay
  hour: number
  startMinute: number
  endMinute: number
  entryId: number | null
}

const dayEntriesByIso = computed(() => {
  const map = new Map<string, DayEntry[]>()

  for (const entry of timesheets.value) {
    if (!entry.time_to) {
      continue
    }

    const startDate = parseLocalDateTime(entry.time_from)
    const endDate = parseLocalDateTime(entry.time_to)
    if (!startDate || !endDate || endDate <= startDate) {
      continue
    }

    const dayIso = toIsoDate(startDate)
    const startHour = startDate.getHours()
    const startMinute = startDate.getMinutes()
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    const endMinute = startMinute + durationMinutes
    const color = resolveTimesheetColor(entry)
    const list = map.get(dayIso) ?? []

    list.push({
      id: entry.id,
      label: `${formatTime(startDate)}-${formatTime(endDate)}`,
      startHour,
      startMinute,
      endMinute,
      textColor: color,
      borderColor: toRgba(color, 0.8),
      backgroundColor: toRgba(color, 0.2),
    })

    map.set(dayIso, list)
  }

  return map
})

const dayProjectTotalsByIso = computed(() => {
  const totalsByDay = new Map<string, Map<string, { id: number | null; name: string; color: string; minutes: number }>>()

  for (const entry of timesheets.value) {
    if (!entry.time_to) {
      continue
    }

    const startDate = parseLocalDateTime(entry.time_from)
    const endDate = parseLocalDateTime(entry.time_to)
    if (!startDate || !endDate || endDate <= startDate) {
      continue
    }

    const projectName = entry.project_name?.trim()
    const name = projectName
      ? projectName
      : entry.project_id === null
        ? 'Senza progetto'
        : 'Progetto sconosciuto'
    const key = entry.project_id !== null ? `id:${entry.project_id}` : 'none'
    const color = resolveTimesheetColor(entry)

    let cursor = new Date(startDate)

    while (cursor < endDate) {
      const dayIso = toIsoDate(cursor)
      const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
      const segmentEnd = endDate < dayEnd ? endDate : dayEnd
      const minutes = Math.round((segmentEnd.getTime() - cursor.getTime()) / 60000)

      if (minutes > 0) {
        const dayTotals = totalsByDay.get(dayIso) ?? new Map<string, {
          id: number | null
          name: string
          color: string
          minutes: number
        }>()
        const current = dayTotals.get(key) ?? {
          id: entry.project_id,
          name,
          color,
          minutes: 0,
        }
        current.minutes += minutes
        dayTotals.set(key, current)
        totalsByDay.set(dayIso, dayTotals)
      }

      cursor = dayEnd
    }
  }

  const result = new Map<string, DayProjectTotal[]>()
  for (const [dayIso, dayTotals] of totalsByDay.entries()) {
    const list = Array.from(dayTotals.values())
      .filter((item) => item.minutes > 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        color: item.color,
        totalLabel: formatDuration(item.minutes, { showZero: true }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'it-IT', { sensitivity: 'base' }))
    result.set(dayIso, list)
  }

  return result
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

function getDayEntries(dayIso: string) {
  return dayEntriesByIso.value.get(dayIso) ?? []
}

function getDayTotalLabel(dayIso: string) {
  const totalMinutes = dailyTotals.value.get(dayIso)
  if (!totalMinutes) {
    return ''
  }

  return formatDuration(totalMinutes)
}

function getDayProjectTotals(dayIso: string) {
  return dayProjectTotalsByIso.value.get(dayIso) ?? []
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

  const hoursValue = Math.floor(totalMinutes / 60)
  const minutesValue = totalMinutes % 60

  return `${String(hoursValue).padStart(2, '0')}:${String(minutesValue).padStart(2, '0')}`
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
