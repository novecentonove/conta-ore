import { createRouter, createWebHistory } from 'vue-router'

import MonthTracker from '@/pages/MonthTracker.vue'
import SettingsPage from '@/pages/SettingsPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'month-tracker',
      component: MonthTracker,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsPage,
    },
  ],
})

export default router
