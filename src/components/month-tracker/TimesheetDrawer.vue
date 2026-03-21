<template>
  <Drawer :open="open" handle-only @update:open="emit('update:open', $event)">
    <DrawerContent class="bg-[#1E1E28] px-16">
      <div class="flex justify-between items-start">

        <div>
          <DrawerTitle class="text-white">
            {{ drawerTitle }}
          </DrawerTitle>
          <DrawerDescription class="text-white/70">
            {{ selectedSlotLabel }}
          </DrawerDescription>
        </div>

        <Button
          variant="link"
          class="w-8 text-white"
          @click="emit('update:open', false)"
          :disabled="isSaving || isDeleting"
        >
          <CloseIcon />
        </Button>

      </div>
      <DrawerHeader>
      </DrawerHeader>

      <div class="pb-4 text-sm text-white/70">
        <div class="flex flex-col gap-4">

          <div class="flex gap-6">
            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel">
                Inizio
              </label>
              <Input
                v-model="startTime"
                type="time"
                :class="ui.input"
                :disabled="isSaving || isDeleting || !hasActiveDatabase"
              />
            </div>
            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel">
                Fine
              </label>
              <Input
                v-model="endTime"
                type="time"
                :class="ui.input"
                :disabled="isSaving || isDeleting || !hasActiveDatabase"
              />
            </div>

            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel">
                Progetto
              </label>
            <select
              v-model="selectedProjectId"
              :class="ui.select"
              :disabled="isSaving || isDeleting || !hasActiveDatabase || isLoadingProjects"
            >
                <option value="">
                  Nessun progetto
                </option>
                <option
                  v-for="project in projects"
                  :key="project.id"
                  :value="String(project.id)"
                >
                  {{ project.name }} · {{ project.customer_name }}
                </option>
              </select>
              <p v-if="projectsError" class="text-xs text-rose-300">
                {{ projectsError }}
              </p>
              <p
                v-else-if="hasActiveDatabase && !isLoadingProjects && projects.length === 0"
                class="text-xs text-white/45"
              >
                Nessun progetto disponibile.
              </p>
            </div>

          </div>

          <div :class="[ui.formGrid, 'min-w-55 flex-1']">
            <label :class="ui.fieldLabel">
              Nota
            </label>
            <Textarea
              v-model="note"
              rows="3"
              :class="ui.textarea"
              :disabled="isSaving || isDeleting || !hasActiveDatabase"
            />
          </div>
        </div>
      </div>

      <p v-if="!hasActiveDatabase" class="px-4 text-sm text-amber-200">
        Seleziona un database per salvare le ore.
      </p>
      <p v-if="saveError" class="px-4 text-sm text-rose-300">
        {{ saveError }}
      </p>

      <DrawerFooter class="flex-col items-stretch gap-3">
        <div class="flex items-center">
          <ConfirmDialog
            v-if="existingEntry"
            v-model:open="showDeleteConfirm"
            title="Eliminare la traccia?"
            description="Questa azione elimina definitivamente l'orario selezionato."
            :confirm-label="isDeleting ? 'Eliminazione...' : 'Elimina'"
            :confirm-disabled="isDeleting"
            :cancel-disabled="isDeleting"
            @confirm="handleDelete"
          >
            <template #trigger>
              <Button
                variant="destructive"
                :disabled="isSaving || isDeleting"
              >
                Elimina
              </Button>
            </template>
          </ConfirmDialog>
          <Button class="ml-auto" :disabled="!canSave || isSaving || isDeleting" @click="handleSave">
            {{ isSaving ? 'Salvataggio...' : submitLabel }}
          </Button>
        </div>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  createTimesheet,
  deleteTimesheet,
  listProjects,
  updateTimesheet,
  type ProjectWithCustomer,
  type TimesheetEntry,
} from '@/lib/database'
import type { CalendarDay } from '@/lib/time'
import {
  addMinutesToTime,
  buildDateFromSlot,
  formatHour,
  formatLocalDateTime,
  formatTime,
  isValidTime,
  parseLocalDateTime,
  parseTime,
} from '@/lib/time'
import CloseIcon from '@/icons/CloseIcon.vue'
import { ui } from '@/lib/ui-classes'

type SelectedSlot = {
  day: CalendarDay
  hour: number
  startMinute?: number
  endMinute?: number
}

const props = defineProps<{
  open: boolean
  selectedSlot: SelectedSlot | null
  existingEntry: TimesheetEntry | null
  hasActiveDatabase: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'saved'): void
}>()

const defaultDurationMinutes = 60
const startTime = ref('')
const endTime = ref('')
const note = ref('')
const selectedProjectId = ref('')
const projects = ref<ProjectWithCustomer[]>([])
const isLoadingProjects = ref(false)
const projectsError = ref('')
const isSaving = ref(false)
const isDeleting = ref(false)
const showDeleteConfirm = ref(false)
const saveError = ref('')

