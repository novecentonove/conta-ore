<template>
  <div class="titlebar" ref="titlebar" data-tauri-drag-region>
    <div class="titlebar_button" @click="appWindow.minimize()">
      <WindowMinimize width="1em" />
    </div>
    <div class="titlebar_button" @click="appWindow.toggleMaximize()">
      <WindowMaximize width="1em" />
    </div>
    <div class="titlebar_button" @click="appWindow.close()">
      <WindowClose width="1em" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'

import WindowMinimize from '@/icons/WindowMinimize.vue'
import WindowMaximize from '@/icons/WindowMaximize.vue'
import WindowClose from '@/icons/WindowClose.vue'

const appWindow = getCurrentWindow()
</script>

<style>
.titlebar {
  width: 100%;
  height: 30px;
  display: flex;
  justify-content: flex-end;
}

.titlebar_button {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 30px;
  height: 30px;
}

.titlebar_button:hover {
  background-color: black;
}

.fileDrawer {
  height: 100vh;
  white-space: nowrap;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .4s
}
.fade-enter-from, .fade-leave-to{
  opacity: 0
}

</style>