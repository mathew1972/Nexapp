<template>
  <div class="space-y-4">
    <!-- Top Executive Revenue & Target Performance Hero Block -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
      <!-- LEVEL 1: Target Attainment Hero Anchor (5 Columns) -->
      <div class="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-800 flex flex-col justify-between relative overflow-hidden">
        <div class="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div>
          <div class="flex items-center justify-between mb-2.5">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-xs font-bold text-slate-300 tracking-wider uppercase">Target Attainment</span>
            </div>
            <span v-if="loadingTarget" class="w-12 h-4 bg-slate-700 animate-pulse rounded"></span>
            <span v-else-if="targetSummary" class="text-xs font-black px-2.5 py-0.5 rounded-full border shadow-2xs" :class="targetBadgeClass">
              {{ targetSummary.achievement_percent?.toFixed(1) }}%
            </span>
          </div>

          <div v-if="loadingTarget" class="w-32 h-10 bg-slate-700 animate-pulse rounded my-2"></div>
          <div v-else-if="targetSummary" class="my-1">
            <div class="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
              {{ fmtCurr(targetSummary.achieved_value) }}
            </div>
            <div class="text-xs text-slate-400 font-medium mt-1.5">
              Achieved of <strong class="text-slate-200 font-bold">{{ fmtCurr(targetSummary.target_value) }}</strong> Goal
            </div>
          </div>
          <div v-else class="text-xs text-slate-400 italic py-2">No target set for active scope</div>
        </div>

        <!-- Dominant Progress Visual & Metric Breakdown -->
        <div v-if="!loadingTarget && targetSummary" class="mt-3.5 space-y-2.5">
          <div class="w-full bg-slate-950/80 rounded-full h-2.5 p-0.5 border border-slate-700/60 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm"
              :style="{ width: `${Math.min(targetSummary.achievement_percent || 0, 100)}%` }"
            ></div>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-700/50">
            <div>
              <span class="text-slate-400 text-[11px] block font-medium">Remaining Gap</span>
              <span class="font-bold text-slate-100">{{ fmtCurr(targetSummary.remaining_value) }}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[11px] block font-medium">Weighted Pipeline</span>
              <span class="font-bold text-blue-400">{{ fmtCurr(targetSummary.weighted_pipeline) }}</span>
            </div>
          </div>

          <div class="flex justify-between items-center text-xs pt-2 border-t border-slate-700/50 font-bold">
            <span class="text-slate-400 font-medium">Forecast Deficit Gap</span>
            <span :class="forecastGapIsDeficit ? 'text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/60' : 'text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60'">
              {{ fmtCurr(targetSummary.forecast_gap) }}
            </span>
          </div>
        </div>

        <!-- Executive Root-Cause Synthesis Strip (Stage 2A & 2B Action Framework) -->
        <div v-if="!loadingRootCause && rootCauseSummary && rootCauseSummary.total_reps_evaluated > 0" class="mt-3 pt-2.5 border-t border-slate-700/60 text-xs">
          <div class="flex items-center justify-between text-[11px] mb-1.5 font-bold">
            <span class="text-slate-300 uppercase tracking-wider text-[10px]">Why Are We Short? (Root Cause)</span>
            <div class="flex items-center gap-1.5">
              <button
                v-if="rootCauseSummary.critical_reps > 0 || rootCauseSummary.at_risk_reps > 0"
                @click="emit('inspect-cause', 'targets')"
                class="px-2 py-0.5 rounded text-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-extrabold transition-colors flex items-center gap-1 group"
                title="Inspect at-risk representatives in Targets workspace"
              >
                <span>{{ (rootCauseSummary.critical_reps || 0) + (rootCauseSummary.at_risk_reps || 0) }} At Risk Reps</span>
                <span class="text-[9px] group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              @click="emit('inspect-cause', 'targets')"
              class="bg-slate-950/60 hover:bg-slate-900/80 p-1.5 sm:p-2 rounded-lg border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-colors text-left group"
              title="View pipeline coverage diagnostics in Targets workspace"
            >
              <span class="text-slate-400 group-hover:text-slate-200 font-medium">Pipeline Deficit</span>
              <span class="font-bold flex items-center gap-1" :class="rootCauseSummary.primary_cause_breakdown?.INSUFFICIENT_PIPELINE_VOLUME > 0 ? 'text-amber-300' : 'text-slate-200'">
                <span>{{ rootCauseSummary.primary_cause_breakdown?.INSUFFICIENT_PIPELINE_VOLUME || 0 }} reps</span>
                <span class="text-[9px] text-slate-500 group-hover:text-slate-300">→</span>
              </span>
            </button>
            <button
              @click="emit('inspect-cause', 'targets')"
              class="bg-slate-950/60 hover:bg-slate-900/80 p-1.5 sm:p-2 rounded-lg border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-colors text-left group"
              title="View stage bottlenecks in Targets workspace"
            >
              <span class="text-slate-400 group-hover:text-slate-200 font-medium">Low Stage Prob</span>
              <span class="font-bold flex items-center gap-1" :class="rootCauseSummary.primary_cause_breakdown?.LOW_STAGE_PROBABILITY > 0 ? 'text-red-300' : 'text-slate-200'">
                <span>{{ rootCauseSummary.primary_cause_breakdown?.LOW_STAGE_PROBABILITY || 0 }} reps</span>
                <span class="text-[9px] text-slate-500 group-hover:text-slate-300">→</span>
              </span>
            </button>
          </div>
        </div>

        <!-- Stage 2C: At-Risk Deal Radar Executive Summary Strip -->
        <div v-if="!loadingRadar && radarSummary && radarSummary.high_risk_deals > 0" class="mt-3 pt-2.5 border-t border-slate-700/60 text-xs">
          <div class="flex items-center justify-between text-[11px] mb-1.5 font-bold">
            <span class="text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
              <span>At-Risk Deal Radar</span>
            </span>
            <button
              @click="emit('inspect-cause', 'pipeline')"
              class="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-extrabold transition-colors flex items-center gap-1 group"
              title="Open full Deal Velocity & Slippage Command Center in Pipeline workspace"
            >
              <span>View Risk Radar</span>
              <span class="text-[9px] group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>

          <div class="p-2 sm:p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-[11px]">
            <div>
              <span class="font-bold text-red-400 block">{{ radarSummary.high_risk_deals }} High Risk Deals</span>
              <span class="text-slate-400 text-[10px] block font-medium">Exposed Value: <strong class="text-slate-200 font-bold">{{ fmtCurr(radarSummary.high_risk_value_exposure) }}</strong></span>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 block font-medium">Stage Stagnant (>30d)</span>
              <span class="font-bold text-amber-300 text-xs">{{ radarSummary.stagnant_deals || 0 }} deals</span>
            </div>
          </div>
        </div>
      </div>

      <!-- LEVEL 2: Commercial KPI Band Cards (7 Columns) -->
      <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ExecutiveKpiCard
          title="Total Pipeline Value"
          :value="kpis?.open_pipeline_value"
          formatter="currency"
          :subtitle="`${kpis?.open_deals_count || 0} active deals in pipeline`"
          :loading="loading"
          :comparison="comparisonMetrics?.active_pipeline"
          :comparison-label="comparisonLabel"
        />
        <ExecutiveKpiCard
          title="Closed Sales (Period)"
          :value="kpis?.won_revenue"
          formatter="currency"
          :subtitle="`${kpis?.won_deals_count || 0} won deals`"
          :loading="loading"
          :comparison="comparisonMetrics?.won_revenue"
          :comparison-label="comparisonLabel"
        />
        <ExecutiveKpiCard
          title="Win Rate"
          :value="kpis?.win_rate"
          formatter="percent"
          :subtitle="`${kpis?.closed_deals_count || 0} total closed deals`"
          :loading="loading"
          :comparison="comparisonMetrics?.win_rate"
          :comparison-label="comparisonLabel"
        />
        <ExecutiveKpiCard
          title="Average Deal Size"
          :value="kpis?.avg_deal_size"
          formatter="currency"
          subtitle="Based on closed won revenue"
          :loading="loading"
          :comparison="comparisonMetrics?.avg_deal_size"
          :comparison-label="comparisonLabel"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ExecutiveKpiCard from './ExecutiveKpiCard.vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'

