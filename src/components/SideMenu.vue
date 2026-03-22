<template>
  <div class="pointer-events-none fixed inset-0 z-40 h-screen">
    <button
      type="button"
      class="absolute inset-0 bg-black/35 transition-opacity duration-200"
      :class="isOpen ? 'pointer-events-auto opacity-100' : 'opacity-0'"
      aria-label="Chiudi menu"
      @click="$emit('close')"
    />

    <aside
      class="pointer-events-auto absolute left-0 top-0 flex h-screen w-64 flex-col border-r border-white/10 bg-[#14141B] pt-[55px] shadow-[0_28px_80px_rgba(0,0,0,0.45)] transition-transform duration-200"
      :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
    >

      <nav class="flex flex-1 flex-col gap-2 px-3 py-4">
        <RouterLink
          to="/"
          class="flex h-11 items-center rounded-2xl px-4 text-sm font-medium text-white/70 transition hover:bg-white/8 hover:text-white"
          exact-active-class="bg-white/10 text-white"
          @click="$emit('close')"
        >
          Mese
        </RouterLink>

        <RouterLink
          to="/clients"
          class="flex h-11 items-center rounded-2xl px-4 text-sm font-medium text-white/70 transition hover:bg-white/8 hover:text-white"
          active-class="bg-white/10 text-white"
          @click="$emit('close')"
        >
          Clienti
        </RouterLink>

        <RouterLink
          to="/projects"
          class="flex h-11 items-center rounded-2xl px-4 text-sm font-medium text-white/70 transition hover:bg-white/8 hover:text-white"
          active-class="bg-white/10 text-white"
          @click="$emit('close')"
        >
          Progetti
        </RouterLink>

        <RouterLink
          to="/settings"
          class="flex h-11 items-center rounded-2xl px-4 text-sm font-medium text-white/70 transition hover:bg-white/8 hover:text-white"
          active-class="bg-white/10 text-white"
          @click="$emit('close')"
        >
          Settings
        </RouterLink>
      </nav>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

import CloseIcon from '@/icons/CloseIcon.vue'

defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  close: []
}>()
</script>
