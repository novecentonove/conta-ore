import { ref } from 'vue'

import { invoke } from '@tauri-apps/api/core'
import Database from '@tauri-apps/plugin-sql'

import initialMigration from '@/migrations/001_init.sql?raw'

const ACTIVE_DATABASE_KEY = 'tracciatore.active-database'
const SQLITE_FILE_PATTERN = /^[A-Za-z0-9._-]+$/
export const DEFAULT_TIMESHEET_COLOR = '#78aaff'

const storedDatabaseName = readStoredDatabaseName()

export const activeDatabaseName = ref<string | null>(storedDatabaseName)

export type TimesheetEntry = {
  id: number
  project_id: number | null
  project_name: string | null
  project_color: string | null
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
  color: string | null
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
    `SELECT timesheets.id,
            timesheets.project_id,
            timesheets.time_from,
            timesheets.time_to,
            timesheets.note,
            timesheets.created_at,
            projects.name AS project_name,
            projects.color AS project_color
     FROM timesheets
     LEFT JOIN projects ON projects.id = timesheets.project_id
     WHERE timesheets.time_from >= $1 AND timesheets.time_from < $2
     ORDER BY timesheets.time_from ASC`,
    [start, end],
  )
}

export async function getDefaultTimesheetColor() {
  const value = await getSetting('default_timesheet_color')
  return value ?? DEFAULT_TIMESHEET_COLOR
}

export async function setDefaultTimesheetColor(color: string) {
  await setSetting('default_timesheet_color', color)
  return color
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
            projects.color,
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
  color?: string | null
  hourly_rate?: number | null
  created_at?: string | null
}) {
  const db = await getActiveDatabase()
  const createdAt = input.created_at ?? new Date().toISOString()

  const result = await db.execute(
    `INSERT INTO projects (customer_id, name, description, color, hourly_rate, created_at, archived)
     VALUES ($1, $2, $3, $4, $5, $6, 0)`,
    [
      input.customer_id,
      input.name,
      input.description ?? null,
      input.color ?? null,
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
  color?: string | null
  hourly_rate?: number | null
}) {
  const db = await getActiveDatabase()
  await db.execute(
    `UPDATE projects
     SET customer_id = $1,
         name = $2,
         description = $3,
         color = $4,
         hourly_rate = $5
     WHERE id = $6`,
    [
      input.customer_id,
      input.name,
      input.description ?? null,
      input.color ?? null,
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

async function getSetting(key: string) {
  const db = await getActiveDatabase()
  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM settings WHERE key = $1 LIMIT 1`,
    [key],
  )
  return rows[0]?.value ?? null
}

async function setSetting(key: string, value: string) {
  const db = await getActiveDatabase()
  await db.execute(
    `INSERT INTO settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  )
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

  const db = await loadDatabase(databaseName)
  await ensureSchema(db)
  return db
}

async function applyInitialMigration(db: Database) {
  const hasCustomersTable = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
  )

  if (hasCustomersTable.length === 0) {
    const statements = initialMigration
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean)

    for (const statement of statements) {
      await db.execute(statement)
    }
  }

  await ensureSchema(db)
}

async function ensureSchema(db: Database) {
  await ensureCustomersTable(db)
  await ensureProjectsTable(db)
  await ensureTimesheetsTable(db)
  await ensureTimerTable(db)
  await ensureSettingsTable(db)
}

async function ensureCustomersTable(db: Database) {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      hourly_rate REAL,
      created_at TEXT,
      archived INTEGER DEFAULT 0
    )`
  )

  await ensureTableColumns(db, 'customers', [
    { name: 'description', definition: 'TEXT' },
    { name: 'hourly_rate', definition: 'REAL' },
    { name: 'created_at', definition: 'TEXT' },
    { name: 'archived', definition: 'INTEGER DEFAULT 0' },
  ])
}

async function ensureProjectsTable(db: Database) {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      hourly_rate REAL,
      created_at TEXT,
      archived INTEGER DEFAULT 0,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )`
  )

  await ensureTableColumns(db, 'projects', [
    { name: 'customer_id', definition: 'INTEGER' },
    { name: 'name', definition: 'TEXT' },
    { name: 'description', definition: 'TEXT' },
    { name: 'color', definition: 'TEXT' },
    { name: 'hourly_rate', definition: 'REAL' },
    { name: 'created_at', definition: 'TEXT' },
    { name: 'archived', definition: 'INTEGER DEFAULT 0' },
  ])
}

async function ensureTimesheetsTable(db: Database) {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS timesheets (
      id INTEGER PRIMARY KEY,
      project_id INTEGER,
      time_from TEXT NOT NULL,
      time_to TEXT,
      note TEXT,
      created_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )`
  )

  await ensureTableColumns(db, 'timesheets', [
    { name: 'project_id', definition: 'INTEGER' },
    { name: 'time_to', definition: 'TEXT' },
    { name: 'note', definition: 'TEXT' },
    { name: 'created_at', definition: 'TEXT' },
  ])
}

async function ensureTimerTable(db: Database) {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS timer (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      project_id INTEGER,
      start_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )`
  )

  await ensureTableColumns(db, 'timer', [
    { name: 'project_id', definition: 'INTEGER' },
  ])
}

async function ensureSettingsTable(db: Database) {
  const hasSettingsTable = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='settings'"
  )

  if (hasSettingsTable.length === 0) {
    await db.execute(
      `CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)`
    )
  }

  await ensureSetting(db, 'default_timesheet_color', DEFAULT_TIMESHEET_COLOR)
}

async function ensureSetting(db: Database, key: string, value: string) {
  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM settings WHERE key = $1 LIMIT 1`,
    [key],
  )

  if (rows.length === 0) {
    await db.execute(
      `INSERT INTO settings (key, value) VALUES ($1, $2)`,
      [key, value],
    )
  }
}

async function ensureTableColumns(
  db: Database,
  table: string,
  columns: Array<{ name: string; definition: string }>,
) {
  const existing = await db.select<{ name: string }[]>(
    `PRAGMA table_info(${table})`
  )
  const names = new Set(existing.map((column) => column.name))

  for (const column of columns) {
    if (names.has(column.name)) {
      continue
    }

    try {
      await db.execute(
        `ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.definition}`
      )
    } catch (error) {
      if (!isDuplicateColumnError(error)) {
        throw error
      }
    }
  }
}

function isDuplicateColumnError(error: unknown) {
  if (error instanceof Error) {
    return /duplicate column/i.test(error.message)
  }

  return false
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
