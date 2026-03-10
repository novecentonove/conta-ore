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
            >
              <span class="sr-only">
                Registra ore per il {{ day.dayNumber }} {{ day.weekdayLabel }} alle {{ formatHour(hour) }}
              </span>
            </button>
          </template>
        </div>
      </div>
    </section>
  </InnerPage>
</template>

<script setup lang="ts">
import InnerPage from '@/components/layout/innerPage.vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed, ref } from 'vue'

const dailyStartingHour = 9
const dailyFinishingHour = 19
const cellHeight = '20px'
const cellWidth = '100px'
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
