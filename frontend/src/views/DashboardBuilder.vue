<template>
  <div class="p-8 max-w-6xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">{{ isNew ? 'New Dashboard' : config.dashboard_name }}</h1>
      <div class="space-x-3">
        <button @click="save" class="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition">Save</button>
      </div>
    </div>

    <div class="bg-white p-6 rounded-lg shadow-sm border mb-6 flex gap-4">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 mb-1">Dashboard Name</label>
        <input type="text" v-model="config.dashboard_name" class="w-full border-gray-300 rounded py-2 px-3" />
      </div>
      <div class="w-48">
        <label class="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
        <select v-model="config.visibility" @change="onVisibilityChange" class="w-full border-gray-300 rounded py-2 px-3">
          <option>Private</option>
          <option>Specific Users</option>
          <option>Roles</option>
          <option>Public</option>
        </select>
      </div>
    </div>

    <!-- Share UI -->
    <div v-if="config.visibility === 'Specific Users' || config.visibility === 'Roles'" class="bg-white p-6 rounded-lg shadow-sm border mb-6">
      <h3 class="text-sm font-medium text-gray-700 mb-3">Share with {{ config.visibility }}</h3>
      <div v-if="config.visibility === 'Specific Users'" class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label v-for="u in shareTargets.users" :key="u.name" class="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded border">
          <input type="checkbox" :value="u.name" v-model="selectedUsers" />
          {{ u.full_name }} ({{ u.name }})
        </label>
      </div>
      <div v-if="config.visibility === 'Roles'" class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label v-for="r in shareTargets.roles" :key="r" class="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded border">
          <input type="checkbox" :value="r" v-model="selectedRoles" />
          {{ r }}
        </label>
      </div>
    </div>

    <div class="mb-4 flex justify-between items-center">
      <h2 class="text-lg font-semibold">Widgets</h2>
      <div class="space-x-3">
        <button v-if="!isNew" @click="executeAll" class="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100">Refresh Data</button>
        <button @click="addWidget" class="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">+ Add Widget</button>
      </div>
    </div>

    <div v-if="batchLoading" class="text-gray-500 mb-4">Loading dashboard data...</div>
    <div class="grid grid-cols-12 gap-6" style="grid-auto-rows: minmax(100px, auto);">
      <div v-for="(widget, idx) in config.widgets" :key="widget.config.layout_id || idx" 
           :style="{ 
             gridColumn: `${(widget.layout?.x || 0) + 1} / span ${widget.layout?.w || 6}`, 
             gridRow: `${(widget.layout?.y || 0) + 1} / span ${widget.layout?.h || 4}` 
           }"
           :data-idx="idx"
           class="widget-card bg-white border rounded-lg shadow-sm p-4 relative flex flex-col">
        <button @click="config.widgets.splice(idx, 1)" class="absolute top-2 right-2 text-gray-400 hover:text-red-500">&times;</button>
        <input type="text" v-model="widget.title" placeholder="Widget Title" class="font-semibold text-lg border-b border-dashed border-gray-300 pb-1 mb-3 w-full outline-none" />
        
        <div class="flex gap-2 mb-3">
          <select v-model="widget.report" class="text-sm border-gray-300 rounded p-1 flex-1">
            <option value="">Select Saved Report...</option>
            <option v-for="r in availableReports" :key="r.name" :value="r.name">{{ r.report_name }}</option>
          </select>
          <select v-model="widget.type" class="text-sm border-gray-300 rounded p-1 w-32">
            <option>Table</option>
            <option>Bar Chart</option>
            <option>Line Chart</option>
            <option>Pie Chart</option>
            <option>KPI</option>
          </select>
        </div>
        <div class="flex gap-2 mb-3 text-xs">
          <label>X: <input type="number" v-model.number="widget.layout.x" class="border rounded w-12 p-1 text-center" min="0" max="11" /></label>
          <label>Y: <input type="number" v-model.number="widget.layout.y" class="border rounded w-12 p-1 text-center" min="0" /></label>
          <label>W: <input type="number" v-model.number="widget.layout.w" class="border rounded w-12 p-1 text-center" min="1" max="12" /></label>
          <label>H: <input type="number" v-model.number="widget.layout.h" class="border rounded w-12 p-1 text-center" min="1" max="20" /></label>
        </div>

        <div class="flex justify-end mb-2">
          <button @click="runWidget(widget, idx)" class="text-xs text-blue-600 hover:underline">Execute</button>
        </div>

        <div v-if="widget.data && widget.type !== 'Table'" class="mb-3 p-2 bg-gray-50 border rounded text-xs flex gap-4">
          <div class="flex-1">
            <label class="block font-medium mb-1 text-gray-700">Dimensions (X-Axis)</label>
            <div class="space-y-1">
              <label v-for="col in (widget.data.columns || [])" :key="'dim'+col" class="flex items-center gap-1">
                <input type="checkbox" :value="col" v-model="widget.config.dimensions" /> {{ col }}
              </label>
            </div>
          </div>
          <div class="flex-1">
            <label class="block font-medium mb-1 text-gray-700">Measures (Y-Axis)</label>
            <div class="space-y-1">
              <label v-for="agg in (widget.data.aggregations || [])" :key="'meas'+agg.alias" class="flex items-center gap-1">
                <input type="checkbox" :value="agg.alias" v-model="widget.config.measures" /> {{ agg.alias }}
              </label>
            </div>
          </div>
        </div>

        <div v-if="widget.error" class="bg-red-50 text-red-500 border border-red-100 rounded p-4 text-sm mt-auto text-center">
          {{ widget.error }}
        </div>
        <div v-else-if="widget.loading" class="bg-gray-50 border rounded p-4 text-sm mt-auto text-center text-gray-400">
          Loading...
        </div>
        <div v-else-if="widget.data" class="bg-gray-50 border rounded p-2 overflow-hidden flex-1 min-h-[250px]">
          <TableRenderer v-if="widget.type === 'Table'" :data="widget.data" :config="widget.config" />
          <KpiRenderer v-else-if="widget.type === 'KPI'" :data="widget.data" :config="widget.config" />
          <template v-else>
            <ChartRenderer v-if="widget.visible" :type="widget.type" :data="widget.data" :config="widget.config" />
            <div v-else class="flex h-full items-center justify-center text-gray-400">Loading chart...</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineAsyncComponent, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDashboard, saveDashboard, executeWidget, executeDashboardBatch } from '../services/dashboard'
