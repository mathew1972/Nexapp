<template>
  <div class="p-8 max-w-5xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-2xl font-bold text-gray-800">Reports</h1>
      <router-link to="/reports/new" class="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition">
        + New Report
      </router-link>
    </div>
    
    <div v-if="reportStore.loading" class="text-gray-500">
      Loading reports...
    </div>
    
    <div v-else-if="reportStore.error" class="text-red-500 bg-red-50 p-4 rounded mb-6">
      {{ reportStore.error }}
    </div>
    
    <div v-else class="space-y-8">
      <!-- My Reports -->
      <section>
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-4">My Reports</h2>
        <div v-if="reportStore.myReports.length === 0" class="text-sm text-gray-500 italic">No reports created yet.</div>
        <div v-else class="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="report in reportStore.myReports" :key="report.name" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ report.report_name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ report.data_source }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ report.visibility }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ report.modified ? report.modified.split(' ')[0] : '' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <router-link :to="`/reports/${report.name}`" class="text-blue-600 hover:text-blue-900 font-medium mr-4">Open</router-link>
                  <button @click="deleteReport(report.name)" class="text-red-600 hover:text-red-900 font-medium">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Shared With Me -->
      <section v-if="reportStore.sharedReports.length > 0">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-4">Shared With Me</h2>
        <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="report in reportStore.sharedReports" :key="report.name" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ report.report_name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ report.data_source }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ report.report_owner }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <router-link :to="`/reports/${report.name}`" class="text-blue-600 hover:text-blue-900 font-medium">Open</router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Public Reports -->
      <section v-if="reportStore.publicReports.length > 0">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-4">Public Reports</h2>
        <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="report in reportStore.publicReports" :key="report.name" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ report.report_name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ report.data_source }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ report.report_owner }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <router-link :to="`/reports/${report.name}`" class="text-blue-600 hover:text-blue-900 font-medium">Open</router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useReportStore } from '../stores/reportStore'

const reportStore = useReportStore()

onMounted(() => {
  reportStore.fetchReports()
})

async function deleteReport(name) {
  if (confirm(`Are you sure you want to delete ${name}?`)) {
    try {
      await reportStore.removeReport(name)
    } catch(e) {
      alert(e.message)
    }
  }
}
</script>
