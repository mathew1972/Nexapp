<template>
  <div class="p-8 max-w-5xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-2xl font-bold text-gray-800">Dashboards</h1>
      <router-link to="/dashboards/new" class="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition">
        + New Dashboard
      </router-link>
    </div>
    
    <div v-if="loading" class="text-gray-500">Loading dashboards...</div>
    <div v-else-if="error" class="text-red-500 bg-red-50 p-4 rounded mb-6">{{ error }}</div>
    
    <div v-else class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dashboard Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="db in dashboards" :key="db.name" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ db.dashboard_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ db.visibility }} (Owned)</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
              <router-link :to="`/dashboards/${db.name}`" class="text-blue-600 hover:text-blue-900 font-medium">Open</router-link>
            </td>
          </tr>
          <tr v-for="db in publicDashboards" :key="db.name" class="hover:bg-gray-50 bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ db.dashboard_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ db.visibility }} (Public)</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
              <router-link :to="`/dashboards/${db.name}`" class="text-blue-600 hover:text-blue-900 font-medium">Open</router-link>
            </td>
          </tr>
          <tr v-for="db in sharedDashboards" :key="db.name" class="hover:bg-gray-50 bg-blue-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ db.dashboard_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ db.visibility }} (Shared)</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
              <router-link :to="`/dashboards/${db.name}`" class="text-blue-600 hover:text-blue-900 font-medium">Open</router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getDashboards } from '../services/dashboard'

const dashboards = ref([])
const publicDashboards = ref([])
const sharedDashboards = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const res = await getDashboards()
    dashboards.value = res.my_dashboards || []
    publicDashboards.value = res.public_dashboards || []
    sharedDashboards.value = res.shared_dashboards || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>
