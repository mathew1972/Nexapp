import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/reports', component: () => import('../views/reports/ReportHome.vue') },
  { path: '/reports/new', component: () => import('../views/reports/ReportCreate.vue') },
  { path: '/reports/builder/:type', component: () => import('../views/reports/ReportBuilder.vue') },
  { path: '/reports/viewer/:id', component: () => import('../views/reports/ReportViewer.vue') },
  { path: '/dashboards', component: () => import('../views/dashboards/DashboardHome.vue') },
  { path: '/dashboards/builder/:id', component: () => import('../views/dashboards/DashboardBuilder.vue') },
  // Nexapp CRM Management Dashboard (Phase 1)
  // Served as a standalone page within the Nexapp SPA
  { path: '/crm-dashboard', component: () => import('../views/crm/NexappCRMDashboard.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
