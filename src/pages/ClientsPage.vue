<template>
  <InnerPage>
    <section :class="ui.pageSection">
      <div>
        <p :class="ui.pageKicker">
          Anagrafiche
        </p>
        <h1 :class="ui.pageTitle">
          Clienti
        </h1>
        <p :class="ui.pageSubtitle">
          Gestisci i clienti e le tariffe orarie associate.
        </p>
      </div>

      <div class="space-y-8">
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <p :class="ui.pageKicker">
              Elenco clienti
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
            Seleziona un database per gestire i clienti.
          </p>
          <p v-else-if="isLoading" class="text-xs text-white/45">
            Caricamento clienti...
          </p>
          <p v-else-if="loadError" class="text-sm text-rose-300">
            {{ loadError }}
          </p>
          <p v-else-if="customers.length === 0" class="text-sm text-white/60">
            Nessun cliente trovato. Crea il primo cliente.
          </p>
          <div v-else :class="ui.listStack">
            <article
              v-for="customer in customers"
              :key="customer.id"
              :class="ui.listItem"
            >
              <div :class="ui.listItemHeader">
                <div class="space-y-1">
                  <p :class="ui.listItemTitle">
                    {{ customer.name }}
                  </p>
                  <p v-if="customer.description" :class="ui.listItemDescription">
                    {{ customer.description }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    :disabled="isSaving || isDeleting"
                    @click="startEdit(customer)"
                  >
                    Modifica
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    :disabled="isSaving || isDeleting"
                    @click="requestDelete(customer)"
                  >
                    Elimina
                  </Button>
                </div>
              </div>
              <div class="flex flex-wrap gap-3 text-xs text-white/45">
                <span v-if="customer.hourly_rate !== null">
                  {{ formatRate(customer.hourly_rate) }}/h
                </span>
              </div>
            </article>
          </div>
        </div>

        <div v-if="showForm" :class="[ui.formCard, 'max-w-xl']">
          <p :class="ui.pageKicker">
            {{ editingCustomerId ? 'Modifica cliente' : 'Nuovo cliente' }}
          </p>

          <div class="flex flex-col gap-4">
            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel" for="customer-name">
                Nome
              </label>
              <Input
                id="customer-name"
                v-model="formName"
                type="text"
                :class="ui.input"
                :disabled="!hasActiveDatabase || isSaving || isDeleting"
              />
            </div>

            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel" for="customer-rate">
                Tariffa oraria (EUR)
              </label>
              <Input
                id="customer-rate"
                v-model="formHourlyRate"
                type="number"
                step="0.01"
                min="0"
                :class="ui.input"
                :disabled="!hasActiveDatabase || isSaving || isDeleting"
              />
            </div>

            <div :class="ui.formGrid">
              <label :class="ui.fieldLabel" for="customer-description">
                Descrizione
              </label>
              <Textarea
                id="customer-description"
                v-model="formDescription"
                rows="3"
                :class="ui.textarea"
                :disabled="!hasActiveDatabase || isSaving || isDeleting"
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
              v-if="editingCustomerId || isCreating"
              variant="secondary"
              :disabled="isSaving || isDeleting"
              @click="resetForm"
            >
              Annulla
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
      title="Eliminare il cliente?"
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

import InnerPage from '@/components/layout/innerPage.vue'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  activeDatabaseName,
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type Customer,
} from '@/lib/database'
import { ui } from '@/lib/ui-classes'

const customers = ref<Customer[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const loadError = ref('')
const saveError = ref('')
const showDeleteConfirm = ref(false)
const customerToDelete = ref<Customer | null>(null)
const editingCustomerId = ref<number | null>(null)
const isCreating = ref(false)

const formName = ref('')
const formDescription = ref('')
const formHourlyRate = ref<string | number>('')

const hasActiveDatabase = computed(() => Boolean(activeDatabaseName.value))
const showForm = computed(() => isCreating.value || editingCustomerId.value !== null)
const submitLabel = computed(() => (
  editingCustomerId.value ? 'Aggiorna cliente' : 'Crea cliente'
))
const canSave = computed(() => (
  hasActiveDatabase.value && formName.value.trim().length > 0 && !isSaving.value && !isDeleting.value
))
const deleteDescription = computed(() => {
  if (!customerToDelete.value) {
    return 'Questa azione elimina definitivamente il cliente.'
  }

  return `Questa azione elimina definitivamente il cliente ${customerToDelete.value.name}.`
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
  editingCustomerId.value = null
  formName.value = ''
  formDescription.value = ''
  formHourlyRate.value = ''
  saveError.value = ''
  isCreating.value = false
}

function startCreate() {
  resetForm()
  isCreating.value = true
}

function startEdit(customer: Customer) {
  editingCustomerId.value = customer.id
  formName.value = customer.name
  formDescription.value = customer.description ?? ''
  formHourlyRate.value = customer.hourly_rate !== null ? String(customer.hourly_rate) : ''
  saveError.value = ''
  isCreating.value = true
}

function requestDelete(customer: Customer) {
  customerToDelete.value = customer
  showDeleteConfirm.value = true
}

function cancelDelete() {
  showDeleteConfirm.value = false
  customerToDelete.value = null
}

async function confirmDelete() {
  if (!customerToDelete.value) {
    return
  }

  isDeleting.value = true
  saveError.value = ''

  try {
    await deleteCustomer(customerToDelete.value.id)
    if (editingCustomerId.value === customerToDelete.value.id) {
      resetForm()
    }
    await loadCustomers()
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
    loadError.value = ''
    isLoading.value = false
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    customers.value = await listCustomers()
  } catch (error) {
    loadError.value = toErrorMessage(error)
  } finally {
    isLoading.value = false
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

    if (editingCustomerId.value) {
      await updateCustomer({
        id: editingCustomerId.value,
        name,
        description,
        hourly_rate: hourlyRate,
      })
    } else {
      await createCustomer({
        name,
        description,
        hourly_rate: hourlyRate,
      })
    }

    await loadCustomers()
    resetForm()
  } catch (error) {
    saveError.value = toErrorMessage(error)
  } finally {
    isSaving.value = false
  }
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

onMounted(loadCustomers)

watch(activeDatabaseName, () => {
  resetForm()
  loadCustomers()
})

watch(showDeleteConfirm, (open) => {
  if (!open) {
    customerToDelete.value = null
  }
})
</script>
