<template>
  <InnerPage>
    <section :class="ui.pageSection">
      <div>
        <p :class="ui.pageKicker">
          Anagrafiche
        </p>
        <h1 :class="ui.pageTitle">
          Progetti
        </h1>
        <p :class="ui.pageSubtitle">
          Crea progetti e assegnali ai clienti.
        </p>
      </div>

      <div class="space-y-8">
        <div :class="ui.section">
          <p :class="ui.pageKicker">
            Colore di default
          </p>
          <div class="flex items-center gap-3">
            <Input
              id="default-timesheet-color"
              v-model="defaultTimesheetColor"
              type="color"
              :class="ui.colorInput"
              :disabled="!hasActiveDatabase || isSavingDefaultColor"
              @change="handleDefaultColorSave"
            />
            <Input
              v-model="defaultTimesheetColor"
              type="text"
              :class="ui.colorHexInput"
              :disabled="!hasActiveDatabase || isSavingDefaultColor"
              @change="handleDefaultColorSave"
            />
          </div>
          <p v-if="!hasActiveDatabase" class="text-xs text-amber-200">
            Seleziona un database per salvare il colore di default.
          </p>
          <p v-else-if="defaultColorError" class="text-xs text-rose-300">
            {{ defaultColorError }}
          </p>
        </div>
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <p :class="ui.pageKicker">
              Elenco progetti
            </p>
            <Button
              variant="secondary"
              size="sm"
              :disabled="!hasActiveDatabase || isSaving || isDeleting"
              @click="startCreate"
            >
              Nuovo
            </Button>
          </div>

          <p v-if="!hasActiveDatabase" class="text-sm text-amber-200">
            Seleziona un database per gestire i progetti.
          </p>
          <p v-else-if="isLoading" class="text-xs text-white/45">
            Caricamento progetti...
          </p>
          <p v-else-if="loadError" class="text-sm text-rose-300">
            {{ loadError }}
          </p>
          <p v-else-if="projects.length === 0" class="text-sm text-white/60">
            Nessun progetto trovato. Crea il primo progetto.
          </p>
          <div v-else :class="ui.listStack">
            <article
              v-for="project in projects"
              :key="project.id"
              :class="ui.listItem"
            >
              <div :class="ui.listItemHeader">
                <div class="space-y-1">
                  <p :class="ui.listItemTitle">
                    {{ project.name }}
                  </p>
                  <p class="text-xs text-white/45">
                    {{ project.customer_name }}
                  </p>
                  <p v-if="project.description" :class="ui.listItemDescription">
                    {{ project.description }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    :disabled="isSaving || isDeleting"
                    @click="startEdit(project)"
                  >
                    Modifica
                  </Button>
                </div>
              </div>
              <div class="flex flex-wrap gap-3 text-xs text-white/45">
                <span v-if="project.hourly_rate !== null">
                  {{ formatRate(project.hourly_rate) }}/h
                </span>
              </div>
            </article>
          </div>
        </div>

        <div v-if="showForm" :class="[ui.formCard, 'max-w-xl']">
          <p :class="ui.pageKicker">
            {{ editingProjectId ? 'Modifica progetto' : 'Nuovo progetto' }}
          </p>

          <p
            v-if="hasActiveDatabase && !hasCustomers"
            class="text-sm text-amber-200"
          >
            Nessun cliente disponibile.
            <RouterLink to="/clients" class="underline underline-offset-2">
              Crea un cliente
            </RouterLink>
            per continuare.
          </p>

          <div class="flex flex-col gap-4">
            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel" for="project-name">
                Nome
              </label>
              <Input
                id="project-name"
                v-model="formName"
                type="text"
                :class="ui.input"
                :disabled="!hasActiveDatabase || !hasCustomers || isSaving || isDeleting"
              />
            </div>

            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel" for="project-customer">
                Cliente
              </label>
              <select
                id="project-customer"
                v-model="formCustomerId"
                :class="ui.select"
                :disabled="!hasActiveDatabase || !hasCustomers || isSaving || isDeleting"
              >
                <option value="" disabled>
                  Seleziona cliente
                </option>
                <option
                  v-for="customer in customers"
                  :key="customer.id"
                  :value="String(customer.id)"
                >
                  {{ customer.name }}
                </option>
              </select>
            </div>

            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel" for="project-color">
                Colore progetto
              </label>
              <div class="flex items-center gap-3">
                <Input
                  id="project-color"
                  v-model="formColor"
                  type="color"
                  :class="ui.colorInput"
                  :disabled="!hasActiveDatabase || !hasCustomers || isSaving || isDeleting"
                />
                <Input
                  v-model="formColor"
                  type="text"
                  :class="ui.colorHexInput"
                  :disabled="!hasActiveDatabase || !hasCustomers || isSaving || isDeleting"
                />
              </div>
            </div>

            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel" for="project-rate">
                Tariffa oraria (EUR)
              </label>
              <Input
                id="project-rate"
                v-model="formHourlyRate"
                type="number"
                step="0.01"
                min="0"
                :class="ui.input"
                :disabled="!hasActiveDatabase || !hasCustomers || isSaving || isDeleting"
              />
            </div>

            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel" for="project-description">
                Descrizione
              </label>
              <Textarea
                id="project-description"
                v-model="formDescription"
                rows="3"
                :class="ui.textarea"
                :disabled="!hasActiveDatabase || !hasCustomers || isSaving || isDeleting"
              />
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <Button
              :disabled="!canSave || isSaving || isDeleting"
              @click="handleSave"
            >
              {{ isSaving ? 'Salvataggio...' : submitLabel }}
            </Button>
            <Button
              v-if="editingProjectId || isCreating"
              variant="secondary"
              :disabled="isSaving || isDeleting"
              @click="resetForm"
            >
              Annulla
            </Button>
            <Button
              v-if="editingProject"
              variant="ghost"
              size="sm"
              :disabled="isSaving || isDeleting"
              class="ml-auto text-gray-600"
              @click="requestDelete(editingProject)"
            >
              Elimina
            </Button>
          </div>

          <p v-if="saveError" class="text-sm text-rose-300">
            {{ saveError }}
          </p>
        </div>
      </div>
    </section>

    <ConfirmDialog
      v-model:open="showDeleteConfirm"
      title="Eliminare il progetto?"
      :description="deleteDescription"
      :confirm-label="isDeleting ? 'Eliminazione...' : 'Elimina'"
      :confirm-disabled="isDeleting"
      :cancel-disabled="isDeleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </InnerPage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import InnerPage from '@/components/layout/innerPage.vue'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  activeDatabaseName,
  createProject,
  deleteProject,
  DEFAULT_TIMESHEET_COLOR,
  getDefaultTimesheetColor,
  listCustomers,
  listProjects,
  setDefaultTimesheetColor,
  updateProject,
  type Customer,
  type ProjectWithCustomer,
} from '@/lib/database'
import { ui } from '@/lib/ui-classes'

