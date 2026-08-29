<template>
  <div class="sf-card p-4">
    <div class="flex items-center justify-between mb-2">
      <div>
        <h3 class="text-sm font-bold text-gray-900">Closed Sales Performance</h3>
        <p class="text-[11px] text-gray-500">Period closed sales breakdown and win rate comparison</p>
      </div>
      <span class="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
        Win Rate: {{ hasClosedData ? `${summary?.closed_win_rate || 0}%` : '—' }}
      </span>
    </div>

    <div v-if="loading" class="h-48 bg-gray-50 animate-pulse rounded"></div>
    <template v-else-if="!hasClosedData">
      <div class="h-48 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg p-4 bg-gray-50/50">
        <svg class="w-8 h-8 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <p class="text-xs font-semibold text-gray-600">No closed sales in selected period</p>
        <p class="text-[11px] text-gray-400">Your open pipeline remains active, but no opportunities were closed yet.</p>
      </div>
    </template>
    <template v-else>
      <!-- ECharts Donut Chart -->
      <div ref="chartRef" class="w-full h-52"></div>

      <!-- Detail Metrics Bar -->
      <div class="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-center">
        <div 
          @click="openWonDeals(store.effectiveScopeParams)" 
          class="p-1.5 rounded bg-green-50 hover:bg-green-100/80 cursor-pointer transition-colors group"
        >
          <div class="text-[10px] text-green-700 font-semibold group-hover:underline">Won Revenue</div>
          <div class="text-xs font-bold text-green-800">{{ fmtCurr(summary?.won_revenue) }}</div>
        </div>
        <div 
          @click="openLostDeals(store.effectiveScopeParams)" 
          class="p-1.5 rounded bg-red-50 hover:bg-red-100/80 cursor-pointer transition-colors group"
        >
          <div class="text-[10px] text-red-700 font-semibold group-hover:underline">Lost Revenue</div>
          <div class="text-xs font-bold text-red-800">{{ fmtCurr(summary?.lost_value) }}</div>
        </div>
        <div 
          @click="openClosedDeals(store.effectiveScopeParams)" 
          class="p-1.5 rounded bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors group"
        >
          <div class="text-[10px] text-gray-500 font-semibold group-hover:underline">Total Deals</div>
          <div class="text-xs font-bold text-gray-800">{{ summary?.closed_deals || 0 }}</div>
        </div>
        <div class="p-1.5 rounded bg-blue-50">
          <div class="text-[10px] text-blue-700 font-semibold">Win Rate</div>
          <div class="text-xs font-bold text-blue-800">{{ summary?.closed_win_rate || 0 }}%</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { openWonDeals, openLostDeals, openClosedDeals } from '../../utils/crmDashboardNavigation'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'

const store = useCrmDashboardStore()

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  lostReasons: { type: Array, default: () => [] },
  meta: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const chartRef = ref(null)
let chartInstance = null

const hasClosedData = computed(() => {
  const won = props.summary?.won_revenue || 0
  const lost = props.summary?.lost_value || 0
  const count = props.summary?.closed_deals || 0
  return (won > 0 || lost > 0 || count > 0)
})

function fmtCurr(v) {
  if (!v && v !== 0) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

function initChart() {
  if (!chartRef.value || !hasClosedData.value) return
  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)
  const wonVal = props.summary?.won_revenue || 0
  const lostVal = props.summary?.lost_value || 0

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => `${params.name}: <b>${fmtCurr(params.value)}</b> (${params.percent}%)`
    },
    legend: {
      orient: 'horizontal',
      bottom: 'bottom',
      fontSize: 11
    },
    series: [
      {
        name: 'Closed Performance',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold'
          }
        },
        data: [
          { value: wonVal, name: 'Won Revenue', itemStyle: { color: '#22c55e' } },
          { value: lostVal, name: 'Lost Revenue', itemStyle: { color: '#ef4444' } }
        ]
      }
    ]
  }

  chartInstance.setOption(option)
}

watch(() => props.summary, () => nextTick(() => initChart()), { deep: true })
onMounted(() => nextTick(() => initChart()))
onBeforeUnmount(() => { if (chartInstance) chartInstance.dispose() })
</script>
