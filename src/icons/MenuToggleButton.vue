<template>
  <button
    type="button"
    class="flex h-8 w-8 items-center justify-center rounded-2xl text-white/75 transition hover:text-white"
    :aria-label="isOpen ? 'Chiudi menu' : 'Apri menu'"
    @click="$emit('toggle')"
  >
    <MenuIcon class="h-6 w-6" />
  </button>
</template>

<script setup lang="ts">
import MenuIcon from '@/icons/MenuIcon.vue'

defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>
