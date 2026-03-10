<template>
  <InnerPage>
  <section class="space-y-12">
    <div>
      <p class="text-xs font-medium uppercase tracking-[0.24em] text-white/45">
        Settings
      </p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-white">
        Database
      </h1>
      <p class="mt-3 text-sm leading-6 text-white/60">
        Seleziona un database esistente oppure crea un nuovo file SQLite
      </p>
    </div>

    <div class="space-y-12">
      <div class="space-y-3 p-6 border border-white/90 max-w-2xl rounded">
        <p class="text-xs font-medium uppercase tracking-[0.24em] text-white/45">
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

      <div class="space-y-3">
        <p class="text-xs font-medium uppercase tracking-[0.24em] text-white/45">
          Seleziona Database
        </p>
        <p class="mt-3 text-sm leading-6 text-white/60">
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

      <div class="space-y-3">
        <p class="text-xs font-medium uppercase tracking-[0.24em] text-white/45">
          Crea Database
        </p>
        <p class="mt-3 text-sm leading-6 text-white/60">
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
import { onMounted, ref } from 'vue'
import { open, save } from '@tauri-apps/plugin-dialog'

import {
  activeDatabaseName,
  clearActiveDatabase,
  createDatabaseAtPath,
  getSQLiteStorageDir,
} from '@/lib/database'
import InnerPage from '@/components/layout/innerPage.vue'
import Button from '@/components/ui/button/Button.vue'

const storageDir = ref('')
const defaultDatabaseName = 'conta-ore.sqlite'
const statusMessage = ref('')
const errorMessage = ref('')
const isBusy = ref(false)

onMounted(async () => {
  try {
    storageDir.value = await getSQLiteStorageDir()
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
  }
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

    const selectedDatabase = await createDatabaseAtPath(databasePath)
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

    const databasePath = await createDatabaseAtPath(selectedPath)
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

  return 'Si e\' verificato un errore inatteso.'
}
</script>
