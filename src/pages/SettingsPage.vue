<template>
  <InnerPage>

    <p :class="ui.pageKicker" class="mb-6">
      Impostazioni
    </p>

    <hr>

    <section :class="ui.pageSection">
      
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
import { ref } from 'vue'
import { open, save } from '@tauri-apps/plugin-dialog'

import {
  activeDatabaseName,
  clearActiveDatabase,
  createDatabaseAtPath,
  setActiveDatabase,
} from '@/lib/database'
import InnerPage from '@/components/layout/innerPage.vue'
import Button from '@/components/ui/button/Button.vue'
import { ui } from '@/lib/ui-classes'

const defaultBaseDir = '/home'
const storageDir = ref(defaultBaseDir)
const defaultDatabaseName = 'tracciatore.sqlite'
const statusMessage = ref('')
const errorMessage = ref('')
const isBusy = ref(false)

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

function clearFeedback() {
  statusMessage.value = ''
  errorMessage.value = ''
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
</script>
