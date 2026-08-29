<template>
  <div class="sf-card p-4">
    <div class="flex items-center justify-between mb-2">
      <div>
        <h3 class="text-sm font-bold text-gray-900">Forecast vs Target Calibration</h3>
        <p class="text-[11px] text-gray-500">Pipeline probability confidence and weighted forecast attainment</p>
      </div>
      <span class="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
        Risk Gap: {{ fmtCurr(summary?.forecast_risk_gap) }}
      </span>
    </div>

    <div v-if="loading" class="h-40 bg-gray-50 animate-pulse rounded"></div>
    <template v-else>
      <!-- ECharts Forecast Gauge Chart -->
      <div ref="chartRef" class="w-full h-44"></div>

      <!-- Probability Confidence Summary Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-center">
        <div class="p-1.5 rounded bg-gray-50">
          <div class="text-[10px] text-gray-500 font-semibold">Gross Open</div>
          <div class="text-xs font-bold text-gray-800">{{ fmtCurr(summary?.gross_open_value) }}</div>
        </div>
        <div class="p-1.5 rounded bg-green-50">
          <div class="text-[10px] text-green-700 font-semibold">Weighted Forecast</div>
          <div class="text-xs font-bold text-green-800">{{ fmtCurr(summary?.weighted_forecast_value) }}</div>
        </div>
        <div class="p-1.5 rounded bg-amber-50">
          <div class="text-[10px] text-amber-700 font-semibold">Forecast Risk Gap</div>
          <div class="text-xs font-bold text-amber-800">{{ fmtCurr(summary?.forecast_risk_gap) }}</div>
        </div>
        <div class="p-1.5 rounded bg-blue-50">
          <div class="text-[10px] text-blue-700 font-semibold">High Commit (>50%)</div>
          <div class="text-xs font-bold text-blue-800">{{ fmtCurr(summary?.high_commit_value) }}</div>
        </div>
      </div>

      <!-- Probability Confidence Tier Visual Distribution -->
      <div v-if="probabilityTiers && probabilityTiers.length > 0" class="pt-3 border-t border-gray-100 space-y-2">
        <div class="text-[10px] font-black text-gray-500 uppercase tracking-wider">Pipeline Confidence Breakdown</div>
        <div v-for="tier in sortedTiers" :key="tier.tier_label" class="flex items-center gap-3 text-xs">
          <div class="w-24 text-[11px] font-bold text-gray-700 truncate">{{ tier.tier_label }}</div>
          <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="getTierBarColor(tier.tier_label)"
              :style="{ width: `${getTierPct(tier.gross_value)}%` }"
            ></div>
          </div>
          <div class="w-16 text-right font-extrabold text-gray-900 text-[11px]">{{ fmtCurr(tier.gross_value) }}</div>
          <div class="w-14 text-right font-bold text-blue-600 text-[10px]">{{ fmtCurr(tier.weighted_value) }}</div>
          <div class="w-10 text-right text-[10px] font-bold text-gray-500">{{ tier.deal_count }}d</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  probabilityTiers: { type: Array, default: () => [] },
  calibrationRisks: { type: Array, default: () => [] },
  meta: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const chartRef = ref(null)
let chartInstance = null

function fmtCurr(v) {
  if (!v && v !== 0) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

function initChart() {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)
  const gross = props.summary?.gross_open_value || 0
  const weighted = props.summary?.weighted_forecast_value || 0
  
  // Safe calculation rule: avoid divide-by-zero or negative invalid percentages
  let pct = 0
  if (gross > 0) {
    pct = Math.min(100, Math.max(0, Math.round((weighted / gross) * 100)))
  }

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '75%'],
        radius: '110%',
        min: 0,
        max: 100,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.3, '#ef4444'],
              [0.7, '#f59e0b'],
              [1, '#22c55e']
            ]
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '60%',
          width: 8,
          offsetCenter: [0, '-50%'],
          itemStyle: { color: '#1e293b' }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          formatter: gross > 0 ? '{value}%' : '—',
          color: '#0f172a',
          fontSize: 18,
          fontWeight: 'bold',
          offsetCenter: [0, '-15%']
        },
        data: [{ value: pct, name: 'Forecast Confidence' }]
      }
    ]
  }

  chartInstance.setOption(option)
}

watch(() => props.summary, () => nextTick(() => initChart()), { deep: true })
onMounted(() => nextTick(() => initChart()))
onBeforeUnmount(() => { if (chartInstance) chartInstance.dispose() })

const sortedTiers = computed(() => {
  return [...(props.probabilityTiers || [])].sort((a, b) => (b.gross_value || 0) - (a.gross_value || 0))
})

function getTierPct(val) {
  const maxVal = Math.max(...(props.probabilityTiers || []).map(t => t.gross_value || 0), 1)
  return Math.min(100, Math.max(3, ((val || 0) / maxVal) * 100))
}

function getTierBarColor(label) {
  const l = (label || '').toLowerCase()
  if (l.includes('high') || l.includes('>7') || l.includes('>6')) return 'bg-emerald-500'
  if (l.includes('medium') || l.includes('4') || l.includes('5')) return 'bg-amber-400'
  return 'bg-red-400'
}
</script>
