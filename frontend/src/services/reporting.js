import { callFrappeApi } from './api'

export async function getUserCapabilities() {
  return await callFrappeApi('nexapp.reporting_api.get_user_capabilities')
}

export async function getAvailableReportSources() {
  return await callFrappeApi('nexapp.reporting_api.get_available_report_sources')
}

export async function getReportMetadata(doctype) {
  return await callFrappeApi('nexapp.reporting_api.get_report_metadata', { doctype })
}

export async function previewReport(config) {
  return await callFrappeApi('nexapp.reporting_api.preview_report', { config: JSON.stringify(config) })
}

export async function saveReport(payload) {
  return await callFrappeApi('nexapp.reporting_api.save_report', {
    report_name: payload.report_name,
    data_source: payload.data_source,
    configuration: JSON.stringify(payload.configuration),
    visibility: payload.visibility,
    description: payload.description,
    shares: payload.shares ? JSON.stringify(payload.shares) : null
  })
}

export async function updateReport(report_name, payload) {
  return await callFrappeApi('nexapp.reporting_api.update_report', {
    report_name,
    configuration: payload.configuration ? JSON.stringify(payload.configuration) : null,
    visibility: payload.visibility,
    description: payload.description,
    shares: payload.shares ? JSON.stringify(payload.shares) : null
  })
}

export async function getReport(report_name) {
  return await callFrappeApi('nexapp.reporting_api.get_report', { report_name })
}

export async function getReports() {
  return await callFrappeApi('nexapp.reporting_api.get_reports')
}

export async function deleteReport(report_name) {
  return await callFrappeApi('nexapp.reporting_api.delete_report', { report_name })
}

export async function runSavedReport(report_name) {
  return await callFrappeApi('nexapp.reporting_api.run_saved_report', { report_name })
}

export async function getShareTargets() {
  return await callFrappeApi('nexapp.reporting_api.get_share_targets')
}
