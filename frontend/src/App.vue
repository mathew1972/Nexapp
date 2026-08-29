<template>
  <div v-if="isEmbed" class="embed-container">
    <router-view />
  </div>
  <div v-else class="min-h-screen bg-gray-50 flex">
    <!-- Basic minimal shell sidebar for testing -->
    <div class="w-64 bg-white border-r shadow-sm flex flex-col">
      <div class="p-6 border-b">
        <h2 class="text-lg font-bold text-gray-800">Nexapp</h2>
      </div>
      <nav class="flex-1 p-4 space-y-2">
        <router-link to="/crm-dashboard" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium transition-colors">
          CRM Dashboard
        </router-link>
        <router-link to="/reports" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md router-link-active:bg-blue-50 router-link-active:text-blue-700 font-medium transition-colors">
          Reports
        </router-link>
        <router-link to="/dashboards" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium transition-colors">
          Dashboards
        </router-link>
      </nav>
    </div>
    
    <!-- Main content -->
    <div class="flex-1 overflow-auto">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Embed mode: when loaded inside CRM iframe with ?embed=1,
// skip the Nexapp sidebar/shell and render only the dashboard component
const isEmbed = computed(() => route.query.embed === '1')
</script>

<style>
.router-link-active {
  background-color: #eff6ff;
  color: #1d4ed8;
}
.embed-container {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  overflow: auto;
}
</style>
