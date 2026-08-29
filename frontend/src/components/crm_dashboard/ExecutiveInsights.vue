<template>
  <div class="space-y-4">
    <!-- Header / Banner -->
    <div class="sf-card p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-lg shadow-sm border border-slate-800 flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold flex items-center gap-2">
          <span>Executive Business Intelligence & Diagnostic Insights</span>
        </h3>
        <p class="text-xs text-slate-300 mt-0.5">
          Deterministic synthesis of observed sales performance, operational friction, and management attention
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold bg-indigo-500/20 text-indigo-200 px-2.5 py-1 rounded border border-indigo-400/30">
          Fact-Based Observed Synthesis • Non-Predictive
        </span>
      </div>
    </div>

    <!-- SECTION 1: EXECUTIVE SIGNALS MATRIX (Raw measured counts without unverified threshold labels) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- 1. Pipeline Health Signal -->
      <div class="sf-card p-3.5 space-y-1 bg-white border border-gray-200 rounded-lg">
        <div class="flex items-center justify-between text-[11px] font-medium text-gray-500">
          <span>Pipeline Stagnant Deals</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
            Measured Count
          </span>
        </div>
        <div class="text-lg font-bold text-gray-900">
          {{ formatCount(stagnantDealsCount) }} <span class="text-xs font-normal text-gray-500">of {{ formatCount(activeDealsCount) }} deals</span>
        </div>
        <p class="text-[10px] text-gray-500">
          Open deals dwelling &gt;30 days in stage ({{ fmtPct(stagnantRatio) }})
        </p>
      </div>

      <!-- 2. Execution Risk Exposure -->
      <div class="sf-card p-3.5 space-y-1 bg-white border border-gray-200 rounded-lg">
        <div class="flex items-center justify-between text-[11px] font-medium text-gray-500">
          <span>High Risk Score Exposure</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" :class="highRiskDealsCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'">
            {{ formatCount(highRiskDealsCount) }} Deals
          </span>
        </div>
        <div class="text-lg font-bold text-gray-900">
          {{ fmtCurr(highRiskValueExposure) }}
        </div>
        <p class="text-[10px] text-gray-500">
          Value exposure of deals with risk matrix score &ge; 60
        </p>
      </div>

      <!-- 3. Target Attainment Shortfall -->
      <div class="sf-card p-3.5 space-y-1 bg-white border border-gray-200 rounded-lg">
        <div class="flex items-center justify-between text-[11px] font-medium text-gray-500">
          <span>Target Shortfall Amount</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
            {{ fmtPct(targetAchievementPct) }} Attained
          </span>
        </div>
        <div class="text-lg font-bold text-gray-900">
          {{ fmtCurr(targetShortfall) }}
        </div>
        <p class="text-[10px] text-gray-500">
          Measured gap between actual closed sales and period target
        </p>
      </div>

      <!-- 4. Lead Qualification Bottleneck -->
      <div class="sf-card p-3.5 space-y-1 bg-white border border-gray-200 rounded-lg">
        <div class="flex items-center justify-between text-[11px] font-medium text-gray-500">
          <span>Stale Unconverted Leads</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
            Measured Count
          </span>
        </div>
        <div class="text-lg font-bold text-gray-900">
          {{ formatCount(unconvertedStaleCount) }} <span class="text-xs font-normal text-gray-500">Stale Leads</span>
        </div>
        <p class="text-[10px] text-gray-500">
          Open leads exceeding qualification dwell threshold (&gt;30d)
        </p>
      </div>
    </div>

    <!-- SECTION 2: SYNTHESIZED EXECUTIVE DIAGNOSTICS & MANAGEMENT ATTENTION -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Left 2 Columns: Measured Business Insights -->
      <div class="lg:col-span-2 space-y-3">
        <div class="sf-card p-4 space-y-3 bg-white border border-gray-200 rounded-lg">
          <div class="flex items-center justify-between border-b border-gray-100 pb-2">
            <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Observed Operational & Execution Patterns</span>
            </h4>
            <span class="text-[10px] text-gray-400 font-medium">Traceable to live CRM metrics</span>
          </div>

          <div class="space-y-2.5">
            <!-- Item 1: Stage Friction & Bottleneck Pattern -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1">
              <div class="flex items-center justify-between font-bold text-slate-800">
                <span>1. Process Bottleneck: {{ highestFrictionStage }}</span>
                <span class="text-[10px] text-slate-600 bg-slate-200 px-2 py-0.5 rounded">Highest Stage Dwell</span>
              </div>
              <p class="text-slate-600 text-[11px]">
                <strong class="text-slate-700">Observation:</strong> {{ highestFrictionStage }} exhibits the longest stage dwell duration in active pipeline.
              </p>
              <p class="text-slate-600 text-[11px]">
                <strong class="text-slate-700">Evidence:</strong> Measured average dwell of <span class="font-semibold text-slate-900">{{ maxDwellDays ? `${maxDwellDays} days` : 'Not measured' }}</span> before stage transition.
              </p>
              <div class="pt-1 text-[11px] text-slate-800 font-medium flex items-center gap-1">
                <span>Management Attention:</span>
                <span>Review opportunities currently experiencing prolonged stage dwell in {{ highestFrictionStage }}.</span>
              </div>
            </div>

            <!-- Item 2: Outcome Loss Behaviors Pattern -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1">
              <div class="flex items-center justify-between font-bold text-slate-800">
                <span>2. Outcome Association: Won vs Lost Pre-Close Behavior</span>
                <span class="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">Historical Association</span>
              </div>
              <p class="text-slate-600 text-[11px]">
                <strong class="text-slate-700">Observation:</strong> Closed Lost deals demonstrate distinct execution slippage compared to Won deals.
              </p>
              <p class="text-slate-600 text-[11px]">
                <strong class="text-slate-700">Evidence:</strong> Lost deals exhibit <span class="font-semibold text-slate-900">{{ fmtPct(lostSlippagePct) }}</span> close-date push rate vs <span class="font-semibold text-slate-900">{{ fmtPct(wonSlippagePct) }}</span> in Won deals.
              </p>
              <div class="pt-1 text-[11px] text-slate-800 font-medium flex items-center gap-1">
                <span>Management Attention:</span>
                <span>Review opportunities with repeated close-date movement.</span>
              </div>
            </div>

            <!-- Item 3: Account Concentration Risk Pattern -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1">
              <div class="flex items-center justify-between font-bold text-slate-800">
                <span>3. Account Concentration & Revenue Exposure</span>
                <span class="text-[10px] text-slate-600 bg-slate-200 px-2 py-0.5 rounded">Portfolio Balance</span>
              </div>
              <p class="text-slate-600 text-[11px]">
                <strong class="text-slate-700">Observation:</strong> Revenue concentration across key customer accounts.
              </p>
              <p class="text-slate-600 text-[11px]">
                <strong class="text-slate-700">Evidence:</strong> Top organization (<span class="font-semibold text-slate-900">{{ topOrgName }}</span>) accounts for <span class="font-semibold text-slate-900">{{ fmtCurr(topOrgWonRevenue) }}</span> in closed won revenue and <span class="font-semibold text-slate-900">{{ fmtCurr(topOrgOpenPipeline) }}</span> in open pipeline.
              </p>
              <div class="pt-1 text-[11px] text-slate-800 font-medium flex items-center gap-1">
                <span>Management Attention:</span>
                <span>Review concentration of revenue exposure across key accounts.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right 1 Column: Key Executive Priorities Checklist -->
      <div class="space-y-4">
        <div class="sf-card p-4 space-y-3 bg-white border border-gray-200 rounded-lg">
          <div class="border-b border-gray-100 pb-2">
            <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Management Attention Items
            </h4>
            <p class="text-[10px] text-gray-400">Actionable priority list derived from measured facts</p>
          </div>

          <div class="space-y-2 text-xs">
            <!-- Priority 1 -->
            <div class="p-2.5 rounded border border-gray-200 bg-slate-50 space-y-1">
              <div class="flex items-center justify-between font-bold text-slate-900">
                <span>Stale Deals Needing Review</span>
                <span class="px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 font-extrabold text-[10px]">{{ formatCount(staleDealsCount) }} Deals</span>
              </div>
              <p class="text-[11px] text-slate-600">
                Active opportunities with zero recorded activity for over 30 days.
              </p>
            </div>

            <!-- Priority 2 -->
            <div class="p-2.5 rounded border border-gray-200 bg-slate-50 space-y-1">
              <div class="flex items-center justify-between font-bold text-slate-900">
                <span>Repeat Slippage Deals</span>
                <span class="px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 font-extrabold text-[10px]">{{ formatCount(repeatSlippageCount) }} Deals</span>
              </div>
              <p class="text-[11px] text-slate-600">
                Opportunities where close date has been pushed &ge; 2 times.
              </p>
            </div>

            <!-- Priority 3 -->
            <div class="p-2.5 rounded border border-gray-200 bg-slate-50 space-y-1">
              <div class="flex items-center justify-between font-bold text-slate-900">
                <span>Rep Target Variance</span>
                <span class="px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 font-extrabold text-[10px]">{{ formatCount(targetRisksCount) }} Reps</span>
              </div>
              <p class="text-[11px] text-slate-600">
                Sales representatives currently tracking behind monthly allocation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'