const drawerTitle = computed(() => (
  props.existingEntry ? 'Modifica traccia' : 'Crea traccia'
))
const submitLabel = computed(() => (
  props.existingEntry ? 'Aggiorna' : 'Salva'
))

const selectedSlotLabel = computed(() => {
  if (!props.selectedSlot) {
    return 'Seleziona una cella per inserire l\'orario.'
  }

  const { day, hour, startMinute, endMinute } = props.selectedSlot
  const hasRange = (
    typeof startMinute === 'number'
    && typeof endMinute === 'number'
    && endMinute > startMinute
  )

  if (!hasRange) {
    return `${day.dayNumber} ${day.weekdayLabel} • ${formatHour(hour)}`
  }

  return `${day.dayNumber} ${day.weekdayLabel} • ${formatTimeFromHourMinute(hour, startMinute)}-${formatTimeFromHourMinute(hour, endMinute)}`
})

const canSave = computed(() =>
  Boolean(props.selectedSlot && props.hasActiveDatabase && isValidTime(startTime.value)),
)

watch(
  () => [props.selectedSlot, props.existingEntry, props.open] as const,
  ([slot, entry, isOpen]) => {
    if (!slot || !isOpen) {
      return
    }

    showDeleteConfirm.value = false

    if (entry) {
      const startDate = parseLocalDateTime(entry.time_from)
      const endDate = entry.time_to ? parseLocalDateTime(entry.time_to) : null

      startTime.value = startDate
        ? formatTime(startDate)
        : `${String(slot.hour).padStart(2, '0')}:00`
      endTime.value = endDate
        ? formatTime(endDate)
        : addMinutesToTime(startTime.value, defaultDurationMinutes)
      note.value = entry.note ?? ''
      selectedProjectId.value = entry.project_id ? String(entry.project_id) : ''
    } else {
      const rangeStartMinute = normalizeMinute(slot.startMinute, 0)
      const rangeEndMinute = normalizeMinute(slot.endMinute, 60)
      startTime.value = formatTimeFromHourMinute(slot.hour, rangeStartMinute)
      endTime.value = rangeEndMinute > rangeStartMinute
        ? formatTimeFromHourMinute(slot.hour, rangeEndMinute)
        : addMinutesToTime(startTime.value, defaultDurationMinutes)
      note.value = ''
      selectedProjectId.value = ''
    }
    saveError.value = ''

    if (props.hasActiveDatabase) {
      loadProjects()
    }
  },
)

function normalizeMinute(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }

  return Math.max(0, Math.min(60, Math.floor(value)))
}

function formatTimeFromHourMinute(hour: number, minute: number) {
  const date = new Date(0, 0, 0, hour, 0)
  date.setMinutes(normalizeMinute(minute, 0))
  return formatTime(date)
}

async function handleSave() {
  if (!props.selectedSlot) {
    return
  }

  if (!props.hasActiveDatabase) {
    saveError.value = 'Seleziona un database prima di salvare.'
    return
  }

  if (!isValidTime(startTime.value)) {
    saveError.value = 'Inserisci un orario di inizio valido.'
    return
  }

  const { day } = props.selectedSlot
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
    const projectId = parseProjectId()
    const payload = {
      time_from: formatLocalDateTime(startDate),
      time_to: endDate ? formatLocalDateTime(endDate) : null,
      note: note.value.trim() || null,
      project_id: projectId,
    }

    if (props.existingEntry) {
      await updateTimesheet({
        id: props.existingEntry.id,
        ...payload,
      })
    } else {
      await createTimesheet(payload)
    }

    emit('saved')
    emit('update:open', false)
  } catch (error) {
    saveError.value = toErrorMessage(error)
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!props.existingEntry) {
    return
  }

  if (isDeleting.value) {
    return
  }

  if (!props.hasActiveDatabase) {
    saveError.value = 'Seleziona un database prima di eliminare.'
    return
  }

  isDeleting.value = true
  saveError.value = ''

  try {
    await deleteTimesheet(props.existingEntry.id)
    emit('saved')
    emit('update:open', false)
  } catch (error) {
    saveError.value = toErrorMessage(error)
  } finally {
    isDeleting.value = false
  }
}

async function loadProjects() {
  if (!props.hasActiveDatabase) {
    projects.value = []
    projectsError.value = ''
    return
  }

  isLoadingProjects.value = true
  projectsError.value = ''

  try {
    projects.value = await listProjects()
  } catch (error) {
    projectsError.value = toErrorMessage(error)
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

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  try {
    return JSON.stringify(error)
  } catch {
    // ignore
  }

  return 'Si e\' verificato un errore inatteso.'
}
</script>
