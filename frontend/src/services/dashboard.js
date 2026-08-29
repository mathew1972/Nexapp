import { callFrappeApi } from './api'

export async function getDashboards() {
  return await callFrappeApi('nexapp.reporting_api.get_dashboards')
}

export async function getDashboard(dashboard_name) {
  return await callFrappeApi('nexapp.reporting_api.get_dashboard', { dashboard_name })
}

export async function saveDashboard(payload) {
  return await callFrappeApi('nexapp.reporting_api.save_dashboard', {
    dashboard_name: payload.dashboard_name,
    description: payload.description,
    visibility: payload.visibility,
    layout_config: JSON.stringify(payload.layout_config || {}),
    widgets: JSON.stringify(payload.widgets || []),
    shares: JSON.stringify(payload.shares || [])
  })
}

export async function executeWidget(widget_name) {
  return await callFrappeApi('nexapp.reporting_api.execute_dashboard_widget', { widget_name })
}

export async function executeDashboardBatch(dashboard_name) {
  return await callFrappeApi('nexapp.reporting_api.execute_dashboard_batch', { dashboard_name })
}
