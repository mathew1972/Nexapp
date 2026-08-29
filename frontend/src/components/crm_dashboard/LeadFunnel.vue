<template>
  <div class="sf-card p-4">
    <div class="flex items-center justify-between mb-2">
      <div>
        <h3 class="text-sm font-black text-gray-900">Lead Conversion Funnel</h3>
        <p class="text-[11px] text-gray-500">Stage progression from lead intake to qualification</p>
      </div>
      <span class="text-xs font-bold px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
        {{ periodActivity?.cohort_conversion_rate || 0 }}% Conversion
      </span>
    </div>

    <div v-if="loading" class="h-48 bg-gray-50 animate-pulse rounded"></div>
    <div v-else-if="!funnel || funnel.length === 0" class="py-10 text-center border border-dashed border-gray-200 rounded-lg">
      <div class="text-sm font-bold text-gray-400 mb-1">No Funnel Data</div>
      <div class="text-xs text-gray-400">Lead funnel stages will appear here once leads are created.</div>
    </div>
    <div v-else class="space-y-3 pt-2">
      <!-- ECharts Visual Funnel -->
      <div ref="chartRef" class="w-full h-52"></div>

      <!-- Stage-by-Stage Conversion Table -->
      <div class="border-t border-gray-100 pt-2">
        <div class="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Stage Breakdown</div>
        <div class="space-y-1">
          <div v-for="(stage, idx) in funnel" :key="stage.stage" class="flex items-center gap-2 text-xs">
            <div class="w-24 text-[11px] font-bold text-gray-700 truncate">{{ stage.stage }}</div>
            <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="idx === biggestDropIdx ? 'bg-red-400' : 'bg-blue-500'"
                :style="{ width: `${getStagePct(stage.count)}%` }"
              ></div>
            </div>
            <div class="w-10 text-right font-extrabold text-gray-900 text-[11px]">{{ stage.count }}</div>
            <div class="w-14 text-right text-[10px] font-bold text-blue-600">{{ fmtCurr(stage.value) }}</div>
            <!-- Drop indicator for conversion loss -->
            <div v-if="idx > 0" class="w-12 text-right text-[10px] font-bold" :class="idx === biggestDropIdx ? 'text-red-600' : 'text-gray-400'">
              -{{ getDropPct(idx) }}%
            </div>
            <div v-else class="w-12"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  funnel: { type: Array, default: () => [] },
  periodActivity: { type: Object, default: () => ({}) },
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

function getStagePct(count) {
  const maxCount = Math.max(...(props.funnel || []).map(f => f.count || 0), 1)
  return Math.min(100, Math.max(3, (count / maxCount) * 100))
}

function getDropPct(idx) {
  if (idx <= 0 || !props.funnel || idx >= props.funnel.length) return 0
  const prev = props.funnel[idx - 1]?.count || 0
  const curr = props.funnel[idx]?.count || 0
  if (prev === 0) return 0
  return Math.round(((prev - curr) / prev) * 100)
}

const biggestDropIdx = computed(() => {
  if (!props.funnel || props.funnel.length < 2) return -1
  let maxDrop = 0
  let maxIdx = -1
  for (let i = 1; i < props.funnel.length; i++) {
    const prev = props.funnel[i - 1]?.count || 0
    const curr = props.funnel[i]?.count || 0
    if (prev === 0) continue
    const drop = (prev - curr) / prev
    if (drop > maxDrop) {
      maxDrop = drop
      maxIdx = i
    }
  }
  return maxIdx
})

function initChart() {
  if (!chartRef.value || !props.funnel || props.funnel.length === 0) return
  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)
  const data = props.funnel.map(item => ({
    name: item.stage,
    value: item.count,
    amount: item.value
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        return `<div class="font-bold text-xs border-b border-gray-100 pb-1 mb-1 text-gray-900">${params.name} Stage</div>
        <div class="text-[11px] space-y-0.5">
          <div class="flex justify-between gap-4"><span class="text-gray-500">Lead Volume:</span><span class="font-bold text-gray-900">${params.value} leads</span></div>
          <div class="flex justify-between gap-4"><span class="text-gray-500">Pipeline Value:</span><span class="font-bold text-blue-600">${fmtCurr(params.data.amount)}</span></div>
        </div>`
      }
    },
    series: [
      {
        name: 'Funnel',
        type: 'funnel',
        left: '10%',
        top: 10,
        bottom: 10,
        width: '80%',
        min: 0,
        max: Math.max(...props.funnel.map(f => f.count), 1),
        minSize: '15%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}: {c} leads',
          fontSize: 11,
          fontWeight: 'bold',
          color: '#ffffff'
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1
        },
        emphasis: {
          label: {
            fontSize: 12
          }
        },
        data: data
      }
    ]
  }

  chartInstance.setOption(option)
}

watch(() => props.funnel, () => nextTick(() => initChart()), { deep: true })
onMounted(() => nextTick(() => initChart()))
onBeforeUnmount(() => { if (chartInstance) chartInstance.dispose() })
</script>
