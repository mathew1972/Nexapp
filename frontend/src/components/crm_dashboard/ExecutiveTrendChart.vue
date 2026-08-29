<template>
  <div class="sf-card p-4 sm:p-5 relative transition-all duration-150">
    <!-- Card Header: Title & Subtitle + Interactive Series Legend -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
      <div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-600"></span>
          <h3 class="text-sm font-extrabold text-gray-900 tracking-tight">Sales Performance & Pipeline Velocity Trend</h3>
        </div>
        <p class="text-[11px] text-gray-500 font-medium mt-0.5">
          Daily Created Pipeline Value vs Won Revenue across active timeframe
        </p>
      </div>

      <!-- Compact Legend Controls -->
      <div v-if="!loading && hasData" class="flex items-center gap-3 text-xs font-semibold overflow-x-auto pb-1 sm:pb-0">
        <button
          @click="toggleSeries('created')"
          type="button"
          class="flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer whitespace-nowrap shrink-0"
          :class="visibleSeries.created ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200 line-through opacity-60'"
        >
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Created Pipeline</span>
        </button>

        <button
          @click="toggleSeries('won')"
          type="button"
          class="flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer whitespace-nowrap shrink-0"
          :class="visibleSeries.won ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200 line-through opacity-60'"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Won Revenue</span>
        </button>
      </div>
    </div>

    <!-- Loading Skeleton State -->
    <div v-if="loading" class="h-64 sm:h-72 w-full flex items-center justify-center bg-gray-50/50 rounded-lg animate-pulse">
      <div class="flex flex-col items-center gap-2">
        <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-xs text-gray-400 font-medium">Loading trend analytics...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasData" class="h-64 sm:h-72 w-full flex items-center justify-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
      <div class="text-center px-4">
        <p class="text-xs font-bold text-gray-500">No trend activity logged for active scope</p>
        <p class="text-[11px] text-gray-400 mt-1">Adjust period or team filter to review historical sales velocity.</p>
      </div>
    </div>

    <!-- ECharts Rendering Container -->
    <div v-else class="relative">
      <div ref="chartRef" class="w-full h-64 sm:h-72"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  points: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  currency: { type: String, default: 'INR' }
})

const chartRef = ref(null)
let chartInstance = null

const visibleSeries = ref({
  created: true,
  won: true
})

function toggleSeries(key) {
  visibleSeries.value[key] = !visibleSeries.value[key]
  renderChart()
}

const hasData = computed(() => {
  return Array.isArray(props.points) && props.points.length > 0
})

function fmtCurr(v) {
  if (v === null || v === undefined) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function renderChart() {
  if (!chartRef.value || !hasData.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const dates = props.points.map(p => formatDateLabel(p.date))
  const createdValues = props.points.map(p => p.created_pipeline_value || 0)
  const wonValues = props.points.map(p => p.won_revenue || 0)

  const series = []

  if (visibleSeries.value.created) {
    series.push({
      name: 'Created Pipeline',
      type: 'line',
      smooth: 0.2,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#3b82f6' },
      lineStyle: { width: 2, color: '#3b82f6' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(59, 130, 246, 0.12)' },
          { offset: 1, color: 'rgba(59, 130, 246, 0.0)' }
        ])
      },
      data: createdValues
    })
  }

  if (visibleSeries.value.won) {
    series.push({
      name: 'Won Revenue',
      type: 'line',
      smooth: 0.2,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#10b981' },
      lineStyle: { width: 2, color: '#10b981' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(16, 185, 129, 0.12)' },
          { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
        ])
      },
      data: wonValues
    })
  }

  const option = {
    grid: {
      top: 20,
      right: 15,
      bottom: 25,
      left: 55,
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc', fontSize: 11, fontFamily: 'sans-serif' },
      padding: [8, 12],
      formatter: function (params) {
        if (!params || !params.length) return ''
        let header = `<div class="font-bold border-b border-slate-700 pb-1 mb-1 text-[11px] text-slate-300">${params[0].name}</div>`
        let body = params.map(p => {
          const colorDot = `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:7px;height:7px;background-color:${p.color};"></span>`
          return `<div class="flex items-center justify-between gap-4 text-[11px]">
            <span>${colorDot} ${p.seriesName}:</span>
            <span class="font-bold text-white">${fmtCurr(p.value)}</span>
          </div>`
        }).join('')
        return header + body
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        interval: dates.length > 20 ? 'auto' : 0
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        formatter: function (val) {
          if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`
          if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
          if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`
          return `₹${val}`
        }
      }
    },
    series: series
  }

  chartInstance.setOption(option, true)
}

function handleResize() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

watch(
  () => [props.points, props.loading],
  async () => {
    await nextTick()
    renderChart()
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => {
    renderChart()
    window.addEventListener('resize', handleResize)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>