const store = useCrmDashboardStore()

// Access existing Pinia state safely
const velocityData = computed(() => store.dealVelocitySlippageCommandCenter?.summary || {})
const targetData = computed(() => store.salesTargetPerformance?.summary || {})
const unconvertedData = computed(() => store.unconvertedLeadAnalytics?.summary || {})
const bottleneckData = computed(() => store.stageTransitionBottleneckAnalytics || {})
const lossOutcomeData = computed(() => store.lossOutcomeCorrelationAnalytics || {})
const orgData = computed(() => store.organizationAnalytics?.organizations || [])
const repRiskData = computed(() => store.salesTargetRepPerformance?.reps || [])

// Derived Facts & Metrics
const activeDealsCount = computed(() => velocityData.value?.total_active_deals ?? null)
const stagnantDealsCount = computed(() => velocityData.value?.stagnant_deals ?? null)
const stagnantRatio = computed(() => {
  if (
    activeDealsCount.value === null ||
    activeDealsCount.value === undefined ||
    activeDealsCount.value === 0
  ) {
    return null
  }
  const stagnant = stagnantDealsCount.value ?? 0
  return (stagnant / activeDealsCount.value) * 100
})

const highRiskDealsCount = computed(() => velocityData.value?.high_risk_deals ?? null)
const highRiskValueExposure = computed(() => velocityData.value?.high_risk_value_exposure ?? null)