import { getReports, getShareTargets } from '../services/reporting'

import TableRenderer from '../components/dashboard/TableRenderer.vue'
import KpiRenderer from '../components/dashboard/KpiRenderer.vue'

const ChartRenderer = defineAsyncComponent(() => import('../components/dashboard/ChartRenderer.vue'))

const route = useRoute()
const router = useRouter()
const isNew = route.name === 'DashboardNew'

const batchLoading = ref(false)
const availableReports = ref([])
const config = ref({
  dashboard_name: 'Untitled Dashboard',
  visibility: 'Private',
  widgets: [],
  shares: []
})

const shareTargets = ref({ users: [], roles: [] })
const selectedUsers = ref([])
const selectedRoles = ref([])

function onVisibilityChange() {
  if (config.value.visibility !== 'Specific Users' && config.value.visibility !== 'Roles') {
    selectedUsers.value = []
    selectedRoles.value = []
  }
}

let observer = null
const setupObserver = () => {
  if (observer) observer.disconnect()
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = entry.target.dataset.idx
        if (config.value.widgets[idx]) {
          config.value.widgets[idx].visible = true
        }
      }
    })
  }, { threshold: 0.05 })
  
  nextTick(() => {
    document.querySelectorAll('.widget-card').forEach(el => observer.observe(el))
  })
}

watch(() => config.value.widgets.length, () => {
  setupObserver()
})