const store = useCrmDashboardStore()

const emit = defineEmits(['inspect-cause'])

defineProps({
  kpis: { type: Object, default: () => ({}) },
  meta: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  comparisonMetrics: { type: Object, default: null },
  comparisonLabel: { type: String, default: '' }
})

const targetSummary = computed(() => store.salesTarget?.summary)
const loadingTarget = computed(() => store.loadingSalesTarget)

const rootCauseSummary = computed(() => store.salesTargetRootCause?.summary)
const loadingRootCause = computed(() => store.loadingSalesTargetRootCause)

const radarSummary = computed(() => store.dealVelocitySlippageCommandCenter?.summary)
const loadingRadar = computed(() => store.loadingDealVelocitySlippageCommandCenter)

const targetPct = computed(() => targetSummary.value?.achievement_percent || 0)

const targetBorderClass = computed(() => {
  if (!targetSummary.value) return ''
  if (targetPct.value >= 80) return 'border-l-4 border-l-emerald-500'
  if (targetPct.value >= 40) return 'border-l-4 border-l-amber-500'
  return 'border-l-4 border-l-blue-500'
})

const targetBadgeClass = computed(() => {
  if (targetPct.value >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (targetPct.value >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
})

const targetProgressClass = computed(() => {
  if (targetPct.value >= 80) return 'bg-emerald-500'
  if (targetPct.value >= 40) return 'bg-amber-500'
  return 'bg-blue-500'
})

const forecastGapIsDeficit = computed(() => {
  const gap = targetSummary.value?.forecast_gap
  return gap !== null && gap !== undefined && Number(gap) > 0
})

function fmtCurr(v) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}
</script>
