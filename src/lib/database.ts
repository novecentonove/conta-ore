import { ref } from 'vue'

import { invoke } from '@tauri-apps/api/core'
import Database from '@tauri-apps/plugin-sql'

const ACTIVE_DATABASE_KEY = 'conta-ore.active-database'
const SQLITE_FILE_PATTERN = /^[A-Za-z0-9._-]+$/

const storedDatabaseName = readStoredDatabaseName()

export const activeDatabaseName = ref<string | null>(storedDatabaseName)

export function getConnectionString(databaseName: string) {
  return `sqlite:${databaseName}`
}

export async function createDatabase(databaseName: string) {
  const normalizedName = normalizeDatabaseName(databaseName)
  await Database.load(getConnectionString(normalizedName))
  setActiveDatabaseName(normalizedName)
  return normalizedName
}

export async function createDatabaseAtPath(databasePath: string) {
  const normalizedPath = normalizeDatabasePath(databasePath)
  await Database.load(getConnectionString(normalizedPath))
  setActiveDatabaseName(normalizedPath)
  return normalizedPath
}

export async function importDatabase(file: File) {
  const normalizedName = normalizeDatabaseName(file.name)
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()))

  const savedName = await invoke<string>('import_sqlite_database', {
    fileName: normalizedName,
    bytes,
  })

  await Database.load(getConnectionString(savedName))
  setActiveDatabaseName(savedName)

  return savedName
}

export async function getSQLiteStorageDir() {
  return invoke<string>('get_sqlite_storage_dir')
}

export function clearActiveDatabase() {
  activeDatabaseName.value = null
  localStorage.removeItem(ACTIVE_DATABASE_KEY)
}

function setActiveDatabaseName(databaseName: string) {
  activeDatabaseName.value = databaseName
  localStorage.setItem(ACTIVE_DATABASE_KEY, databaseName)
}

function readStoredDatabaseName() {
  if (typeof window === 'undefined') {
    return null
  }

  return localStorage.getItem(ACTIVE_DATABASE_KEY)
}

function normalizeDatabaseName(input: string) {
  const trimmedName = input.trim()
  if (!trimmedName) {
    throw new Error('Inserisci un nome file valido.')
  }

  if (!SQLITE_FILE_PATTERN.test(trimmedName)) {
    throw new Error('Usa solo lettere, numeri, trattino, underscore e punto.')
  }

  if (!/\.(db|sqlite|sqlite3)$/i.test(trimmedName)) {
    throw new Error('Usa un file con estensione .db, .sqlite o .sqlite3.')
  }

  return trimmedName
}

function normalizeDatabasePath(input: string) {
  const trimmedPath = input.trim()
  if (!trimmedPath) {
    throw new Error('Inserisci un percorso file valido.')
  }

  if (!/\.(db|sqlite|sqlite3)$/i.test(trimmedPath)) {
    throw new Error('Usa un file con estensione .db, .sqlite o .sqlite3.')
  }

  return trimmedPath
}
