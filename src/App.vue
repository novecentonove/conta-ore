<template>
  <div class="flex h-screen flex-col overflow-hidden bg-[#18181F] text-white">
    <div class="flex justify-between relative z-50 shrink-0">
      <MenuToggleButton :is-open="isSidebarOpen" @toggle="toggleSidebar" class="pt-2 pl-3" />
      <TitleBar />
    </div>

    <SideMenu :is-open="isSidebarOpen" @close="closeSidebar" />

    <div class="min-h-0 flex flex-1 flex-col overflow-hidden">
      <!-- <div class="shrink-0 px-3 py-3">
        <MenuToggleButton :is-open="isSidebarOpen" @toggle="toggleSidebar" />
      </div> -->

      <main class="min-h-0 flex-1 overflow-hidden">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'

import SideMenu from './components/SideMenu.vue'
import TitleBar from './components/TitleBar.vue'
import MenuToggleButton from './icons/MenuToggleButton.vue'

const isSidebarOpen = ref(false)

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeSidebar() {
  isSidebarOpen.value = false
}
</script>
