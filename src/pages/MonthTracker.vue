<template>
  <InnerPage>
    <section class="flex min-h-0 flex-1 flex-col gap-6">

      <header class="ml-4 space-y-4">
        <div>
          <h1 class="mt-2 font-semibold text-white">
            {{ monthLabel }}
          </h1>
        </div>

        <!-- goToPreviousMonth -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded border border-white/10 bg-white/5 text-xl text-white transition hover:border-white/20 hover:bg-white/10"
            @click="goToPreviousMonth"
          >
            <ChevronLeft />
          </button>

          <!-- goToNextMonth -->
          <button
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded border border-white/10 bg-white/5 text-xl text-white transition hover:border-white/20 hover:bg-white/10"
            @click="goToNextMonth"
          >
            <ChevronRight />
          </button>
        </div>
      </header>

      <div class="flex-1 min-h-0 min-w-0 overflow-scroll">
        <div
          class="grid w-max gap-px rounded"
          :style="gridTemplateColumns"
        >
          <div
            class="left-0 top-0 z-30 flex items-end px-4 pb-3 text-xs font-semibold uppercase text-white/35"
            :style="cornerHeaderStyle"
          />

          <!--  Columns: Ore  -->
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

          <!--  Columns: Giorni  -->
          <template v-for="day in daysInMonth" :key="`row-${day.iso}`">
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
              @click="openDrawer(day, hour)"
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

      <p v-if="isLoadingTimesheets" class="text-xs text-white/45">
        Caricamento ore...
      </p>
      <p v-if="loadError" class="text-sm text-rose-300">
        {{ loadError }}
      </p>

      <Drawer v-model:open="isDrawerOpen">
        <DrawerContent class="bg-[#1E1E28] text-white">
          <DrawerHeader>
            <DrawerTitle>Registra ore</DrawerTitle>
            <DrawerDescription>
              {{ selectedSlotLabel }}
            </DrawerDescription>
          </DrawerHeader>

          <div class="px-4 pb-4 text-sm text-white/70">
            <div class="flex flex-wrap items-end gap-3">
              <div class="grid gap-2">
                <label class="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                  Inizio
                </label>
                <input
                  v-model="startTime"
                  type="time"
                  class="h-9 rounded-md border border-white/10 bg-[#262633] px-3 text-sm text-white/90 outline-none focus:border-white/20 disabled:opacity-60"
                  :disabled="isSaving || !hasActiveDatabase"
                >
              </div>

              <div class="grid gap-2">
                <label class="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                  Fine
                </label>
                <input
                  v-model="endTime"
                  type="time"
                  class="h-9 rounded-md border border-white/10 bg-[#262633] px-3 text-sm text-white/90 outline-none focus:border-white/20 disabled:opacity-60"
                  :disabled="isSaving || !hasActiveDatabase"
                >
              </div>

              <div class="grid gap-2 min-w-[220px] flex-1">
                <label class="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                  Nota
                </label>
                <input
                  v-model.trim="note"
                  type="text"
                  class="h-9 rounded-md border border-white/10 bg-[#262633] px-3 text-sm text-white/90 outline-none focus:border-white/20 disabled:opacity-60"
                  :disabled="isSaving || !hasActiveDatabase"
                >
              </div>
            </div>
          </div>

          <p v-if="!hasActiveDatabase" class="px-4 text-sm text-amber-200">
            Seleziona un database per salvare le ore.
          </p>
          <p v-if="saveError" class="px-4 text-sm text-rose-300">
            {{ saveError }}
          </p>

          <DrawerFooter class="flex-row items-center justify-end">
            <Button :disabled="!canSave || isSaving" @click="handleSaveTimesheet">
              {{ isSaving ? 'Salvataggio...' : 'Salva' }}
            </Button>
            <Button variant="secondary" @click="isDrawerOpen = false" :disabled="isSaving">
              Chiudi
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </section>
  </InnerPage>
</template>

<script setup lang="ts">
import InnerPage from '@/components/layout/innerPage.vue'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  activeDatabaseName,
  createTimesheet,
  listTimesheetsBetween,
  type TimesheetEntry,
} from '@/lib/database'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

const dailyStartingHour = 9
const dailyFinishingHour = 19
const cellHeight = '20px'
const cellWidth = '100px'
const dayHeaderWidth = '92px'
const defaultDurationMinutes = 60

