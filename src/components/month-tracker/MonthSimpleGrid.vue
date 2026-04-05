<template>
  <div class="flex min-h-0 flex-1 min-w-0">
    <div class="min-h-0 min-w-0 flex-1 overflow-y-auto pr-8 pb-8">
      <div
        class="grid w-full min-w-0 rounded"
        :style="{ gridTemplateColumns: `${leftColumnWidth} minmax(0,1fr)` }"
      >
        <template v-for="day in days" :key="`row-${day.iso}`">
          <div
            :class="[
              'border-b border-white/8 px-3 py-1',
              isToday(day.iso) ? todayRowBgClass : defaultRowBgClass,
            ]"
            class="border-r border-white/15"
          >
            <div class="flex items-start gap-2">
              <div class="flex items-center space-x-2">
                <span
                  :class="[
                    'w-6 pr-0.5 text-right text-sm font-semibold tabular-nums text-white',
                    isToday(day.iso) ? 'border border-white' : '',
                    isWeekend(day.iso) ? 'opacity-35' : '',
                  ]"
                >
                  {{ day.dayNumber }}
                </span>
                <span
                  :class="[
                    'w-10 text-left text-xs font-semibold uppercase text-white/45',
                    isWeekend(day.iso) ? 'opacity-35' : '',
                  ]"
                >
                  {{ day.weekdayLabel }}
                </span>
              </div>

              <!-- parzialli giornalieri -->
              <div
                class="shrink-0 self-stretch pr-4 text-right"
                :style="{
                  minWidth: dailyTotalsMinWidth,
                  flexBasis: dailyTotalsFlexBasis,
                }"
              >
                <div class="text-[12px] tabular-nums text-white/60">

                  <span class="pr-2">
                  {{ getDayTotalLabel(day.iso) }}
                  </span>

                  <template v-if="getDayProjectTotals(day.iso).length > 0">
                    
                    <span
                      v-for="projectTotal in getDayProjectTotals(day.iso)"
                      :key="`${day.iso}-${projectTotal.id ?? projectTotal.name}`"
                      class="text-[10px] tabular-nums px-1"
                      :style="{ color: projectTotal.color }"
                    >
                      {{ projectTotal.totalLabel }}
                    </span>

                  </template>

                </div>
              </div>
            </div>
          </div>

          <!-- barra delle ore tracciate -->
          <div
            role="button"
            tabindex="0"
            :class="[
              'min-h-8 border-b border-white/8 px-2 transition outline-none',
              isToday(day.iso) ? todayRowBgClass : defaultRowBgClass,
              'hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-white/30',
            ]"
            @click="handleRowClick(day)"
            @keydown.enter.prevent="handleRowKeyboardSelect(day)"
            @keydown.space.prevent="handleRowKeyboardSelect(day)"
          >
            <div class="flex flex-wrap items-center gap-1.5 py-1">
              <button
                v-for="entry in getDayEntries(day.iso)"
                :key="entry.id"
                type="button"
                class="rounded-[3px] border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-white/25"
                :style="{
                  color: entry.textColor,
                  borderColor: entry.borderColor,
                  backgroundColor: entry.backgroundColor,
                }"
                @click.stop="handleEntryClick(day, entry)"
              >
                {{ entry.label }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toIsoDate, type CalendarDay } from '@/lib/time'

type SimpleDayEntry = {
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

const props = defineProps<{
  days: CalendarDay[]
  dailyStartingHour: number
  getDayEntries: (dayIso: string) => SimpleDayEntry[]
  getDayTotalLabel: (dayIso: string) => string
  getDayProjectTotals: (dayIso: string) => DayProjectTotal[]
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
}>()

const todayRowBgClass = 'bg-white/[0.05]'
const defaultRowBgClass = 'bg-transparent'
const leftColumnWidth = 'max-content'
// Easily adjustable size for the daily totals block.
const dailyTotalsMinWidth = '150px'
const dailyTotalsFlexBasis = '100px'

function handleRowClick(day: CalendarDay) {
  emit('select-slot', {
    day,
    hour: props.dailyStartingHour,
    startMinute: 0,
    endMinute: 60,
    entryId: null,
  })
}

function handleRowKeyboardSelect(day: CalendarDay) {
  handleRowClick(day)
}

function handleEntryClick(day: CalendarDay, entry: SimpleDayEntry) {
  emit('select-slot', {
    day,
    hour: entry.startHour,
    startMinute: entry.startMinute,
    endMinute: entry.endMinute,
    entryId: entry.id,
  })
}

function isWeekend(dayIso: string) {
  const date = new Date(`${dayIso}T00:00:00`)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

function isToday(dayIso: string) {
  return dayIso === toIsoDate(new Date())
}
</script>
