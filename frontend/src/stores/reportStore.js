import { defineStore } from 'pinia'
import { getReports, getReport, deleteReport } from '../services/reporting'
import { ref } from 'vue'

export const useReportStore = defineStore('reports', () => {
  const myReports = ref([])
  const sharedReports = ref([])
  const publicReports = ref([])
  
  const loading = ref(false)
  const error = ref(null)

  const currentReport = ref(null)

  async function fetchReports() {
    loading.value = true
    error.value = null
    try {
      const data = await getReports()
      myReports.value = data.my_reports || []
      sharedReports.value = data.shared_reports || []
      publicReports.value = data.public_reports || []
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function loadReport(name) {
    loading.value = true
    error.value = null
    try {
      const data = await getReport(name)
      currentReport.value = data
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function removeReport(name) {
    loading.value = true
    error.value = null
    try {
      await deleteReport(name)
      await fetchReports()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    myReports,
    sharedReports,
    publicReports,
    loading,
    error,
    currentReport,
    fetchReports,
    loadReport,
    removeReport
  }
})
