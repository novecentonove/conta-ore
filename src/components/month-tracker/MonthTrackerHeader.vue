<template>
  <header class="flex justify-between items-center gap-4 ml-5 mb-2">
    <div>
      <h1 class="font-semibold text-white">
        {{ monthLabel }}
      </h1>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded border border-white/10 bg-white/5 text-xl text-white transition hover:border-white/20 hover:bg-white/10"
        @click="emit('previous')"
      >
        <ChevronLeft />
      </button>

      <button
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded border border-white/10 bg-white/5 text-xl text-white transition hover:border-white/20 hover:bg-white/10"
        @click="emit('next')"
      >
        <ChevronRight />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

defineProps<{
  monthLabel: string
}>()

const emit = defineEmits<{
  (event: 'previous'): void
  (event: 'next'): void
}>()
</script>
