import { ref } from 'vue'

import { invoke } from '@tauri-apps/api/core'
import Database from '@tauri-apps/plugin-sql'

import initialMigration from '@/migrations/001_init.sql?raw'

const ACTIVE_DATABASE_KEY = 'conta-ore.active-database'
const SQLITE_FILE_PATTERN = /^[A-Za-z0-9._-]+$/

const storedDatabaseName = readStoredDatabaseName()

export const activeDatabaseName = ref<string | null>(storedDatabaseName)

export type TimesheetEntry = {
  id: number
  project_id: number | null
  time_from: string
  time_to: string | null
  note: string | null
  created_at: string | null
}

export type Customer = {
  id: number
  name: string
  description: string | null
  hourly_rate: number | null
  created_at: string | null
  archived: number
}

export type Project = {
  id: number
  customer_id: number
  name: string
  description: string | null
  hourly_rate: number | null
  created_at: string | null
  archived: number
}

export type ProjectWithCustomer = Project & {
  customer_name: string
}

export function getConnectionString(databaseName: string) {
  return `sqlite:${databaseName}`
}

export async function createDatabase(databaseName: string) {
  const normalizedName = normalizeDatabaseName(databaseName)
  const db = await loadDatabase(normalizedName)
  await applyInitialMigration(db)
  setActiveDatabaseName(normalizedName)
  return normalizedName
}

export async function createDatabaseAtPath(databasePath: string) {
  const normalizedPath = normalizeDatabasePath(databasePath)
  const db = await loadDatabase(normalizedPath)
  await applyInitialMigration(db)
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

  await loadDatabase(savedName)
  setActiveDatabaseName(savedName)

  return savedName
}

export async function listTimesheetsBetween(start: string, end: string) {
  const db = await getActiveDatabase()

  return db.select<TimesheetEntry[]>(
    `SELECT id, project_id, time_from, time_to, note, created_at
     FROM timesheets
     WHERE time_from >= $1 AND time_from < $2
     ORDER BY time_from ASC`,
    [start, end],
  )
}

export async function listCustomers() {
  const db = await getActiveDatabase()
  return db.select<Customer[]>(
    `SELECT id, name, description, hourly_rate, created_at, archived
     FROM customers
     WHERE archived = 0
     ORDER BY name COLLATE NOCASE ASC`,
  )
}

export async function createCustomer(input: {
  name: string
  description?: string | null
  hourly_rate?: number | null
  created_at?: string | null
}) {
  const db = await getActiveDatabase()
  const createdAt = input.created_at ?? new Date().toISOString()

  const result = await db.execute(
    `INSERT INTO customers (name, description, hourly_rate, created_at, archived)
     VALUES ($1, $2, $3, $4, 0)`,
    [
      input.name,
      input.description ?? null,
      input.hourly_rate ?? null,
      createdAt,
    ],
  )

  return result.lastInsertId ?? null
}

export async function updateCustomer(input: {
  id: number
  name: string
  description?: string | null
  hourly_rate?: number | null
}) {
  const db = await getActiveDatabase()
  await db.execute(
    `UPDATE customers
     SET name = $1,
         description = $2,
         hourly_rate = $3
     WHERE id = $4`,
    [
      input.name,
      input.description ?? null,
      input.hourly_rate ?? null,
      input.id,
    ],
  )
}

export async function deleteCustomer(id: number) {
  const db = await getActiveDatabase()
  await db.execute(
    `DELETE FROM customers WHERE id = $1`,
    [id],
  )
}

export async function listProjects() {
  const db = await getActiveDatabase()
  return db.select<ProjectWithCustomer[]>(
    `SELECT projects.id,
            projects.customer_id,
            projects.name,
            projects.description,
            projects.hourly_rate,
            projects.created_at,
            projects.archived,
            customers.name as customer_name
     FROM projects
     JOIN customers ON customers.id = projects.customer_id
     WHERE projects.archived = 0
     ORDER BY projects.name COLLATE NOCASE ASC`,
  )
}

export async function createProject(input: {
  customer_id: number
  name: string
  description?: string | null
  hourly_rate?: number | null
  created_at?: string | null
}) {
  const db = await getActiveDatabase()
  const createdAt = input.created_at ?? new Date().toISOString()

  const result = await db.execute(
    `INSERT INTO projects (customer_id, name, description, hourly_rate, created_at, archived)
     VALUES ($1, $2, $3, $4, $5, 0)`,
    [
      input.customer_id,
      input.name,
      input.description ?? null,
      input.hourly_rate ?? null,
      createdAt,
    ],
  )

  return result.lastInsertId ?? null
}

