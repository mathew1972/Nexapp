<template>
  <div class="sf-card p-4">
    <div class="flex items-center justify-between mb-2">
      <div>
        <h3 class="text-sm font-bold text-gray-900">Pipeline by Stage</h3>
        <p class="text-[11px] text-gray-500">Distribution of active opportunity stages and weighted forecast</p>
      </div>
      <div class="text-right">
        <span class="text-xs font-bold text-gray-900">{{ fmtCurr(summary?.pipeline_value) }}</span>
        <div class="text-[10px] text-blue-600 font-semibold">{{ fmtCurr(summary?.weighted_pipeline) }} weighted</div>
      </div>
    </div>

    <div v-if="loading" class="h-48 bg-gray-50 animate-pulse rounded"></div>
    <div v-else-if="!stages || stages.length === 0" class="h-48 flex items-center justify-center text-xs text-gray-400">
      No active open deals in pipeline for this selection.
    </div>
    <div v-else class="space-y-4 pt-2">
      <!-- ECharts Horizontal Bar Chart -->
      <div ref="chartRef" class="w-full h-52"></div>

      <!-- Data Details Table -->
      <div class="border-t border-gray-100 pt-2 overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead>
            <tr class="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
              <th class="py-1">Stage</th>
              <th class="py-1 text-center">Deals</th>
              <th class="py-1 text-right">Value</th>
              <th class="py-1 text-right">Weighted</th>
              <th class="py-1 text-right">% Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr 
              v-for="s in stages" 
              :key="s.stage" 
              @click="openDealsByStage(s.stage, store.effectiveScopeParams)"
              class="hover:bg-blue-50/50 cursor-pointer transition-colors group"
            >
              <td class="py-1.5 font-semibold text-gray-800 group-hover:text-blue-600 flex items-center gap-1">
                <span>{{ s.stage }}</span>
                <svg class="w-3 h-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </td>
              <td class="py-1.5 text-center text-gray-600 font-medium">{{ s.deal_count }}</td>
              <td class="py-1.5 text-right font-bold text-gray-900">{{ fmtCurr(s.stage_value) }}</td>
              <td class="py-1.5 text-right font-semibold text-blue-600">{{ fmtCurr(s.weighted_value) }}</td>
              <td class="py-1.5 text-right text-gray-500 font-medium">{{ s.percentage_of_pipeline || getPct(s.stage_value) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { openDealsByStage } from '../../utils/crmDashboardNavigation'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'

const store = useCrmDashboardStore()

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  stages: { type: Array, default: () => [] },
  meta: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const chartRef = ref(null)
let chartInstance = null

function fmtCurr(v) {
  if (!v) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

function getPct(val) {
  const total = props.summary?.pipeline_value || 1
  return Math.round(((val || 0) / total) * 100)
}

function initChart() {
  if (!chartRef.value || !props.stages || props.stages.length === 0) return
  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)
  const categories = props.stages.map(s => s.stage).reverse()
  const values = props.stages.map(s => s.stage_value || 0).reverse()
  const weightedValues = props.stages.map(s => s.weighted_value || 0).reverse()

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const stageName = params[0]?.name
        const stageObj = props.stages.find(s => s.stage === stageName) || {}
        let res = `<div class="font-bold text-xs border-b border-gray-100 pb-1 mb-1 text-gray-900">${stageName}</div>`
        res += `<div class="text-[11px] space-y-0.5">`
        if (stageObj.deal_count !== undefined) {
          res += `<div class="flex justify-between gap-4"><span class="text-gray-500">Deals:</span><span class="font-bold text-gray-900">${stageObj.deal_count}</span></div>`
        }
        params.forEach(item => {
          res += `<div class="flex justify-between gap-4">
            <span style="color:${item.color}" class="font-medium">● ${item.seriesName}:</span>
            <span class="font-bold text-gray-900">${fmtCurr(item.value)}</span>
          </div>`
        })
        if (stageObj.avg_age_days !== undefined && stageObj.avg_age_days !== null) {
          res += `<div class="flex justify-between gap-4 pt-1 border-t border-gray-100"><span class="text-gray-500">Avg Age:</span><span class="font-semibold text-gray-700">${stageObj.avg_age_days} days</span></div>`
        }
        res += `</div>`
        return res
      }
    },
    grid: { top: '10%', left: '3%', right: '8%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 10,
        formatter: (v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${v}`
      },
      splitLine: { lineStyle: { color: '#f3f4f6' } }
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLabel: { fontSize: 11, fontWeight: 'bold', color: '#374151' }
    },
    series: [
      {
        name: 'Gross Value',
        type: 'bar',
        data: values,
        itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] },
        barWidth: '40%'
      },
      {
        name: 'Weighted Value',
        type: 'bar',
        data: weightedValues,
        itemStyle: { color: '#93c5fd', borderRadius: [0, 4, 4, 0] },
        barWidth: '40%'
      }
    ]
  }

  chartInstance.setOption(option)
}

watch(() => props.stages, () => nextTick(() => initChart()), { deep: true })
onMounted(() => nextTick(() => initChart()))
onBeforeUnmount(() => { if (chartInstance) chartInstance.dispose() })
</script>
