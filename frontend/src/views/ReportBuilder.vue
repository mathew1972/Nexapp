<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b px-6 py-4 flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <router-link to="/reports" class="text-gray-500 hover:text-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </router-link>
        <h1 class="text-xl font-semibold text-gray-800">
          <input type="text" v-model="reportName" placeholder="Untitled Report" class="border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-2 py-1 bg-transparent w-64" />
        </h1>
      </div>
      <div>
        <button @click="openSaveDialog" class="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition">
          {{ isExisting ? 'Update Report' : 'Save Report' }}
        </button>
      </div>
    </header>
    
    <!-- Main Workspace -->
    <div class="flex flex-1 overflow-hidden">
      
      <!-- Left Sidebar (Configuration) -->
      <aside class="w-80 bg-white border-r flex flex-col overflow-y-auto shrink-0 shadow-sm z-10">
        
        <!-- Data Source -->
        <div class="p-4 border-b">
          <label class="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
          <select 
            :value="store.currentSource" 
            @change="store.setDataSource($event.target.value)"
            class="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
          >
            <option value="">Select DocType...</option>
            <option v-for="source in store.dataSources" :key="source" :value="source">
              {{ source }}
            </option>
          </select>
          <div v-if="store.loadingSources" class="text-xs text-gray-500 mt-1">Loading...</div>
        </div>
        
        <!-- Field Selector -->
        <div class="p-4 border-b flex-1 flex flex-col min-h-0" v-if="store.currentSource">
          <label class="block text-sm font-medium text-gray-700 mb-2">Available Fields</label>
          <div class="mb-2">
            <input type="text" v-model="searchQuery" placeholder="Search fields..." class="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1.5 px-3 border" />
          </div>
          
          <div class="overflow-y-auto flex-1 pr-1 space-y-1">
            <div v-if="store.loadingMetadata" class="text-sm text-gray-500 p-2">Loading fields...</div>
            <button 
              v-else
              v-for="field in filteredFields" 
              :key="field.fieldname"
              @click="store.addField(field.fieldname)"
              :disabled="store.config.fields.includes(field.fieldname)"
              class="w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center transition-colors"
              :class="store.config.fields.includes(field.fieldname) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-blue-50 text-gray-700 hover:text-blue-700'"
            >
              <span class="truncate">{{ field.label }}</span>
              <span class="text-xs opacity-50">{{ field.fieldtype }}</span>
            </button>
            <div v-if="!store.loadingMetadata && filteredFields.length === 0" class="text-sm text-gray-500 p-2">
              No fields found
            </div>
          </div>
        </div>
        
      </aside>
      
      <!-- Right Pane (Builder & Preview) -->
      <main class="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden relative">
        
        <div v-if="!store.currentSource" class="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div class="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md">
            <svg class="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            <h2 class="text-xl font-bold text-gray-800 mb-2">Build your first report</h2>
            <p class="text-gray-500 mb-6">Select a data source from the sidebar to get started.</p>
          </div>
        </div>

        <div v-else class="flex flex-col h-full">
          
          <!-- Configuration Bar (Selected Fields, Filters, Sort) -->
          <div class="bg-white border-b shadow-sm z-10 shrink-0 flex flex-col">
            
            <!-- Selected Fields -->
            <div class="p-4 border-b">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Selected Columns</h3>
              <div v-if="store.config.fields.length === 0" class="text-sm text-gray-500 italic">
                Choose columns from the available fields list.
              </div>
              <div class="flex flex-wrap gap-2" @dragover.prevent @drop="onDropField($event)">
                <div 
                  v-for="(fieldname, index) in store.config.fields" 
                  :key="fieldname"
                  draggable="true"
                  @dragstart="onDragStartField($event, index)"
                  @dragenter.prevent
                  @dragover.prevent
                  @drop.stop="onDropFieldAt($event, index)"
                  class="bg-blue-50 border border-blue-100 text-blue-800 text-sm px-3 py-1.5 rounded-full flex items-center shadow-sm cursor-move"
                >
                  <span class="mr-2 cursor-move">☷ {{ getFieldLabel(fieldname) }}</span>
                  <button @click="store.removeField(fieldname)" class="text-blue-400 hover:text-blue-800 focus:outline-none">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Filters & Sort Bar -->
            <div class="p-4 flex flex-col gap-4">
              <!-- Filters -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filters</h3>
                  <button @click="addNewFilter" class="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Add Filter
                  </button>
                </div>
                
                <div v-if="store.config.filters.length === 0" class="text-sm text-gray-400 italic">
                  No filters applied
                </div>
                
                <div class="space-y-2">
                  <div v-for="(filter, index) in store.config.filters" :key="index" class="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                    <select v-model="filter[0]" @change="onFilterFieldChange(index, filter)" class="text-sm border-gray-300 rounded py-1 px-2 w-48">
                      <option value="">Select Field</option>
                      <option v-for="f in store.availableFields" :key="f.fieldname" :value="f.fieldname">{{ f.label }}</option>
                    </select>
                    
                    <select v-model="filter[1]" @change="store.updateFilter(index, filter)" class="text-sm border-gray-300 rounded py-1 px-2 w-32">
                      <option v-for="op in getOperatorsForField(filter[0])" :key="op.value" :value="op.value">{{ op.label }}</option>
                    </select>
                    
                    <select v-if="getFieldType(filter[0]) === 'Select'" v-model="filter[2]" @change="store.updateFilter(index, filter)" class="text-sm border-gray-300 rounded py-1 px-2 flex-1">
                      <option value="">Select...</option>
                      <option v-for="opt in getSelectOptions(filter[0])" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                    <input v-else-if="['Date', 'Datetime'].includes(getFieldType(filter[0]))" type="date" v-model="filter[2]" @change="store.updateFilter(index, filter)" class="text-sm border-gray-300 rounded py-1 px-2 flex-1" />
                    <input v-else-if="['Check'].includes(getFieldType(filter[0]))" type="checkbox" v-model="filter[2]" @change="store.updateFilter(index, filter)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" true-value="1" false-value="0" />
                    <input v-else type="text" v-model="filter[2]" @change="store.updateFilter(index, filter)" @keyup.enter="store.updateFilter(index, filter)" placeholder="Value" class="text-sm border-gray-300 rounded py-1 px-2 flex-1" />
                    
                    <button @click="store.removeFilter(index)" class="text-gray-400 hover:text-red-500 p-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
              <!-- Group By -->
              <div class="mt-4">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Group By</h3>
                  <button @click="store.addGroupField('')" class="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Add Group
                  </button>
                </div>
                
                <div v-if="store.config.group_by.length === 0" class="text-sm text-gray-400 italic mb-2">
                  No grouping applied
                </div>
                
                <div class="space-y-2 mb-4">
                  <div v-for="(group, index) in store.config.group_by" :key="index" class="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                    <select :value="group" @change="e => { store.config.group_by[index] = e.target.value; store.triggerPreview() }" class="text-sm border-gray-300 rounded py-1 px-2 flex-1">
                      <option value="">Select Field</option>
                      <option v-for="f in store.availableFields" :key="f.fieldname" :value="f.fieldname">{{ f.label }}</option>
                    </select>
                    
                    <button @click="store.removeGroupField(group)" class="text-gray-400 hover:text-red-500 p-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Aggregations -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aggregations</h3>
                  <button @click="store.addAggregation({function: 'count', field: 'name', alias: 'count'})" class="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Add Aggregation
                  </button>
                </div>
                
                <div v-if="store.config.aggregations.length === 0" class="text-sm text-gray-400 italic">
                  No aggregations
                </div>
                
                <div class="space-y-2">
                  <div v-for="(agg, index) in store.config.aggregations" :key="index" class="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                    <select v-model="agg.function" @change="store.updateAggregation(index, agg)" class="text-sm border-gray-300 rounded py-1 px-2 w-28">
                      <option value="count">Count</option>
                      <option value="sum">Sum</option>
                      <option value="avg">Average</option>
                      <option value="min">Min</option>
                      <option value="max">Max</option>
                    </select>

                    <select v-model="agg.field" @change="store.updateAggregation(index, agg)" class="text-sm border-gray-300 rounded py-1 px-2 flex-1">
                      <option value="name">Name (ID)</option>
                      <option v-for="f in store.availableFields" :key="f.fieldname" :value="f.fieldname">{{ f.label }}</option>
                    </select>

                    <input type="text" v-model="agg.alias" @change="store.updateAggregation(index, agg)" placeholder="Alias" class="text-sm border-gray-300 rounded py-1 px-2 w-24" />
                    
                    <button @click="store.removeAggregation(index)" class="text-gray-400 hover:text-red-500 p-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Sort -->
              <div class="flex items-center gap-3">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Sort By</h3>
                <select 
                  :value="store.config.sort_by.field"
                  @change="store.setSort($event.target.value, store.config.sort_by.order)"
                  class="text-sm border-gray-300 rounded py-1 px-2 w-48"
                >
                  <option value="">None</option>
                  <option v-for="f in store.config.fields" :key="f" :value="f">{{ getFieldLabel(f) }}</option>
                  <option v-for="agg in store.config.aggregations" :key="agg.alias" :value="agg.alias">{{ agg.alias }} (Agg)</option>
                </select>
                
                <select 
                  v-if="store.config.sort_by.field"
                  :value="store.config.sort_by.order"
                  @change="store.setSort(store.config.sort_by.field, $event.target.value)"
                  class="text-sm border-gray-300 rounded py-1 px-2 w-32"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- Live Preview Area -->
          <div class="flex-1 overflow-auto p-6 bg-gray-50 relative">
            <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
              <span>Preview</span>
              <span v-if="store.loadingPreview" class="text-sm font-normal text-blue-600 flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Updating...
              </span>
            </h2>
            
            <div v-if="store.config.fields.length === 0" class="text-center py-12 text-gray-500 bg-white border border-dashed rounded-lg">
              No columns selected. Add fields from the left sidebar to see data.
            </div>
            
            <div v-else-if="store.previewError" class="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100 shadow-sm">
              <h3 class="font-bold">Preview Error</h3>
              <p class="text-sm mt-1">{{ store.previewError }}</p>
            </div>
            
            <div v-else-if="store.previewData" class="bg-white rounded-lg shadow border overflow-hidden flex flex-col">
              
              <!-- Table Wrapper for horizontal scroll -->
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th 
                        v-for="fieldname in store.config.fields" 
                        :key="fieldname"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {{ getFieldLabel(fieldname) }}
                      </th>
                      <th 
                        v-for="agg in store.config.aggregations" 
                        :key="agg.alias"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-blue-50"
                      >
                        {{ agg.alias }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-if="store.previewData.rows.length === 0">
                      <td :colspan="store.config.fields.length + store.config.aggregations.length" class="px-6 py-8 text-center text-gray-500">
                        No records found matching current filters.
                      </td>
                    </tr>
                    <tr v-for="(row, idx) in store.previewData.rows" :key="row.name || idx" class="hover:bg-gray-50">
                      <td 
                        v-for="fieldname in store.config.fields" 
                        :key="fieldname"
                        class="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                      >
                        {{ row[fieldname] !== null && row[fieldname] !== undefined ? row[fieldname] : '-' }}
                      </td>
                      <td 
                        v-for="agg in store.config.aggregations" 
                        :key="agg.alias"
                        class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700 bg-blue-50/30"
                      >
                        {{ row[agg.alias] !== null && row[agg.alias] !== undefined ? row[agg.alias] : '-' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- Pagination -->
              <div class="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div class="text-sm text-gray-700">
                  Showing <span class="font-medium">{{ store.previewData.rows.length ? store.config.start + 1 : 0 }}</span> to <span class="font-medium">{{ store.config.start + store.previewData.rows.length }}</span> of <span class="font-medium">{{ store.previewData.total_count }}</span> results
                </div>
                <div class="flex space-x-2">
                  <button 
                    @click="store.setPage(Math.max(0, store.config.start - store.config.limit))"
                    :disabled="store.config.start === 0 || store.loadingPreview"
                    class="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-100"
                  >Previous</button>
                  <button 
                    @click="store.setPage(store.config.start + store.config.limit)"
                    :disabled="store.config.start + store.config.limit >= store.previewData.total_count || store.loadingPreview"
                    class="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-100"
                  >Next</button>
                </div>
              </div>
              
            </div>
            
          </div>
          
        </div>
        
      </main>
    </div>

    <!-- Save Dialog -->
    <div v-if="showSaveDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">{{ isExisting ? 'Update Report' : 'Save Report' }}</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Report Name</label>
            <input type="text" v-model="saveForm.report_name" :disabled="isExisting" class="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border disabled:bg-gray-100" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="saveForm.description" rows="2" class="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input type="radio" v-model="saveForm.visibility" value="Private" class="text-blue-600 focus:ring-blue-500 border-gray-300" />
                <span class="ml-2 text-sm text-gray-700">Private</span>
              </label>
              <label class="flex items-center">
                <input type="radio" v-model="saveForm.visibility" value="Specific Users" class="text-blue-600 focus:ring-blue-500 border-gray-300" />
                <span class="ml-2 text-sm text-gray-700">Specific Users</span>
              </label>
              <label class="flex items-center">
                <input type="radio" v-model="saveForm.visibility" value="Roles" class="text-blue-600 focus:ring-blue-500 border-gray-300" />
                <span class="ml-2 text-sm text-gray-700">Roles</span>
              </label>
              <label class="flex items-center">
                <input type="radio" v-model="saveForm.visibility" value="Public" class="text-blue-600 focus:ring-blue-500 border-gray-300" />
                <span class="ml-2 text-sm text-gray-700">Public</span>
              </label>
            </div>
          </div>

          <div v-if="saveForm.visibility === 'Specific Users'" class="pt-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Select Users</label>
            <select multiple v-model="selectedUsers" class="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border" size="4">
              <option v-for="user in availableUsers" :key="user.name" :value="user.name">
                {{ user.full_name || user.name }} ({{ user.name }})
              </option>
            </select>
          </div>

          <div v-if="saveForm.visibility === 'Roles'" class="pt-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Select Roles</label>
            <select multiple v-model="selectedRoles" class="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border" size="4">
              <option v-for="role in availableRoles" :key="role" :value="role">
                {{ role }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end space-x-3">
          <button @click="showSaveDialog = false" class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
            Cancel
          </button>
          <button @click="submitSave" :disabled="saving" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50">
            {{ saving ? 'Saving...' : 'Save Report' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useReportBuilderStore } from '../stores/reportBuilderStore'
import { useRoute, useRouter } from 'vue-router'
import { getReport, saveReport, updateReport, getShareTargets } from '../services/reporting'

const store = useReportBuilderStore()
const route = useRoute()
const router = useRouter()

const reportName = ref('')
const searchQuery = ref('')
const isExisting = ref(false)

const showSaveDialog = ref(false)
const saving = ref(false)

const availableUsers = ref([])
const availableRoles = ref([])
const selectedUsers = ref([])
const selectedRoles = ref([])

const saveForm = reactive({
  report_name: '',
  description: '',
  visibility: 'Private'
})

onMounted(async () => {
  await store.fetchSources()
  
  try {
    const targets = await getShareTargets()
    availableUsers.value = targets.users || []
    availableRoles.value = targets.roles || []
  } catch(e) {
    console.error("Failed to load share targets", e)
  }

  if (route.params.name && route.name === 'ReportDetail') {
    try {
      const doc = await getReport(route.params.name)
      isExisting.value = true
      reportName.value = doc.report_name
      saveForm.report_name = doc.report_name
      saveForm.description = doc.description || ''
      saveForm.visibility = doc.visibility
      
      if (doc.visibility === 'Specific Users') {
        selectedUsers.value = doc.shares.map(s => s.user)
      } else if (doc.visibility === 'Roles') {
        selectedRoles.value = doc.shares.map(s => s.role)
      }
      
      await store.setDataSource(doc.data_source)
      // Apply config
      store.config.fields = doc.configuration.fields || []
      store.config.filters = doc.configuration.filters || []
      store.config.sort_by = doc.configuration.sort_by || { field: '', order: 'asc' }
      store.config.limit = doc.configuration.limit || 50
      store.config.start = 0
      
      store.triggerPreview()
    } catch (e) {
      alert("Failed to load report: " + e.message)
    }
  }
})

function openSaveDialog() {
  if (!store.currentSource) return alert("Please select a data source first")
  if (store.config.fields.length === 0) return alert("Please select at least one field")
  
  if (!isExisting.value) {
    saveForm.report_name = reportName.value || 'Untitled Report'
  }
  showSaveDialog.value = true
}

async function submitSave() {
  if (!saveForm.report_name) return alert("Report Name is required")
  
  saving.value = true
  try {
    let shares = []
    if (saveForm.visibility === 'Specific Users') {
      shares = selectedUsers.value.map(user => ({ share_type: 'User', user }))
    } else if (saveForm.visibility === 'Roles') {
      shares = selectedRoles.value.map(role => ({ share_type: 'Role', role }))
    }

    const payload = {
      report_name: saveForm.report_name,
      description: saveForm.description,
      data_source: store.currentSource,
      visibility: saveForm.visibility,
      shares: shares,
      configuration: {
        data_source: store.currentSource,
        fields: store.config.fields,
        filters: store.config.filters,
        sort_by: store.config.sort_by,
        limit: store.config.limit,
        start: store.config.start
      }
    }

    if (isExisting.value) {
      await updateReport(saveForm.report_name, payload)
      alert("Report updated successfully")
      showSaveDialog.value = false
    } else {
      const name = await saveReport(payload)
      showSaveDialog.value = false
      router.push(`/reports/${name}`)
    }
  } catch (e) {
    alert("Error: " + e.message)
  } finally {
    saving.value = false
  }
}

const filteredFields = computed(() => {
  if (!searchQuery.value) return store.availableFields
  const query = searchQuery.value.toLowerCase()
  return store.availableFields.filter(f => 
    f.label.toLowerCase().includes(query) || f.fieldname.toLowerCase().includes(query)
  )
})

function getField(fieldname) {
  return store.availableFields.find(f => f.fieldname === fieldname)
}

function getFieldLabel(fieldname) {
  const f = getField(fieldname)
  return f ? f.label : fieldname
}

function getFieldType(fieldname) {
  const f = getField(fieldname)
  return f ? f.fieldtype : 'Data'
}

function getSelectOptions(fieldname) {
  const f = getField(fieldname)
  if (!f || !f.options) return []
  return f.options.split('\n').filter(o => o.trim())
}

function getOperatorsForField(fieldname) {
  const type = getFieldType(fieldname)
  const common = [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not Equals' },
    { value: 'in', label: 'In' },
    { value: 'not in', label: 'Not In' }
  ]
  const numericDate = [
    ...common,
    { value: '>', label: 'Greater Than' },
    { value: '<', label: 'Less Than' },
    { value: '>=', label: 'Greater/Equal' },
    { value: '<=', label: 'Less/Equal' }
  ]
  
  if (['Int', 'Float', 'Currency', 'Percent', 'Date', 'Datetime'].includes(type)) {
    return numericDate
  }
  if (['Select', 'Link', 'Check'].includes(type)) {
    return common
  }
  return [...common, { value: 'like', label: 'Like' }]
}

function addNewFilter() {
  const defaultField = store.availableFields.length > 0 ? store.availableFields[0].fieldname : 'name'
  const ops = getOperatorsForField(defaultField)
  store.addFilter([defaultField, ops[0].value, ''])
}

function onFilterFieldChange(index, filter) {
  const fieldname = filter[0]
  const ops = getOperatorsForField(fieldname)
  if (!ops.find(o => o.value === filter[1])) {
    filter[1] = ops[0].value
  }
  if (getFieldType(fieldname) === 'Check') {
    filter[2] = '0'
  } else {
    filter[2] = ''
  }
  store.updateFilter(index, filter)
}

// Drag and drop logic
let draggedFieldIndex = -1

function onDragStartField(event, index) {
  draggedFieldIndex = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', index)
}

function onDropFieldAt(event, dropIndex) {
  if (draggedFieldIndex === -1 || draggedFieldIndex === dropIndex) return
  store.reorderField(draggedFieldIndex, dropIndex)
  draggedFieldIndex = -1
}

function onDropField(event) {
  if (draggedFieldIndex === -1) return
  // If dropped at end
  store.reorderField(draggedFieldIndex, store.config.fields.length - 1)
  draggedFieldIndex = -1
}
</script>