const targetAchievementPct = computed(() => targetData.value?.achievement_pct ?? null)
const targetShortfall = computed(() => targetData.value?.shortfall_amount ?? null)

const unconvertedStaleCount = computed(() => unconvertedData.value?.stale_leads ?? null)
const staleDealsCount = computed(() => velocityData.value?.stale_deals ?? null)
const repeatSlippageCount = computed(() => velocityData.value?.repeat_slippage_deals ?? null)

const highestFrictionStage = computed(() => {
  const path = bottleneckData.value?.summary?.highest_dwell_path
  if (path) return `${path.from_stage} → ${path.to_stage}`
  return bottleneckData.value?.summary?.highest_dwell_stage || 'Not measured'
})

const maxDwellDays = computed(() => {
  const days = bottleneckData.value?.summary?.highest_dwell_days
  if (days === null || days === undefined) return null
  return Number(days).toFixed(1)
})

const lostSlippagePct = computed(() => {
  return lossOutcomeData.value?.correlations?.close_date_push?.lost?.affected_percentage ?? null
})

const wonSlippagePct = computed(() => {
  return lossOutcomeData.value?.correlations?.close_date_push?.won?.affected_percentage ?? null
})

const topOrgName = computed(() => {
  if (orgData.value.length > 0) return orgData.value[0].org_name || orgData.value[0].organization || 'Not measured'
  return 'Not measured'
})

const topOrgWonRevenue = computed(() => {
  if (orgData.value.length > 0) return orgData.value[0].won_revenue ?? null
  return null
})

const topOrgOpenPipeline = computed(() => {
  if (orgData.value.length > 0) return orgData.value[0].open_pipeline ?? null
  return null
})

const targetRisksCount = computed(() => {
  return repRiskData.value.filter(r => r.shortfall > 0).length
})

function formatCount(val) {
  if (val === null || val === undefined) return 'Not measured'
  return String(val)
}

function fmtPct(val) {
  if (val === null || val === undefined) return 'Not measured'
  return `${Number(val).toFixed(1)}%`
}

function fmtCurr(val) {
  if (val === null || val === undefined) return 'Not measured'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val)
}
</script>
