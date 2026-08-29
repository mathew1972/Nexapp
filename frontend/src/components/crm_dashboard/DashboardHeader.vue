<template>
  <div class="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 sticky top-0 z-30 shadow-xs">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-7xl mx-auto">
      
      <!-- Left: Brand Icon, Title & Scope Pill -->
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        
        <div class="min-w-0 flex items-center gap-2.5 flex-wrap">
          <h1 class="text-sm sm:text-base font-bold text-slate-900 tracking-tight shrink-0">CRM Management</h1>
          
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all" :class="scopeBadge">
            <span class="w-1.5 h-1.5 rounded-full" :class="scopeDot"></span>
            <span class="truncate max-w-[180px] sm:max-w-none">{{ store.scopeDescription }}</span>
          </span>
          
          <span v-if="store.currentScope?.user_count" class="text-xs text-slate-400 font-medium hidden sm:inline">
            • {{ store.currentScope.user_count }} users
          </span>
        </div>
      </div>

      <!-- Right: Scope Selectors & Actions Group -->
      <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end min-w-0">
        
        <!-- Modern Integrated Filter Bar -->
        <div class="inline-flex items-center p-1 bg-slate-100/80 border border-slate-200/90 rounded-xl gap-1 min-w-0">
          <!-- Period Selector -->
          <div class="relative flex items-center">
            <select v-model="store.selectedPeriod" @change="store.setPeriod(store.selectedPeriod)" class="sf-select-grouped" aria-label="Select Period">
              <option v-for="o in store.periodOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          
          <!-- Team Selector -->
          <div v-if="store.salesTeamOptions.length > 1" class="flex items-center gap-1">
            <div class="h-4 w-px bg-slate-300/80 shrink-0"></div>
            <select v-model="store.selectedSalesTeam" @change="store.setSalesTeam(store.selectedSalesTeam)" class="sf-select-grouped" aria-label="Select Team">
              <option v-for="o in store.salesTeamOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          
          <!-- Sales Rep Selector -->
          <div v-if="store.salesUserOptions.length > 1" class="flex items-center gap-1">
            <div class="h-4 w-px bg-slate-300/80 shrink-0"></div>
            <select v-model="store.selectedSalesUser" @change="store.setSalesUser(store.selectedSalesUser)" class="sf-select-grouped" aria-label="Select Rep">
              <option v-for="o in store.salesUserOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
        </div>

        <!-- Action Buttons (Refresh & Export) -->
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Refresh Button -->
          <button
            @click="store.validateScope"
            :disabled="store.loadingScope"
            class="sf-header-btn"
            title="Reload analytics data"
          >
            <svg class="w-3.5 h-3.5 text-slate-600" :class="{ 'animate-spin': store.loadingScope }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span class="hidden sm:inline font-semibold">Refresh</span>
          </button>

          <!-- Export Dropdown -->
          <div ref="exportMenuRef" class="relative">
            <button
              @click="showExportMenu = !showExportMenu"
              :disabled="store.exportingReport"
              class="sf-header-btn"
              title="Export current view"
            >
              <svg class="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span class="hidden sm:inline font-semibold">{{ store.exportingReport ? 'Exporting...' : 'Export' }}</span>
              <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <div v-if="showExportMenu" class="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40">
              <button @click="handleExport('csv')" class="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors">
                <span>Export CSV</span>
                <span class="text-[10px] text-slate-400 font-mono">.csv</span>
              </button>
              <button @click="handleExport('xlsx')" class="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors">
                <span>Export Excel</span>
                <span class="text-[10px] text-slate-400 font-mono">.xlsx</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Date Range Bar (Conditional) -->
    <div v-if="store.selectedPeriod === 'custom'" class="mt-2.5 max-w-7xl mx-auto flex items-center gap-2 pt-2.5 border-t border-slate-100 text-xs flex-wrap">
      <span class="text-xs text-slate-600 font-semibold">Custom Period:</span>
      <span class="text-xs text-slate-400 font-medium">From</span>
      <input type="date" v-model="store.customFromDate" class="sf-input-date" />
      <span class="text-xs text-slate-400 font-medium">To</span>
      <input type="date" v-model="store.customToDate" class="sf-input-date" />
      <button @click="store.applyCustomDates(store.customFromDate, store.customToDate)" class="sf-btn-primary text-xs">Apply</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'

const store = useCrmDashboardStore()
const showExportMenu = ref(false)
const exportMenuRef = ref(null)

const scopeBadge = computed(() => store.isUnrestricted ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80 shadow-2xs' : 'bg-blue-50/90 text-blue-700 border-blue-200/80 shadow-2xs')
const scopeDot = computed(() => store.isUnrestricted ? 'bg-emerald-500' : 'bg-blue-500')

function handleClickOutside(event) {
  if (exportMenuRef.value && !exportMenuRef.value.contains(event.target)) {
    showExportMenu.value = false
  }
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    showExportMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})

function handleExport(format) {
  showExportMenu.value = false
  store.exportReport(format)
}
</script>

<style scoped>
.sf-select-grouped {
  height: 30px;
  padding: 0 20px 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  appearance: auto;
  max-width: 145px;
  transition: all 0.15s ease;
}
.sf-select-grouped:hover {
  border-color: #cbd5e1;
}
.sf-select-grouped:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}
.sf-header-btn {
  height: 32px;
  min-width: 34px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
.sf-header-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}
.sf-header-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.sf-btn-primary {
  height: 28px;
  padding: 0 12px;
  font-weight: 600;
  color: white;
  background: #2563eb;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.sf-btn-primary:hover {
  background: #1d4ed8;
}
.sf-input-date {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #1e293b;
}
</style>

