<template>
  <Drawer :open="open" @update:open="emit('update:open', $event)">
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
            <div class="grid gap-2">
              <label class="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                Inizio
              </label>
              <input
              v-model="startTime"
              type="time"
              class="h-9 rounded-md border border-white/10 bg-[#262633] px-3 text-sm text-white/90 outline-none focus:border-white/20 disabled:opacity-60"
              :disabled="isSaving || isDeleting || !hasActiveDatabase"
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
              :disabled="isSaving || isDeleting || !hasActiveDatabase"
            >
            </div>
          </div>

          <div class="grid gap-2 min-w-55 flex-1">
            <label class="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              Nota
            </label>
            <Textarea
              v-model="note"
              rows="3"
              class="min-h-22.5 resize-y bg-[#262633] border-0"
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

      <DrawerFooter class="flex-row items-center">
        <AlertDialog v-if="existingEntry">
          <AlertDialogTrigger as-child>
            <Button
              variant="destructive"
              :disabled="isSaving || isDeleting"
            >
              Elimina
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Eliminare la traccia?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione elimina definitivamente l'orario selezionato.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel :disabled="isDeleting">
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                :disabled="isDeleting"
                @click="handleDelete"
              >
                {{ isDeleting ? 'Eliminazione...' : 'Elimina' }}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button class="ml-auto" :disabled="!canSave || isSaving || isDeleting" @click="handleSave">
          {{ isSaving ? 'Salvataggio...' : submitLabel }}
        </Button>

      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
  updateTimesheet,
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

type SelectedSlot = {
  day: CalendarDay
  hour: number
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
const isSaving = ref(false)
const isDeleting = ref(false)
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

  const { day, hour } = props.selectedSlot
  return `${day.dayNumber} ${day.weekdayLabel} • ${formatHour(hour)}`
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
    } else {
      startTime.value = `${String(slot.hour).padStart(2, '0')}:00`
      endTime.value = addMinutesToTime(startTime.value, defaultDurationMinutes)
      note.value = ''
    }
    saveError.value = ''
  },
)

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
    const payload = {
      time_from: formatLocalDateTime(startDate),
      time_to: endDate ? formatLocalDateTime(endDate) : null,
      note: note.value.trim() || null,
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