const projects = ref<ProjectWithCustomer[]>([])
const customers = ref<Customer[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const loadError = ref('')
const saveError = ref('')
const showDeleteConfirm = ref(false)
const projectToDelete = ref<ProjectWithCustomer | null>(null)
const editingProjectId = ref<number | null>(null)
const isCreating = ref(false)

const formName = ref('')
const formDescription = ref('')
const formHourlyRate = ref<string | number>('')
const formCustomerId = ref('')
const formColor = ref(DEFAULT_TIMESHEET_COLOR)

const defaultTimesheetColor = ref(DEFAULT_TIMESHEET_COLOR)
const isSavingDefaultColor = ref(false)
const defaultColorError = ref('')

const hasActiveDatabase = computed(() => Boolean(activeDatabaseName.value))
const hasCustomers = computed(() => customers.value.length > 0)
const showForm = computed(() => isCreating.value || editingProjectId.value !== null)
const editingProject = computed(() => {
  if (editingProjectId.value === null) {
    return null
  }

  return projects.value.find((project) => project.id === editingProjectId.value) ?? null
})
const submitLabel = computed(() => (
  editingProjectId.value ? 'Aggiorna progetto' : 'Crea progetto'
))
const canSave = computed(() => (
  hasActiveDatabase.value
  && hasCustomers.value
  && formName.value.trim().length > 0
  && formCustomerId.value.length > 0
  && !isSaving.value
  && !isDeleting.value
))
const deleteDescription = computed(() => {
  if (!projectToDelete.value) {
    return 'Questa azione elimina definitivamente il progetto.'
  }

  return `Questa azione elimina definitivamente il progetto ${projectToDelete.value.name}.`
})

const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
})

function formatRate(rate: number) {
  return currencyFormatter.format(rate)
}

function resetForm() {
  editingProjectId.value = null
  formName.value = ''
  formDescription.value = ''
  formHourlyRate.value = ''
  formCustomerId.value = ''
  formColor.value = defaultTimesheetColor.value
  saveError.value = ''
  isCreating.value = false
}

function startCreate() {
  resetForm()
  isCreating.value = true
}

function startEdit(project: ProjectWithCustomer) {
  editingProjectId.value = project.id
  formName.value = project.name
  formDescription.value = project.description ?? ''
  formHourlyRate.value = project.hourly_rate !== null ? String(project.hourly_rate) : ''
  formCustomerId.value = String(project.customer_id)
  formColor.value = project.color ?? defaultTimesheetColor.value
  saveError.value = ''
  isCreating.value = true
}

function requestDelete(project: ProjectWithCustomer) {
  projectToDelete.value = project
  showDeleteConfirm.value = true
}

function cancelDelete() {
  showDeleteConfirm.value = false
  projectToDelete.value = null
}

