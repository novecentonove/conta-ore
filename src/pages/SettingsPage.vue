<template>
  <InnerPage>

    <p :class="ui.pageKicker" class="mb-6">
      Impostazioni
    </p>

    <hr>

    <section :class="ui.pageSection">
      
      <!-- tracciatore -->
      <div>
        <div>
          <h1 :class="ui.pageTitle">
            Tracciatore
          </h1>
          <p :class="ui.pageSubtitle">
            <!-- // -->
          </p>
        </div>

        <div :class="ui.sectionCard">
          <p :class="ui.pageKicker">
            Tracker giornaliero
          </p>
          <p :class="ui.pageSubtitle">
            Imposta l'intervallo orario mostrato nel Month Tracker.
          </p>

          <div class="flex flex-col gap-4 max-w-sm">
            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel" for="daily-starting-hour">
                Ora di inizio
              </label>
              <Input
                id="daily-starting-hour"
                v-model="dailyStartingHour"
                type="number"
                min="0"
                max="23"
                step="1"
                :class="ui.input"
                :disabled="!hasActiveDatabase || isLoadingDailyHours || isSavingDailyHours"
              />
            </div>

            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel" for="daily-finishing-hour">
                Ora di fine
              </label>
              <Input
                id="daily-finishing-hour"
                v-model="dailyFinishingHour"
                type="number"
                min="0"
                max="23"
                step="1"
                :class="ui.input"
                :disabled="!hasActiveDatabase || isLoadingDailyHours || isSavingDailyHours"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Button
              :disabled="!canSaveDailyHours || isSavingDailyHours"
              @click="handleSaveDailyHours"
            >
              {{ isSavingDailyHours ? 'Salvataggio...' : 'Salva orario' }}
            </Button>
          </div>

          <p v-if="!hasActiveDatabase" class="text-xs text-amber-200">
            Seleziona un database per configurare l'orario giornaliero.
          </p>
          <p v-else-if="isLoadingDailyHours" class="text-xs text-white/45">
            Caricamento orario...
          </p>
          <p v-else-if="dailyHoursStatus" class="text-xs text-emerald-300">
            {{ dailyHoursStatus }}
          </p>
          <p v-if="dailyHoursError" class="text-xs text-rose-300">
            {{ dailyHoursError }}
          </p>
        </div>
      </div>

      <hr>

      <!-- database -->
      <div>
        <div>
          <h1 :class="ui.pageTitle">
            Database
          </h1>
          <p :class="ui.pageSubtitle">
            Seleziona un database esistente oppure crea un nuovo file SQLite
          </p>
        </div>

        <div :class="ui.pageSection">
          <div :class="ui.sectionCard">
            <p :class="ui.pageKicker">
              Database
            </p>
            <p class="mt-3 text-sm text-white/60">
              {{ activeDatabaseName ?? 'Nessun database selezionato' }}
            </p>
            <Button
              :disabled="isBusy || !activeDatabaseName"
              @click="handleDetachDatabase"
            >
              {{ isBusy ? 'Attendi...' : 'Sgancia database' }}
            </Button>
          </div>

          <div :class="ui.section">
            <p :class="ui.pageKicker">
              Seleziona Database
            </p>
            <p :class="ui.pageSubtitle">
              Scegli un file SQLite gia' esistente e impostalo come database attivo.
            </p>
            <Button 
              variant="secondary"
              :disabled="isBusy || activeDatabaseName !== null"
              @click="handleSelectDatabase"
            >
              {{ isBusy ? 'Attendi...' : 'Seleziona database' }}
            </Button>
          </div>

          <div :class="ui.section">
            <p :class="ui.pageKicker">
              Crea Database
            </p>
            <p :class="ui.pageSubtitle">
              Crea un nuovo file SQLite: verra' attivato automaticamente.
            </p>
            <div class="space-y-3 mt-5 gap-3 max-w-2xl">
              <Button
                variant="secondary"
                :disabled="isBusy || activeDatabaseName !== null"
                @click="handleCreateDatabase"
              >
                {{ isBusy ? 'Attendi...' : 'Crea database' }}
              </Button>
              <p class="break-all text-xs leading-6 text-white/45">
                {{ storageDir ? `Predefinito: ${storageDir}` : 'Caricamento percorso...' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p v-if="statusMessage" class="text-sm text-emerald-300">
          {{ statusMessage }}
        </p>
        <p v-if="errorMessage" class="mt-3 text-sm text-rose-300">
          {{ errorMessage }}
        </p>
      </div>
    </section>
  </InnerPage>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { open, save } from '@tauri-apps/plugin-dialog'

import {
  activeDatabaseName,
  clearActiveDatabase,
  createDatabaseAtPath,
  DEFAULT_DAILY_FINISHING_HOUR,
  DEFAULT_DAILY_STARTING_HOUR,
  getDailyWorkingHours,
  setDailyWorkingHours,
  setActiveDatabase,
} from '@/lib/database'
import InnerPage from '@/components/layout/innerPage.vue'
import Button from '@/components/ui/button/Button.vue'
import { Input } from '@/components/ui/input'
import { ui } from '@/lib/ui-classes'

const defaultBaseDir = '/home'
const storageDir = ref(defaultBaseDir)
const defaultDatabaseName = 'conta-ore.sqlite'
const statusMessage = ref('')
const errorMessage = ref('')
const isBusy = ref(false)
const dailyStartingHour = ref<string | number>(String(DEFAULT_DAILY_STARTING_HOUR))
const dailyFinishingHour = ref<string | number>(String(DEFAULT_DAILY_FINISHING_HOUR))
const isLoadingDailyHours = ref(false)
const isSavingDailyHours = ref(false)
const dailyHoursStatus = ref('')
const dailyHoursError = ref('')

const hasActiveDatabase = computed(() => Boolean(activeDatabaseName.value))
const canSaveDailyHours = computed(() => {
  const parsed = parseDailyHoursInputs()
  if (!parsed || !hasActiveDatabase.value || isLoadingDailyHours.value || isSavingDailyHours.value) {
    return false
  }

  return parsed.dailyFinishingHour >= parsed.dailyStartingHour
})

async function handleSelectDatabase() {
  try {
    const selectedPath = await open({
      title: 'Seleziona database SQLite',
      defaultPath: storageDir.value || undefined,
      filters: [
        {
          name: 'SQLite',
          extensions: ['db', 'sqlite', 'sqlite3'],
        },
      ],
    })

    if (!selectedPath) {
      return
    }

    const databasePath = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath
    if (!databasePath) {
      return
    }

    clearFeedback()
    isBusy.value = true

    const selectedDatabase = await createDatabaseAtPath(
      normalizePath(databasePath),
    )
    setActiveDatabase(selectedDatabase)
    statusMessage.value = `Database selezionato: ${selectedDatabase}`
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
  } finally {
    isBusy.value = false
  }
}

async function handleCreateDatabase() {
  try {
    const defaultPath = storageDir.value
      ? `${storageDir.value}/${defaultDatabaseName}`
      : defaultDatabaseName

    const selectedPath = await save({
      title: 'Scegli dove salvare il database',
      defaultPath,
      filters: [
        {
          name: 'SQLite',
          extensions: ['db', 'sqlite', 'sqlite3'],
        },
      ],
    })

    if (!selectedPath) {
      return
    }

    clearFeedback()
    isBusy.value = true

    const databasePath = await createDatabaseAtPath(
      normalizePath(selectedPath),
    )
    setActiveDatabase(databasePath)
    statusMessage.value = `Database creato e selezionato: ${databasePath}`
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
  } finally {
    isBusy.value = false
  }
}

async function handleDetachDatabase() {
  if (!activeDatabaseName.value) {
    errorMessage.value = 'Nessun database da sganciare.'
    return
  }

  clearFeedback()
  isBusy.value = true

  try {
    clearActiveDatabase()
    statusMessage.value = 'Database sganciato.'
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
  } finally {
    isBusy.value = false
  }
}

async function loadDailyHours() {
  if (!hasActiveDatabase.value) {
    dailyStartingHour.value = String(DEFAULT_DAILY_STARTING_HOUR)
    dailyFinishingHour.value = String(DEFAULT_DAILY_FINISHING_HOUR)
    dailyHoursStatus.value = ''
    dailyHoursError.value = ''
    isLoadingDailyHours.value = false
    return
  }

  isLoadingDailyHours.value = true
  dailyHoursStatus.value = ''
  dailyHoursError.value = ''

  try {
    const settings = await getDailyWorkingHours()
    dailyStartingHour.value = String(settings.dailyStartingHour)
    dailyFinishingHour.value = String(settings.dailyFinishingHour)
  } catch (error) {
    dailyHoursError.value = toErrorMessage(error)
  } finally {
    isLoadingDailyHours.value = false
  }
}

async function handleSaveDailyHours() {
  if (!hasActiveDatabase.value) {
    dailyHoursError.value = 'Seleziona un database prima di salvare le impostazioni.'
    return
  }

  const parsed = parseDailyHoursInputs()
  if (!parsed) {
    dailyHoursError.value = 'Inserisci ore valide tra 0 e 23.'
    return
  }

  if (parsed.dailyFinishingHour < parsed.dailyStartingHour) {
    dailyHoursError.value = 'L\'ora di fine deve essere maggiore o uguale all\'ora di inizio.'
    return
  }

  isSavingDailyHours.value = true
  dailyHoursStatus.value = ''
  dailyHoursError.value = ''

  try {
    const savedSettings = await setDailyWorkingHours(
      parsed.dailyStartingHour,
      parsed.dailyFinishingHour,
    )
    dailyStartingHour.value = String(savedSettings.dailyStartingHour)
    dailyFinishingHour.value = String(savedSettings.dailyFinishingHour)
    dailyHoursStatus.value = 'Orario giornaliero salvato.'
  } catch (error) {
    dailyHoursError.value = toErrorMessage(error)
  } finally {
    isSavingDailyHours.value = false
  }
}

function clearFeedback() {
  statusMessage.value = ''
  errorMessage.value = ''
}

function parseDailyHoursInputs() {
  const rawStartingHour = String(dailyStartingHour.value).trim()
  const rawFinishingHour = String(dailyFinishingHour.value).trim()

  if (!rawStartingHour || !rawFinishingHour) {
    return null
  }

  const parsedStartingHour = Number(rawStartingHour)
  const parsedFinishingHour = Number(rawFinishingHour)

  if (
    !Number.isInteger(parsedStartingHour)
    || !Number.isInteger(parsedFinishingHour)
    || parsedStartingHour < 0
    || parsedStartingHour > 23
    || parsedFinishingHour < 0
    || parsedFinishingHour > 23
  ) {
    return null
  }

  return {
    dailyStartingHour: parsedStartingHour,
    dailyFinishingHour: parsedFinishingHour,
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

function normalizePath(path: string) {
  let normalized = path

  if (normalized.startsWith('file://')) {
    try {
      normalized = decodeURIComponent(new URL(normalized).pathname)
    } catch {
      normalized = normalized.replace(/^file:\/+/, '/')
    }
  }

  return normalized.replace(/\\/g, '/').replace(/\/+$/, '')
}

watch(activeDatabaseName, () => {
  loadDailyHours()
}, { immediate: true })
</script>