export async function updateProject(input: {
  id: number
  customer_id: number
  name: string
  description?: string | null
  hourly_rate?: number | null
}) {
  const db = await getActiveDatabase()
  await db.execute(
    `UPDATE projects
     SET customer_id = $1,
         name = $2,
         description = $3,
         hourly_rate = $4
     WHERE id = $5`,
    [
      input.customer_id,
      input.name,
      input.description ?? null,
      input.hourly_rate ?? null,
      input.id,
    ],
  )
}

export async function deleteProject(id: number) {
  const db = await getActiveDatabase()
  await db.execute(
    `DELETE FROM projects WHERE id = $1`,
    [id],
  )
}

export async function createTimesheet(input: {
  time_from: string
  time_to?: string | null
  note?: string | null
  project_id?: number | null
  created_at?: string | null
}) {
  const db = await getActiveDatabase()
  const createdAt = input.created_at ?? new Date().toISOString()

  await assertNoTimesheetOverlap({
    time_from: input.time_from,
    time_to: input.time_to ?? null,
  })

  const result = await db.execute(
    `INSERT INTO timesheets (project_id, time_from, time_to, note, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.project_id ?? null,
      input.time_from,
      input.time_to ?? null,
      input.note ?? null,
      createdAt,
    ],
  )

  return result.lastInsertId ?? null
}

export async function updateTimesheet(input: {
  id: number
  time_from: string
  time_to?: string | null
  note?: string | null
  project_id?: number | null
}) {
  const db = await getActiveDatabase()

  await assertNoTimesheetOverlap({
    time_from: input.time_from,
    time_to: input.time_to ?? null,
    excludeId: input.id,
  })

  await db.execute(
    `UPDATE timesheets
     SET project_id = $1,
         time_from = $2,
         time_to = $3,
         note = $4
     WHERE id = $5`,
    [
      input.project_id ?? null,
      input.time_from,
      input.time_to ?? null,
      input.note ?? null,
      input.id,
    ],
  )
}

export async function deleteTimesheet(id: number) {
  const db = await getActiveDatabase()
  await db.execute(
    `DELETE FROM timesheets WHERE id = $1`,
    [id],
  )
}

async function assertNoTimesheetOverlap(input: {
  time_from: string
  time_to: string | null
  excludeId?: number
}) {
  const db = await getActiveDatabase()
  const excludeId = input.excludeId ?? -1
  const timeFrom = input.time_from
  const timeTo = input.time_to

  const conflicts = timeTo
    ? await db.select<{ id: number }[]>(
      `SELECT id
       FROM timesheets
       WHERE id != $1
         AND time_from < $2
         AND (time_to IS NULL OR time_to > $3)
       LIMIT 1`,
      [excludeId, timeTo, timeFrom],
    )
    : await db.select<{ id: number }[]>(
      `SELECT id
       FROM timesheets
       WHERE id != $1
         AND (time_to IS NULL OR time_to > $2)
       LIMIT 1`,
      [excludeId, timeFrom],
    )

  if (conflicts.length > 0) {
    throw new Error('Questo orario si sovrappone a una traccia esistente.')
  }
}

export async function getSQLiteStorageDir() {
  return invoke<string>('get_sqlite_storage_dir')
}

export function clearActiveDatabase() {
  activeDatabaseName.value = null
  localStorage.removeItem(ACTIVE_DATABASE_KEY)
}

export function setActiveDatabase(databaseName: string) {
  setActiveDatabaseName(databaseName)
}

function setActiveDatabaseName(databaseName: string) {
  activeDatabaseName.value = databaseName
  localStorage.setItem(ACTIVE_DATABASE_KEY, databaseName)
}

async function loadDatabase(databaseName: string) {
  const db = await Database.load(getConnectionString(databaseName))
  await db.execute('PRAGMA foreign_keys = ON')
  return db
}

async function getActiveDatabase() {
  const databaseName = activeDatabaseName.value
  if (!databaseName) {
    throw new Error('Seleziona un database prima di salvare le ore.')
  }

  return loadDatabase(databaseName)
}

async function applyInitialMigration(db: Database) {
  const hasCustomersTable = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
  )

  if (hasCustomersTable.length > 0) {
    return
  }

  const statements = initialMigration
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await db.execute(statement)
  }
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