async function confirmDelete() {
  if (!projectToDelete.value) {
    return
  }

  isDeleting.value = true
  saveError.value = ''

  try {
    await deleteProject(projectToDelete.value.id)
    if (editingProjectId.value === projectToDelete.value.id) {
      resetForm()
    }
    await loadData()
    cancelDelete()
  } catch (error) {
    saveError.value = toErrorMessage(error)
  } finally {
    isDeleting.value = false
    if (showDeleteConfirm.value) {
      cancelDelete()
    }
  }
}

async function loadCustomers() {
  if (!hasActiveDatabase.value) {
    customers.value = []
    return
  }

  try {
    customers.value = await listCustomers()
  } catch (error) {
    loadError.value = toErrorMessage(error)
  }
}

async function loadProjects() {
  if (!hasActiveDatabase.value) {
    projects.value = []
    loadError.value = ''
    return
  }

  try {
    projects.value = await listProjects()
  } catch (error) {
    loadError.value = toErrorMessage(error)
  }
}

async function handleSave() {
  if (!canSave.value) {
    return
  }

  isSaving.value = true
  saveError.value = ''

  try {
    const name = formName.value.trim()
    const description = formDescription.value.trim() || null
    const hourlyRate = parseHourlyRate()
    const customerId = parseCustomerId()
    const color = parseProjectColor()

    if (editingProjectId.value) {
      await updateProject({
        id: editingProjectId.value,
        customer_id: customerId,
        name,
        description,
        color,
        hourly_rate: hourlyRate,
      })
    } else {
      await createProject({
        customer_id: customerId,
        name,
        description,
        color,
        hourly_rate: hourlyRate,
      })
    }

    await loadData()
    resetForm()
  } catch (error) {
    saveError.value = toErrorMessage(error)
  } finally {
    isSaving.value = false
  }
}

function parseCustomerId() {
  const value = Number.parseInt(formCustomerId.value, 10)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Seleziona un cliente valido.')
  }

  return value
}

function parseHourlyRate() {
  const rawValue = formHourlyRate.value
  if (rawValue === '' || rawValue === null || rawValue === undefined) {
    return null
  }

  if (typeof rawValue === 'number') {
    if (Number.isNaN(rawValue)) {
      throw new Error('Inserisci una tariffa oraria valida.')
    }
    if (rawValue < 0) {
      throw new Error('La tariffa oraria non puo\' essere negativa.')
    }
    return rawValue
  }

  const normalized = rawValue.trim().replace(',', '.')
  if (!normalized) {
    return null
  }

  const value = Number.parseFloat(normalized)

  if (Number.isNaN(value)) {
    throw new Error('Inserisci una tariffa oraria valida.')
  }

  if (value < 0) {
    throw new Error('La tariffa oraria non puo\' essere negativa.')
  }

  return value
}

function parseProjectColor() {
  const normalized = normalizeHexColor(formColor.value)
  if (!normalized) {
    throw new Error('Inserisci un colore progetto valido.')
  }

  return normalized
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return null
  }

  const match6 = /^#([0-9a-f]{6})$/.exec(trimmed)
  if (match6) {
    return `#${match6[1]}`
  }

  const match3 = /^#([0-9a-f]{3})$/.exec(trimmed)
  if (match3) {
    return `#${match3[1].split('').map((ch) => ch + ch).join('')}`
  }

  return null
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

async function loadDefaultColor() {
  if (!hasActiveDatabase.value) {
    defaultTimesheetColor.value = DEFAULT_TIMESHEET_COLOR
    defaultColorError.value = ''
    return
  }

  try {
    defaultTimesheetColor.value = await getDefaultTimesheetColor()
    defaultColorError.value = ''
    if (!isCreating.value && editingProjectId.value === null) {
      formColor.value = defaultTimesheetColor.value
    }
  } catch (error) {
    defaultTimesheetColor.value = DEFAULT_TIMESHEET_COLOR
    defaultColorError.value = toErrorMessage(error)
  }
}

async function handleDefaultColorSave() {
  if (!hasActiveDatabase.value) {
    return
  }

  const normalized = normalizeHexColor(defaultTimesheetColor.value)
  if (!normalized) {
    defaultColorError.value = 'Inserisci un colore esadecimale valido.'
    return
  }

  isSavingDefaultColor.value = true
  defaultColorError.value = ''

  try {
    await setDefaultTimesheetColor(normalized)
    defaultTimesheetColor.value = normalized
  } catch (error) {
    defaultColorError.value = toErrorMessage(error)
  } finally {
    isSavingDefaultColor.value = false
  }
}

async function loadData() {
  if (!hasActiveDatabase.value) {
    customers.value = []
    projects.value = []
    loadError.value = ''
    defaultTimesheetColor.value = DEFAULT_TIMESHEET_COLOR
    defaultColorError.value = ''
    isLoading.value = false
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    await Promise.all([loadCustomers(), loadProjects(), loadDefaultColor()])
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)

watch(activeDatabaseName, () => {
  resetForm()
  loadData()
})

watch(showDeleteConfirm, (open) => {
  if (!open) {
    projectToDelete.value = null
  }
})
</script>
