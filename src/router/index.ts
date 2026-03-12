import { createRouter, createWebHistory } from 'vue-router'

import MonthTracker from '@/pages/MonthTracker.vue'
import ClientsPage from '@/pages/ClientsPage.vue'
import ProjectsPage from '@/pages/ProjectsPage.vue'
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
    {
      path: '/clients',
      name: 'clients',
      component: ClientsPage,
    },
    {
      path: '/projects',
      name: 'projects',
      component: ProjectsPage,
    },
  ],
})

export default router
