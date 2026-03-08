<template>
  <section class="flex h-full flex-col gap-6 px-6 pb-6 pt-4">
    <header class="flex items-center justify-between gap-4">
      <div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-white">
          {{ monthLabel }}
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded border border-white/10 bg-white/5 text-xl text-white transition hover:border-white/20 hover:bg-white/10"
          @click="goToPreviousMonth"
        >
          &lt;
        </button>

        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded border border-white/10 bg-white/5 text-xl text-white transition hover:border-white/20 hover:bg-white/10"
          @click="goToNextMonth"
        >
          &gt;
        </button>
      </div>
    </header>

    <div class="flex-1 overflow-auto rounded border border-white/10 bg-white/[0.03] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div
        class="grid min-w-[1000px] gap-px overflow-hidden rounded bg-white/8"
        :style="gridTemplateColumns"
      >
        <div
          class="sticky left-0 top-0 z-30 flex items-end bg-[#18181F] px-4 pb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/35"
          :style="cornerHeaderStyle"
        />

        <div
          v-for="hour in hours"
          :key="`hour-${hour}`"
          class="sticky top-0 z-20 flex items-end bg-[#18181F] px-1 pb-1 text-left"
          :style="columnHeaderStyle"
        >
          <span class="mt-2 text-sm font-semibold leading-none text-white">
            {{ formatHour(hour) }}
          </span>
        </div>

        <template v-for="day in daysInMonth" :key="`row-${day.iso}`">
          <div
            class="sticky left-0 z-10 flex flex-row justify-center gap-2 bg-[#18181F] px-4 py-0 text-left"
            :style="rowHeaderStyle"
          >
            <span class="text-xl font-semibold text-white">
              {{ day.dayNumber }}
            </span>
            <span class="mt-2 text-xs font-semibold uppercase text-white/45">
              {{ day.weekdayLabel }}
            </span>
          </div>

          <button
            v-for="hour in hours"
            :key="`${day.iso}-${hour}`"
            type="button"
            class="bg-[#20202A] px-3 py-3 text-left transition hover:bg-[#2A2A38] focus:outline-none focus:ring-2 focus:ring-white/20"
            :style="cellStyle"
          >
            <span class="sr-only">
              Registra ore per il {{ day.dayNumber }} {{ day.weekdayLabel }} alle {{ formatHour(hour) }}
            </span>
          </button>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const dailyStartingHour = 9
const dailyFinishingHour = 19
const cellHeight = '15px'
const cellWidth = '84px'
const dayHeaderWidth = '92px'

const selectedMonth = ref(startOfMonth(new Date()))

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

const gridTemplateColumns = computed(() => ({
  gridTemplateColumns: `${dayHeaderWidth} repeat(${hours.value.length}, minmax(${cellWidth}, 1fr))`,
}))

const cornerHeaderStyle = computed(() => ({
  minHeight: cellHeight,
  width: dayHeaderWidth,
}))

const columnHeaderStyle = computed(() => ({
  minHeight: cellHeight,
  minWidth: cellWidth,
}))

const rowHeaderStyle = computed(() => ({
  minHeight: cellHeight,
  width: dayHeaderWidth,
}))

const cellStyle = computed(() => ({
  minHeight: cellHeight,
  minWidth: cellWidth,
}))

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

function normalizeWeekdayLabel(label: string) {
  return label.replace('.', '').slice(0, 3).toUpperCase()
}

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>
