<template>
  <div class="w-full flex items-start justify-between gap-4 bg-[#15151b] p-4">

    <!-- tracciatore -->
    <div class="flex-1 max-w-2xl rounded-sm border border-white/10 bg-dark-600 px-3 py-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-3 text-[11px] text-white/60">
          <div>
            <div class="uppercase text-white/35">
              Inizio
            </div>
            <div class="tabular-nums text-white/80">
              <button
                v-if="!isEditingStart"
                type="button"
                class="rounded px-1 -mx-1 text-left tabular-nums text-white/80 transition hover:text-white disabled:cursor-default disabled:opacity-70"
                :disabled="!canEditStart"
                @dblclick="beginEditStart"
              >
                {{ startLabel }}
              </button>
              <input
                v-else
                ref="startInputRef"
                v-model="startInput"
                type="time"
                class="h-7 w-24 rounded border border-white/15 bg-[#1C1C26] px-2 text-xs text-white/80 outline-none focus:border-white/30"
                @blur="commitStartEdit"
                @keydown.enter.prevent="commitStartEdit"
                @keydown.escape.prevent="cancelStartEdit"
              />
            </div>
          </div>
          <div>
            <div class="uppercase text-white/35">
              Fine
            </div>
            <div class="tabular-nums text-white/80">
              <button
                v-if="!isEditingEnd"
                type="button"
                class="rounded px-1 -mx-1 text-left tabular-nums text-white/80 transition hover:text-white disabled:cursor-default disabled:opacity-70"
                :disabled="!canEditEnd"
                @dblclick="beginEditEnd"
              >
                {{ endLabel }}
              </button>
              <input
                v-else
                ref="endInputRef"
                v-model="endInput"
                type="time"
                class="h-7 w-24 rounded border border-white/15 bg-[#1C1C26] px-2 text-xs text-white/80 outline-none focus:border-white/30"
                @blur="commitEndEdit"
                @keydown.enter.prevent="commitEndEdit"
                @keydown.escape.prevent="cancelEndEdit"
              />
            </div>
          </div>
        </div>

        <div class="flex-1 min-w-12 max-w-52 h-9.25">
          <label class="sr-only" for="tracker-comment">
            Commento
          </label>
          <textarea
            id="tracker-comment"
            v-model="comment"
            rows="2"
            class="h-full w-full resize-none rounded-lg border border-white/10 bg-[#1C1C26] px-2 py-1 text-xs text-white/80 outline-none ring-0 placeholder:text-white/30 focus:border-white/25 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Commento"
          />
        </div>

        <div class="min-w-48 h-9.25">
          <label class="sr-only" for="tracker-project">
            Progetto
          </label>
          <NativeSelect
            id="tracker-project"
            v-model="selectedProjectId"
            class="h-full min-w-48 rounded-lg border border-white/10 bg-[#1C1C26] px-2 text-xs text-white/80 outline-none ring-0 focus:border-white/25 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!hasActiveDatabase || isLoadingProjects"
          >
            <option value="">
              Nessun progetto
            </option>
            <option
              v-for="project in projects"
              :key="project.id"
              :value="String(project.id)"
              :title="project.customer_name"
            >
              {{ project.name }} 
            </option>
          </NativeSelect>
        </div>

        <div class="h-10 border-r border-white/10">

        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center text-white/65 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="isTracking || isComplete"
            aria-label="Avvia tracking"
            @click="handleStart"
          >
            <Play class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center text-white/65 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!isTracking || isComplete"
            aria-label="Ferma tracking"
            @click="handleStop"
          >
            <Square class="h-4 w-4" />
          </button>
          <Button
            variant="ghost"
            size="sm"
            class="h-8 border border-white/15 bg-white/10 px-3 text-[11px] font-semibold uppercase text-white/80 hover:bg-white/15"
            :disabled="!canSave"
            @click="handleSave"
          >
            Salva
          </Button>
          <ConfirmDialog
            v-model:open="showResetConfirm"
            title="Resettare il tracciato?"
            description="Questa azione cancella orari e commento."
            confirm-label="Resetta"
            @confirm="handleResetConfirm"
          >
            <template #trigger>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center text-white/35 transition hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!canReset"
                aria-label="Reset tracker"
              >
                <X class="h-4 w-4" />
              </button>
            </template>
          </ConfirmDialog>
        </div>
      </div>
    </div>

    <!-- Totali -->
    <div class="w-72 px-3 flex flex-col items-end gap-2 text-right">
      <div v-if="projectTotals.length > 0" class="flex flex-col items-end gap-1">
        <div
          v-for="project in projectTotals"
          :key="project.id ?? project.name"
          class="flex items-center gap-2"
        >
          <span
            class="text-[11px] font-semibold uppercase text-white/45 underline underline-offset-4"
            :style="{ textDecorationColor: project.color }"
          >
            {{ project.name }}
          </span>
          <span class="text-[12px] text-white/60 tabular-nums">
            {{ project.totalLabel }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2 text-white">
        <span class="text-xs font-semibold uppercase">
          Totale
        </span>
        <span class="text-[12px] tabular-nums">
          {{ totalLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Play, Square, X } from 'lucide-vue-next'
import { formatLocalDateTime, formatTime, parseTime } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  activeDatabaseName,
  createTimesheet,
  listProjects,
  type ProjectWithCustomer,
} from '@/lib/database'

const props = defineProps<{
  hours: number[]
  cellStyle: Record<string, string | number>
  totalLabel: string
  projectTotals: { id: number | null; name: string; color: string; totalLabel: string }[]
  monthLabel: string
}>()

const emit = defineEmits<{
  (event: 'saved'): void
  (event: 'error', message: string): void
}>()

const startedAt = ref<Date | null>(null)
const stoppedAt = ref<Date | null>(null)
const comment = ref('')
const isTracking = ref(false)
const isEditingStart = ref(false)
const isEditingEnd = ref(false)
const startInput = ref('')
const endInput = ref('')
const startInputRef = ref<HTMLInputElement | null>(null)
const endInputRef = ref<HTMLInputElement | null>(null)
const showResetConfirm = ref(false)
const selectedProjectId = ref('')
const projects = ref<ProjectWithCustomer[]>([])
const isLoadingProjects = ref(false)
const projectsError = ref('')

const hasActiveDatabase = computed(() => Boolean(activeDatabaseName.value))
const startLabel = computed(() => (startedAt.value ? formatTime(startedAt.value) : '--'))
const endLabel = computed(() => (stoppedAt.value ? formatTime(stoppedAt.value) : '--'))
const canSave = computed(() => Boolean(startedAt.value && stoppedAt.value && hasActiveDatabase.value))
const isComplete = computed(() => Boolean(startedAt.value && stoppedAt.value))
const canReset = computed(() => Boolean(
  isTracking.value
  || startedAt.value
  || stoppedAt.value
  || comment.value
  || selectedProjectId.value,
))
const canEditStart = computed(() => Boolean(startedAt.value))
const canEditEnd = computed(() => Boolean(startedAt.value))

function handleStart() {
  if (isComplete.value) {
    return
  }

  const now = new Date()
  startedAt.value = now
  stoppedAt.value = null
  isTracking.value = true
}

function handleStop() {
  if (!isTracking.value || !startedAt.value || isComplete.value) {
    return
  }

  stoppedAt.value = new Date()
  isTracking.value = false
}

function resetTracker() {
  isEditingStart.value = false
  isEditingEnd.value = false
  startInput.value = ''
  endInput.value = ''
  startedAt.value = null
  stoppedAt.value = null
  comment.value = ''
  selectedProjectId.value = ''
  isTracking.value = false
  showResetConfirm.value = false
}

async function handleSave() {
  if (!canSave.value || !startedAt.value || !stoppedAt.value) {
    return
  }

  try {
    const note = comment.value.trim()
    const projectId = parseProjectId()
    await createTimesheet({
      time_from: formatLocalDateTime(startedAt.value),
      time_to: formatLocalDateTime(stoppedAt.value),
      note: note ? note : null,
      project_id: projectId,
    })
    emit('saved')
    resetTracker()
  } catch (error) {
    emit('error', toErrorMessage(error))
  }
}

function handleResetConfirm() {
  resetTracker()
}

async function beginEditStart() {
  if (!canEditStart.value || !startedAt.value) {
    return
  }

  isEditingStart.value = true
  startInput.value = formatTime(startedAt.value)
  await nextTick()
  startInputRef.value?.focus()
}

function commitStartEdit() {
  if (!isEditingStart.value || !startedAt.value) {
    isEditingStart.value = false
    return
  }

  const parsed = parseTime(startInput.value)
  if (parsed) {
    const updated = new Date(startedAt.value)
    updated.setHours(parsed.hours, parsed.minutes, 0, 0)
    startedAt.value = updated
  }

  isEditingStart.value = false
}

function cancelStartEdit() {
  isEditingStart.value = false
}

async function beginEditEnd() {
  if (!canEditEnd.value) {
    return
  }

  isEditingEnd.value = true
  endInput.value = formatTime(stoppedAt.value ?? new Date())
  await nextTick()
  endInputRef.value?.focus()
}

function commitEndEdit() {
  if (!isEditingEnd.value || !startedAt.value) {
    isEditingEnd.value = false
    return
  }

  const parsed = parseTime(endInput.value)
  if (parsed) {
    const base = stoppedAt.value ?? new Date(startedAt.value)
    const updated = new Date(base)
    updated.setHours(parsed.hours, parsed.minutes, 0, 0)
    stoppedAt.value = updated
    isTracking.value = false
  }

  isEditingEnd.value = false
}

function cancelEndEdit() {
  isEditingEnd.value = false
}

async function loadProjects() {
  if (!hasActiveDatabase.value) {
    projects.value = []
    projectsError.value = ''
    selectedProjectId.value = ''
    return
  }

  isLoadingProjects.value = true
  projectsError.value = ''

  try {
    projects.value = await listProjects()
  } catch (error) {
    projectsError.value = toErrorMessage(error)
    emit('error', projectsError.value)
  } finally {
    isLoadingProjects.value = false
  }
}

function parseProjectId() {
  if (!selectedProjectId.value) {
    return null
  }

  const value = Number.parseInt(selectedProjectId.value, 10)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Seleziona un progetto valido.')
  }

  return value
}

watch(
  () => props.monthLabel,
  () => {
    resetTracker()
  },
)

watch(
  () => activeDatabaseName.value,
  () => {
    loadProjects()
  },
  { immediate: true },
)

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Si e\' verificato un errore inatteso.'
}
</script>