onMounted(async () => {
  shareTargets.value = await getShareTargets()
  const reps = await getReports()
  availableReports.value = [...(reps.my_reports||[]), ...(reps.public_reports||[]), ...(reps.shared_reports||[])]

  if (!isNew) {
    const data = await getDashboard(route.params.name)
    const dbLayout = typeof data.layout_config === 'string' ? JSON.parse(data.layout_config || '{}') : (data.layout_config || {})
    
    config.value = {
      dashboard_name: data.dashboard_name,
      visibility: data.visibility,
      widgets: data.widgets.map(w => ({
        name: w.name,
        title: w.widget_title,
        type: w.widget_type,
        report: w.source_report,
        config: typeof w.widget_config === 'string' ? JSON.parse(w.widget_config || '{"dimensions": [], "measures": [], "layout_id": ""}') : (w.widget_config || {dimensions: [], measures: [], layout_id: ""}),
        layout: dbLayout[typeof w.widget_config === 'string' ? JSON.parse(w.widget_config || '{}').layout_id : (w.widget_config?.layout_id)] || { x: 0, y: 0, w: 6, h: 4 },
        data: null,
        loading: false,
        error: null,
        visible: false
      }))
    }
    
    if (data.shares) {
      if (data.visibility === 'Specific Users') {
        selectedUsers.value = data.shares.filter(s => s.share_type === 'User').map(s => s.user)
      } else if (data.visibility === 'Roles') {
        selectedRoles.value = data.shares.filter(s => s.share_type === 'Role').map(s => s.role)
      }
    }
    
    setupObserver()
    // Auto-execute widgets via batch API
    await executeAll()
  }
})

async function executeAll() {
  if (isNew) return
  batchLoading.value = true
  config.value.widgets.forEach(w => w.loading = true)
  try {
    const results = await executeDashboardBatch(config.value.dashboard_name)
    for (const widget of config.value.widgets) {
      widget.loading = false
      const res = results[widget.name]
      if (res) {
        if (res.status === 'success') {
          widget.data = res.data
          widget.error = null
          // Auto populate
          if (widget.config.dimensions.length === 0 && widget.data.columns) {
            widget.config.dimensions = widget.data.columns.filter(c => !widget.data.aggregations?.find(a => a.alias === c))
          }
          if (widget.config.measures.length === 0 && widget.data.aggregations) {
            widget.config.measures = widget.data.aggregations.map(a => a.alias)
          }
        } else {
          widget.error = res.error || 'Failed to load widget'
        }
      }
    }
  } catch (e) {
    alert("Batch execution failed: " + e.message)
  } finally {
    batchLoading.value = false
  }
}

function addWidget() {
  const newLayoutId = 'lyt_' + Math.random().toString(36).substr(2, 9)
  config.value.widgets.push({
    title: 'New Widget',
    type: 'Table',
    report: '',
    config: {dimensions: [], measures: [], layout_id: newLayoutId},
    layout: { x: 0, y: config.value.widgets.length * 4, w: 6, h: 4 },
    data: null,
    loading: false,
    error: null,
    visible: false
  })
}

async function runWidget(widget, idx) {
  if (!widget.report) return alert("Select a report first")
  if (widget.name) {
    widget.loading = true
    widget.error = null
    try {
      widget.data = await executeWidget(widget.name)
      // Auto-populate config if empty
      if (widget.config.dimensions.length === 0 && widget.data.columns) {
        widget.config.dimensions = widget.data.columns.filter(c => !widget.data.aggregations?.find(a => a.alias === c))
      }
      if (widget.config.measures.length === 0 && widget.data.aggregations) {
        widget.config.measures = widget.data.aggregations.map(a => a.alias)
      }
    } catch (e) {
      widget.error = e.message || 'Failed to load widget'
    } finally {
      widget.loading = false
    }
  } else {
    alert("Please save the dashboard first to execute new widgets securely via backend.")
  }
}

async function save() {
  try {
    const layoutConfig = {}
    config.value.widgets.forEach(w => {
      // Ensure it has a layout_id before saving
      if (!w.config.layout_id) {
        w.config.layout_id = 'lyt_' + Math.random().toString(36).substr(2, 9)
      }
      layoutConfig[w.config.layout_id] = w.layout
    })
    
    let shares = []
    if (config.value.visibility === 'Specific Users') {
      shares = selectedUsers.value.map(u => ({ share_type: 'User', user: u }))
    } else if (config.value.visibility === 'Roles') {
      shares = selectedRoles.value.map(r => ({ share_type: 'Role', role: r }))
    }
    
    const payload = {
      ...config.value,
      layout_config: layoutConfig,
      shares
    }
    
    const name = await saveDashboard(payload)
    if (isNew) {
      router.push(`/dashboards/${name}`)
    } else {
      alert("Saved!")
    }
  } catch (e) {
    alert(e.message)
  }
}
</script>