const selectedMonth = ref(startOfMonth(new Date()))
const isDrawerOpen = ref(false)
const selectedSlot = ref<{
  day: { dayNumber: number; iso: string; weekdayLabel: string }
  hour: number
} | null>(null)
const startTime = ref('')
const endTime = ref('')
const note = ref('')
const isSaving = ref(false)
const saveError = ref('')
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
  const days: Array<{ dayNumber: number; iso: string; weekdayLabel: string }> = []

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

const selectedSlotLabel = computed(() => {
  if (!selectedSlot.value) {
    return 'Seleziona una cella per inserire l\'orario.'
  }

  const { day, hour } = selectedSlot.value
  return `${day.dayNumber} ${day.weekdayLabel} • ${formatHour(hour)}`
})

const canSave = computed(() =>
  Boolean(selectedSlot.value && hasActiveDatabase.value && isValidTime(startTime.value)),
)

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
    current.totalMinutes += Number(entry.duration_minutes ?? 0)
    current.count += 1
    summary.set(key, current)
  }

  return summary
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

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

function openDrawer(
  day: { dayNumber: number; iso: string; weekdayLabel: string },
  hour: number,
) {
  selectedSlot.value = { day, hour }
  startTime.value = `${String(hour).padStart(2, '0')}:00`
  endTime.value = addMinutesToTime(startTime.value, defaultDurationMinutes)
  note.value = ''
  saveError.value = ''
  isDrawerOpen.value = true
}

function buildDateFromSlot(dayIso: string, hour: number, minute = 0) {
  const [year, month, day] = dayIso.split('-').map(Number)
  return new Date(year, month - 1, day, hour, minute)
}

function formatLocalDateTime(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function parseTime(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/)
  if (!match) {
    return null
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return { hours, minutes }
}

function isValidTime(value: string) {
  return Boolean(parseTime(value))
}

function addMinutesToTime(value: string, minutesToAdd: number) {
  const parsed = parseTime(value)
  if (!parsed) {
    return ''
  }

  const date = new Date(0, 0, 0, parsed.hours, parsed.minutes)
  date.setMinutes(date.getMinutes() + minutesToAdd)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function slotKey(dayIso: string, hour: number) {
  return `${dayIso}-${hour}`
}

function slotKeyFromTime(timeFrom: string) {
  const [datePart, timePart] = timeFrom.split(/[T ]/)
  if (!datePart || !timePart) {
    return null
  }

  const hour = Number(timePart.slice(0, 2))
  if (Number.isNaN(hour)) {
    return null
  }

  return slotKey(datePart, hour)
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

async function handleSaveTimesheet() {
  if (!selectedSlot.value) {
    return
  }

  if (!hasActiveDatabase.value) {
    saveError.value = 'Seleziona un database prima di salvare.'
    return
  }

  if (!isValidTime(startTime.value)) {
    saveError.value = 'Inserisci un orario di inizio valido.'
    return
  }

  const { day, hour } = selectedSlot.value
  const startParsed = parseTime(startTime.value)
  const endParsed = parseTime(endTime.value)

  if (!startParsed) {
    saveError.value = 'Inserisci un orario di inizio valido.'
    return
  }

  const startDate = buildDateFromSlot(day.iso, startParsed.hours, startParsed.minutes)
  const endDate = endParsed
    ? buildDateFromSlot(day.iso, endParsed.hours, endParsed.minutes)
    : null
  const durationMinutesValue = endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    : null

  if (durationMinutesValue !== null && durationMinutesValue < 0) {
    saveError.value = 'L\'orario di fine deve essere dopo l\'inizio.'
    return
  }

  isSaving.value = true
  saveError.value = ''

  try {
    await createTimesheet({
      time_from: formatLocalDateTime(startDate),
      time_to: endDate ? formatLocalDateTime(endDate) : null,
      duration_minutes: durationMinutesValue,
      note: note.value.trim() || null,
    })

    await loadTimesheets()
    isDrawerOpen.value = false
  } catch (error) {
    saveError.value = toErrorMessage(error)
  } finally {
    isSaving.value = false
  }
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

function normalizeWeekdayLabel(label: string) {
  return label.replace('.', '').slice(0, 3).toUpperCase()
}

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

watch([selectedMonth, activeDatabaseName], () => {
  loadTimesheets()
}, { immediate: true })
</script>
