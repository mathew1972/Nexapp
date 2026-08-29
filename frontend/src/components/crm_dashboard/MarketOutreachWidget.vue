<template>
  <div class="sf-card p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between h-full">
    <div>
      <!-- Card Header with Toggle Switch (Pipeline ₹L | Win % | Leads) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none">
          MARKET OUTREACH — INDUSTRY × REGION
        </span>

        <!-- Metric Selector Toggle Pill -->
        <div class="inline-flex items-center p-0.5 bg-slate-100/80 border border-slate-200/60 rounded-xl self-start sm:self-auto text-xs">
          <button
            @click="activeMetric = 'pipeline'"
            :class="activeMetric === 'pipeline' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 font-medium hover:text-slate-800'"
            class="px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px]"
          >
            Pipeline ₹L
          </button>
          <button
            @click="activeMetric = 'win_rate'"
            :class="activeMetric === 'win_rate' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 font-medium hover:text-slate-800'"
            class="px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px]"
          >
            Win %
          </button>
          <button
            @click="activeMetric = 'leads'"
            :class="activeMetric === 'leads' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 font-medium hover:text-slate-800'"
            class="px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px]"
          >
            Leads
          </button>
        </div>
      </div>

      <!-- Matrix Heatmap Table Grid -->
      <div class="overflow-x-auto">
        <table class="w-full text-xs border-separate border-spacing-1.5">
          <thead>
            <tr class="text-[10px] uppercase font-black text-slate-400">
              <th class="text-left font-bold pb-1.5"></th>
              <th class="text-center font-bold pb-1.5 w-16">NORTH</th>
              <th class="text-center font-bold pb-1.5 w-16">WEST</th>
              <th class="text-center font-bold pb-1.5 w-16">SOUTH</th>
              <th class="text-center font-bold pb-1.5 w-16">EAST</th>
              <th class="text-center font-bold pb-1.5 w-14">SCORE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in matrixData" :key="row.industry">
              <!-- Industry Label -->
              <td class="font-bold text-slate-900 text-xs py-1 pr-2 truncate">
                {{ row.industry }}
              </td>

              <!-- North Cell -->
              <td 
                class="text-center py-2.5 rounded-lg font-bold transition-all"
                :class="getCellBgClass(row.cells.north)"
              >
                {{ formatCellValue(row.cells.north) }}
              </td>

              <!-- West Cell -->
              <td 
                class="text-center py-2.5 rounded-lg font-bold transition-all"
                :class="getCellBgClass(row.cells.west)"
              >
                {{ formatCellValue(row.cells.west) }}
              </td>

              <!-- South Cell -->
              <td 
                class="text-center py-2.5 rounded-lg font-bold transition-all"
                :class="getCellBgClass(row.cells.south)"
              >
                {{ formatCellValue(row.cells.south) }}
              </td>

              <!-- East Cell -->
              <td 
                class="text-center py-2.5 rounded-lg font-bold transition-all"
                :class="getCellBgClass(row.cells.east)"
              >
                {{ formatCellValue(row.cells.east) }}
              </td>

              <!-- Score Badge Cell -->
              <td class="text-center py-1">
                <span 
                  class="inline-block w-full py-1.5 rounded-lg font-extrabold text-xs"
                  :class="getScoreBadgeClass(row.score)"
                >
                  {{ row.score }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Key Outreach Summary Badges -->
      <div class="mt-4 pt-3 border-t border-slate-100 space-y-2">
        <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <!-- Outreach Score -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Market outreach score: <strong class="font-black text-slate-900">{{ props.industryData?.summary?.outreach_score || 0 }} / 100</strong></span>
          </div>

          <!-- Active Segments -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="text-slate-700">{{ props.industryData?.summary?.active_segments || 0 }} active segment(s)</span>
          </div>
        </div>

        <!-- Strategy Insights Footers -->
        <div class="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs leading-relaxed">
          <div v-if="props.industryData?.summary?.hot_segment" class="text-slate-700">
            🔥 <strong class="font-bold text-slate-900">Hot:</strong> {{ props.industryData.summary.hot_segment }}
          </div>
          <div v-else class="text-slate-400 italic text-[11px]">
            No industry outreach hotspots detected for selected active scope.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  industryData: {
    type: Object,
    default: () => null
  }
})

const activeMetric = ref('leads') // 'pipeline', 'win_rate', 'leads'

const matrixData = computed(() => {
  const industries = props.industryData?.by_industry || []
  if (industries.length > 0) {
    return industries.map(ind => {
      const cells = { north: null, west: null, south: null, east: null }
      const regions = ind.regions || {}
      Object.keys(regions).forEach(reg => {
        const lower = reg.toLowerCase()
        if (cells.hasOwnProperty(lower)) {
          if (activeMetric.value === 'pipeline') cells[lower] = Math.round(regions[reg].pipeline_value / 100000)
          else if (activeMetric.value === 'win_rate') cells[lower] = `${Math.round(regions[reg].win_rate)}%`
          else cells[lower] = regions[reg].lead_count
        }
      })
      return {
        industry: ind.industry_name || 'General',
        cells,
        score: ind.outreach_score || 0
      }
    })
  }

  // Zero-state empty industry matrix
  const emptyIndustries = ['Manufacturing', 'BFSI', 'IT / ITES', 'Pharma', 'Logistics']
  return emptyIndustries.map(ind => ({
    industry: ind,
    cells: { north: 0, west: 0, south: 0, east: 0 },
    score: 0
  }))
})

function formatCellValue(val) {
  if (val === null || val === undefined) return '—'
  return val
}

function getCellBgClass(val) {
  if (val === null || val === undefined) {
    return 'bg-slate-50 text-slate-300 border border-dashed border-slate-200'
  }
  
  if (activeMetric.value === 'leads') {
    if (val >= 20) return 'bg-indigo-700 text-white shadow-xs'
    if (val >= 10) return 'bg-indigo-300 text-slate-900'
    if (val >= 5) return 'bg-indigo-200 text-slate-800'
    return 'bg-indigo-100/60 text-slate-700'
  }

  if (activeMetric.value === 'pipeline') {
    if (val >= 60) return 'bg-[#1D4ED8] text-white shadow-xs'
    if (val >= 35) return 'bg-blue-300 text-slate-900'
    if (val >= 20) return 'bg-blue-200 text-slate-800'
    return 'bg-blue-100/60 text-slate-700'
  }

  // Win %
  const num = parseInt(val)
  if (num >= 30) return 'bg-emerald-600 text-white'
  if (num >= 20) return 'bg-emerald-200 text-slate-900'
  if (num >= 10) return 'bg-amber-100 text-amber-900'
  return 'bg-rose-100 text-rose-800'
}

function getScoreBadgeClass(score) {
  if (score >= 75) return 'bg-emerald-100 text-emerald-800'
  if (score >= 55) return 'bg-amber-100 text-amber-800'
  return 'bg-rose-100 text-rose-800'
}
</script>
