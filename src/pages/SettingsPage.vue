<template>
  <section class="flex flex-col gap-12 h-full overflow-auto px-16 pb-6 pt-4">
    <div>
      <p class="text-xs font-medium uppercase tracking-[0.24em] text-white/45">
        Settings
      </p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-white">
        Database
      </h1>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-white/60">
        Seleziona un database esistente oppure crea un nuovo file SQLite. Il percorso predefinito
        e' la directory locale dell'app.
      </p>
    </div>

    <div class="grid gap-10">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.24em] text-white/45">
          Database
        </p>
        <p class="mt-3 text-sm leading-6 text-white/60">
          {{ activeDatabaseName ?? 'Nessun database selezionato' }}
        </p>
        <button
          type="button"
          class="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isBusy || !activeDatabaseName"
          @click="handleDetachDatabase"
        >
          {{ isBusy ? 'Attendi...' : 'Sgancia database' }}
        </button>
      </div>

      <div>
        <p class="text-xs font-medium uppercase tracking-[0.24em] text-white/45">
          Seleziona Database
        </p>
        <p class="mt-3 text-sm leading-6 text-white/60">
          Scegli un file SQLite gia' esistente e impostalo come database attivo.
        </p>
        <button
          type="button"
          class="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isBusy || activeDatabaseName !== null"
          @click="handleSelectDatabase"
        >
          {{ isBusy ? 'Attendi...' : 'Seleziona database' }}
        </button>
      </div>

      <div>
        <p class="text-xs font-medium uppercase tracking-[0.24em] text-white/45">
          Crea Database
        </p>
        <p class="mt-3 text-sm leading-6 text-white/60">
          Crea un nuovo file SQLite: verra' selezionato automaticamente.
        </p>
        <div class="mt-5 flex flex-col gap-3 max-w-2xl">
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isBusy || activeDatabaseName !== null"
            @click="handleCreateDatabase"
          >
            {{ isBusy ? 'Attendi...' : 'Crea database' }}
          </button>
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
