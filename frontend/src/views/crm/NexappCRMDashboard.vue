<template>
  <div class="min-h-screen bg-gray-100 text-gray-900 font-sans antialiased pb-12">
    <!-- Salesforce Lightning Top Navigation Header -->
    <DashboardHeader />

    <!-- Main Application Body -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-4">
      
      <!-- Sub-header / Tab Bar Navigation (Modern Segmented Pill Bar) -->
      <div class="bg-white/80 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-xs p-1.5 flex items-center justify-between gap-3 overflow-x-auto">
        <!-- Navigation Tabs (Modern Segmented Pill Controls) -->
        <nav class="flex items-center space-x-1 min-w-max" aria-label="Workspaces">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 focus:outline-none whitespace-nowrap select-none"
            :class="[
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
            ]"
          >
            <!-- Dynamic SVG Icons for Tabs -->
            <svg v-if="tab.id === 'executive_workspace'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
            <svg v-else-if="tab.id === 'pipeline'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            <svg v-else-if="tab.id === 'targets'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <svg v-else-if="tab.id === 'accounts'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0V8a2 2 0 012-2h2a2 2 0 012 2v3m-4 0h4" /></svg>
            <svg v-else-if="tab.id === 'leads_activities'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>

            <span>{{ tab.label }}</span>

            <!-- Badge -->
            <span
              v-if="tab.badge !== undefined"
              class="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none"
              :class="activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'"
            >
              {{ tab.badge }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Scope Loading / Error Banner -->
      <div v-if="store.loadingScope" class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-center gap-2">
        <svg class="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <span>Validating permissions and retrieving effective scope data...</span>
      </div>

      <div v-if="store.scopeError" class="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-medium">
        {{ store.scopeError }}
      </div>



      <!-- TAB 1: EXECUTIVE WORKSPACE -->
      <div v-if="activeTab === 'executive_workspace'">
        <ExperimentalExecutiveWorkspace
          :kpis="kpiData?.kpis"
          :loading-kpis="loadingKpis"
          :sources-data="sourcesData"
          :loading-sources="loadingSources"
          :sales-velocity-summary="salesVelocityData?.summary"
          :pipeline-data="pipelineData"
          :loading-pipeline="loadingPipeline"
          :closed-sales-data="closedSalesData"
          :opportunities-data="opportunitiesData"
          @select-tab="(tabId) => activeTab = tabId"
        />
      </div>

      <!-- TAB 2: PIPELINE (Structured Decision-First Command Center) -->
      <div v-else-if="activeTab === 'pipeline'" class="space-y-4">
        <!-- 1. PIPELINE POSITION & SUMMARY (Executive Slate Strip) -->
        <div class="sf-card p-3 border-l-4 border-l-blue-600 flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <div class="text-xs font-black text-gray-900 uppercase tracking-wider">Pipeline Position</div>
            <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {{ fmtMetric(store.dealVelocitySlippageCommandCenter?.summary?.total_active_deals) }} Active Deals
            </span>
          </div>

          <div class="flex items-center gap-6 text-xs">
            <div>
              <span class="text-[10px] text-gray-400 font-bold uppercase block">Pipeline Value</span>
              <span class="text-sm font-black text-gray-900">{{ fmtCurr(pipelineData?.summary?.pipeline_value) }}</span>
            </div>
            <div>
              <span class="text-[10px] text-amber-600 font-bold uppercase block">High Risk</span>
              <span class="text-sm font-black text-amber-700">{{ fmtCurr(store.dealVelocitySlippageCommandCenter?.summary?.high_risk_value_exposure) }}</span>
            </div>
            <div>
              <span class="text-[10px] text-gray-400 font-bold uppercase block">Stagnant</span>
              <span class="text-sm font-black text-gray-800">{{ fmtMetric(store.dealVelocitySlippageCommandCenter?.summary?.stagnant_deals) }}</span>
            </div>
            <div>
              <span class="text-[10px] text-gray-400 font-bold uppercase block">Slipping</span>
              <span class="text-sm font-black text-gray-800">{{ fmtMetric(store.dealVelocitySlippageCommandCenter?.summary?.repeat_slippage_deals) }}</span>
            </div>
          </div>
        </div>

        <!-- 2. PIPELINE DISTRIBUTION & PROBABILITY CALIBRATION (DOMINANT VISUAL ENGINE) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2">
            <PipelineHealth
              :summary="pipelineData?.summary"
              :stages="pipelineData?.stages"
              :meta="pipelineData?.meta"
              :loading="loadingPipeline"
            />
          </div>
          <div>
            <PipelineProbabilityAnalytics
              :summary="pipelineProbData?.summary"
              :probability-tiers="pipelineProbData?.probability_tiers"
              :calibration-risks="pipelineProbData?.calibration_risks"
              :meta="pipelineProbData?.meta"
              :loading="loadingPipelineProb"
            />
          </div>
        </div>

        <!-- 3. TOP OPPORTUNITIES & ACTION QUEUE -->
        <TopOpportunitiesWidget
          :opportunities-data="opportunitiesData"
          :loading="loadingOpportunities"
        />

        <!-- 4. EXECUTION DIAGNOSTICS & VELOCITY -->
        <details open class="sf-card border border-gray-200 rounded-lg group">
          <summary class="p-3 bg-gray-50/80 hover:bg-gray-100/80 cursor-pointer text-xs text-gray-800 uppercase tracking-wider flex items-center justify-between transition-colors">
            <div class="flex items-center gap-3">
              <span class="font-black">Execution Health</span>
              <span class="text-[10px] font-bold text-gray-400 group-open:hidden">
                {{ fmtMetric(store.dealVelocitySlippageCommandCenter?.summary?.high_risk_deals) }} at risk
                · {{ fmtMetric(store.dealVelocitySlippageCommandCenter?.summary?.stagnant_deals) }} stagnant
                · {{ fmtMetric(store.dealVelocitySlippageCommandCenter?.summary?.repeat_slippage_deals) }} slipped
              </span>
            </div>
            <span class="text-[10px] text-gray-400 group-open:rotate-180 transition-transform font-normal">▼</span>
          </summary>
          <div class="p-4 space-y-4 border-t border-gray-200">
            <DealExecutionHealth
              :summary="store.dealExecutionHealth?.summary"
              :deals="store.dealExecutionHealth?.deals"
              :meta="store.dealExecutionHealth?.meta"
              :loading="store.loadingDealExecutionHealth"
            />
            <DealExecutionAnalytics
              :summary="store.dealExecutionAnalytics?.summary"
              :details="store.dealExecutionAnalytics?.details"
              :meta="store.dealExecutionAnalytics?.meta"
              :loading="store.loadingDealExecutionAnalytics"
              :error="store.dealExecutionAnalyticsError"
            />
            <DealVelocitySlippageCommandCenter />
          </div>
        </details>

        <!-- 5. PROCESS BOTTLENECKS & PROGRESSION -->
        <details ref="bottlenecksDetailsRef" @toggle="handleBottlenecksToggle" class="sf-card border border-gray-200 rounded-lg group">
          <summary class="p-3 bg-gray-50/80 hover:bg-gray-100/80 cursor-pointer text-xs text-gray-800 uppercase tracking-wider flex items-center justify-between transition-colors">
            <div class="flex items-center gap-3">
              <span class="font-black">Stage Bottlenecks</span>
              <span class="text-[10px] font-bold text-gray-400 group-open:hidden">
                {{ dealProgressionData?.stages?.length || 0 }} stages tracked
              </span>
            </div>
            <span class="text-[10px] text-gray-400 group-open:rotate-180 transition-transform font-normal">▼</span>
          </summary>
          <div class="p-4 space-y-4 border-t border-gray-200">
            <StageTransitionBottleneckAnalytics />
            <DealProgressionAnalytics
              :summary="dealProgressionData?.summary"
              :transitions="dealProgressionData?.transitions"
              :stages="dealProgressionData?.stages"
              :meta="dealProgressionData?.meta"
              :loading="loadingDealProgression"
            />
          </div>
        </details>

        <!-- 6. HISTORICAL OUTCOME CORRELATIONS -->
        <details ref="lossCorrelationDetailsRef" @toggle="handleLossCorrelationToggle" class="sf-card border border-gray-200 rounded-lg group">
          <summary class="p-3 bg-gray-50/80 hover:bg-gray-100/80 cursor-pointer text-xs text-gray-800 uppercase tracking-wider flex items-center justify-between transition-colors">
            <div class="flex items-center gap-3">
              <span class="font-black">Loss Correlation</span>
              <span class="text-[10px] font-bold text-gray-400 group-open:hidden">Historical outcome patterns</span>
            </div>
            <span class="text-[10px] text-gray-400 group-open:rotate-180 transition-transform font-normal">▼</span>
          </summary>
          <div class="p-4 border-t border-gray-200">
            <LossOutcomeCorrelationAnalytics />
          </div>
        </details>
      </div>

      <!-- TAB 3: TARGETS & PERFORMANCE -->
      <div v-else-if="activeTab === 'targets'" class="space-y-4">
        <SalesTargetPerformance />
        <SalesTargetManagementAttention />
        <SalesTargetRootCauseDiagnostics />
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SalesTargetTeamPerformance />
          <SalesTargetRepPerformance />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RepLeaderboardAnalytics
            :leaderboard="leaderboardData?.leaderboard"
            :meta="leaderboardData?.meta"
            :loading="loadingLeaderboard"
          />
          <ClosedSalesAnalytics
            :summary="closedSalesData?.summary"
            :lost-reasons="closedSalesData?.lost_reasons"
            :meta="closedSalesData?.meta"
            :loading="loadingClosedSales"
          />
        </div>
      </div>

      <!-- TAB 4: ACCOUNTS -->
      <div v-else-if="activeTab === 'accounts'" class="space-y-4">
        <KeyAccountIntelligence
          :accounts="store.keyAccountIntelligence?.accounts"
          :summary="store.keyAccountIntelligence?.summary"
          :meta="store.keyAccountIntelligence?.meta"
          :loading="store.loadingKeyAccountIntelligence"
          :error="store.keyAccountIntelligenceError"
          @trigger-action="handleAccountAction"
        />
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <IndustryAnalytics
            :industries="industryData?.industries"
            :meta="industryData?.meta"
            :loading="loadingIndustry"
          />
          <OrganizationAnalytics
            :organizations="organizationData?.organizations"
            :meta="organizationData?.meta"
            :loading="loadingOrganization"
          />
        </div>
      </div>

      <!-- TAB 5: LEADS & ACTIVITIES -->
      <div v-else-if="activeTab === 'leads_activities'" class="space-y-6">
        <!-- Lead Health Summary Strip (Executive Slate Strip) -->
        <div class="sf-card p-3 border-l-4 border-l-blue-600 flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <div class="text-xs font-black text-gray-900 uppercase tracking-wider">Lead Health & Intake</div>
            <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Active Intake Scope
            </span>
          </div>

          <div class="flex items-center gap-6 text-xs">
            <div>
              <span class="text-[10px] text-gray-400 font-bold uppercase block">Conversion Rate</span>
              <span class="text-sm font-black text-gray-900">
                {{ leadConvData?.summary?.overall_conversion_rate !== null && leadConvData?.summary?.overall_conversion_rate !== undefined ? `${leadConvData.summary.overall_conversion_rate}%` : 'Not measured' }}
              </span>
            </div>
            <div>
              <span class="text-[10px] text-gray-400 font-bold uppercase block">Unconverted Backlog</span>
              <span class="text-sm font-black text-gray-800">{{ fmtMetric(store.unconvertedLeadAnalytics?.summary?.total_unconverted_leads) }}</span>
            </div>
            <div>
              <span class="text-[10px] text-amber-600 font-bold uppercase block">Stale (>14d)</span>
              <span class="text-sm font-black text-amber-700">{{ fmtMetric(store.unconvertedLeadAnalytics?.summary?.stale_leads) }}</span>
            </div>
          </div>
        </div>

        <!-- SECTION 1: LEAD GENERATION & INTAKE -->
        <div class="space-y-3">
          <div class="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span>1. Lead Generation & Acquisition Channels</span>
            <div class="flex-1 h-px bg-gray-200"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LeadFunnel
              :funnel="funnelData?.funnel"
              :period-activity="funnelData?.period_activity"
              :meta="funnelData?.meta"
              :loading="loadingFunnel"
            />
            <LeadConversionAnalytics
              :summary="leadConvData?.summary"
              :source-breakdown="leadConvData?.source_breakdown"
              :funnel="leadConvData?.funnel"
              :meta="leadConvData?.meta"
              :loading="loadingLeadConv"
            />
          </div>

          <LeadSourceAnalytics
            :sources="sourcesData?.sources"
            :meta="sourcesData?.meta"
            :loading="loadingSources"
          />
        </div>

        <!-- SECTION 2: LEAD EXECUTION & CONVERSION BACKLOG -->
        <div class="space-y-3 pt-2">
          <div class="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span>2. Lead Execution & Activity Tracking</span>
            <div class="flex-1 h-px bg-gray-200"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div class="lg:col-span-7">
              <UnconvertedLeadAnalytics
                :summary="store.unconvertedLeadAnalytics?.summary"
                :bottlenecks="store.unconvertedLeadAnalytics?.bottlenecks"
                :stages="store.unconvertedLeadAnalytics?.stages"
                :age-distribution="store.unconvertedLeadAnalytics?.age_distribution"
                :meta="store.unconvertedLeadAnalytics?.meta"
                :loading="store.loadingUnconvertedLeadAnalytics"
              />
            </div>
            <div class="lg:col-span-5">
              <ActivityExecutionAnalytics
                :summary="activityData?.summary"
                :activity-breakdown="activityData?.activity_breakdown"
                :meta="activityData?.meta"
                :loading="loadingActivity"
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'
import {
  getExecutiveKpis,
  getLeadFunnel,
  getLeadSources,
  getPipelineHealth,
  getClosedSalesAnalytics,
  getSalesVelocityAnalytics,
  getActivityExecutionAnalytics,
  getRepLeaderboardAnalytics,
  getIndustryAnalytics,
  getOrganizationAnalytics,
  getLeadConversionAnalytics,
  getDealProgressionAnalytics,
  getPipelineProbabilityAnalytics,
  getTopOpportunities,
  getCollectionsAnalytics
} from '../../services/crm_dashboard'

// Import components
import DashboardHeader from '../../components/crm_dashboard/DashboardHeader.vue'
import ManagementAttentionBar from '../../components/crm_dashboard/ManagementAttentionBar.vue'
import ExecutiveOverview from '../../components/crm_dashboard/ExecutiveOverview.vue'
import ExecutiveTrendChart from '../../components/crm_dashboard/ExecutiveTrendChart.vue'
import ExecutiveInsights from '../../components/crm_dashboard/ExecutiveInsights.vue'
import PipelineHealth from '../../components/crm_dashboard/PipelineHealth.vue'
import LeadFunnel from '../../components/crm_dashboard/LeadFunnel.vue'
import LeadSourceAnalytics from '../../components/crm_dashboard/LeadSourceAnalytics.vue'
import ClosedSalesAnalytics from '../../components/crm_dashboard/ClosedSalesAnalytics.vue'
import SalesVelocityAnalytics from '../../components/crm_dashboard/SalesVelocityAnalytics.vue'
import ActivityExecutionAnalytics from '../../components/crm_dashboard/ActivityExecutionAnalytics.vue'
import RepLeaderboardAnalytics from '../../components/crm_dashboard/RepLeaderboardAnalytics.vue'
import IndustryAnalytics from '../../components/crm_dashboard/IndustryAnalytics.vue'
import OrganizationAnalytics from '../../components/crm_dashboard/OrganizationAnalytics.vue'
import LeadConversionAnalytics from '../../components/crm_dashboard/LeadConversionAnalytics.vue'
import UnconvertedLeadAnalytics from '../../components/crm_dashboard/UnconvertedLeadAnalytics.vue'
import DealProgressionAnalytics from '../../components/crm_dashboard/DealProgressionAnalytics.vue'
import PipelineProbabilityAnalytics from '../../components/crm_dashboard/PipelineProbabilityAnalytics.vue'
import TopOpportunitiesWidget from '../../components/crm_dashboard/TopOpportunitiesWidget.vue'
import SalesTargetPerformance from '../../components/crm_dashboard/SalesTargetPerformance.vue'
import SalesTargetTeamPerformance from '../../components/crm_dashboard/SalesTargetTeamPerformance.vue'
import SalesTargetRepPerformance from '../../components/crm_dashboard/SalesTargetRepPerformance.vue'
import SalesTargetManagementAttention from '../../components/crm_dashboard/SalesTargetManagementAttention.vue'
import SalesTargetRootCauseDiagnostics from '../../components/crm_dashboard/SalesTargetRootCauseDiagnostics.vue'
import DealExecutionHealth from '../../components/crm_dashboard/DealExecutionHealth.vue'
import DealExecutionAnalytics from '../../components/crm_dashboard/DealExecutionAnalytics.vue'
import DealVelocitySlippageCommandCenter from '../../components/crm_dashboard/DealVelocitySlippageCommandCenter.vue'
import StageTransitionBottleneckAnalytics from '../../components/crm_dashboard/StageTransitionBottleneckAnalytics.vue'
import LossOutcomeCorrelationAnalytics from '../../components/crm_dashboard/LossOutcomeCorrelationAnalytics.vue'
import KeyAccountIntelligence from '../../components/crm_dashboard/KeyAccountIntelligence.vue'
import ExperimentalExecutiveWorkspace from '../../components/crm_dashboard/ExperimentalExecutiveWorkspace.vue'

const store = useCrmDashboardStore()
const activeTab = ref('executive_workspace')

const staleLeadsIsPositive = computed(() => {
  const count = store.unconvertedLeadAnalytics?.summary?.stale_leads
  return count !== null && count !== undefined && Number(count) > 0
})

const tabs = computed(() => {
  const overdue = activityData.value?.summary?.overdue_activities_count
  const badgeVal = (overdue !== null && overdue !== undefined && Number(overdue) > 0) ? overdue : undefined

  return [
    { id: 'executive_workspace', label: 'Executive Workspace' },
    { id: 'pipeline', label: 'Pipeline & Execution' },
    { id: 'targets', label: 'Targets & Performance' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'leads_activities', label: 'Leads & Activities', badge: badgeVal }
  ]
})

// Analytical Data State & Loading States
const kpiData = ref(null)
const loadingKpis = ref(false)

const funnelData = ref(null)
const loadingFunnel = ref(false)

const sourcesData = ref(null)
const loadingSources = ref(false)

const pipelineData = ref(null)
const loadingPipeline = ref(false)

const closedSalesData = ref(null)
const loadingClosedSales = ref(false)

const salesVelocityData = ref(null)
const loadingSalesVelocity = ref(false)

const activityData = ref(null)
const loadingActivity = ref(false)

const leaderboardData = ref(null)
const loadingLeaderboard = ref(false)

const industryData = ref(null)
const loadingIndustry = ref(false)

const organizationData = ref(null)
const loadingOrganization = ref(false)

const leadConvData = ref(null)
const loadingLeadConv = ref(false)

const dealProgressionData = ref(null)
const loadingDealProgression = ref(false)

const pipelineProbData = ref(null)
const loadingPipelineProb = ref(false)

const opportunitiesData = ref(null)
const loadingOpportunities = ref(false)

// Scope-Aware Component-Level Cache Map
const componentCache = new Map()

function getScopeCacheKey(endpointName) {
  const p = store.effectiveScopeParams
  if (!p) return null
  return `${endpointName}:${p.period}:${p.team_filter}:${p.user_filter}:${p.custom_from || ''}:${p.custom_to || ''}`
}

async function fetchCachedApi(endpointName, apiFn, scopeParams, force = false) {
  const key = getScopeCacheKey(endpointName)
  if (!force && key && componentCache.has(key)) {
    return componentCache.get(key)
  }
  const result = await apiFn(scopeParams)
  if (key && result) {
    componentCache.set(key, result)
  }
  return result
}

function clearComponentCache() {
  componentCache.clear()
}

// -----------------------------------------------------------------------
// Executive Initial Load (All 13 Executive-Essential Datasets Launch Concurrently)
// -----------------------------------------------------------------------
async function loadExecutiveEssentials(force = false) {
  const scopeParams = store.effectiveScopeParams
  if (!scopeParams) return

  loadingKpis.value = true
  loadingFunnel.value = true
  loadingPipeline.value = true
  loadingClosedSales.value = true
  loadingLeaderboard.value = true
  loadingPipelineProb.value = true
  loadingOpportunities.value = true
  loadingSalesVelocity.value = true
  loadingActivity.value = true

  try {
    const [
      kpisRes,
      funnelRes,
      pipelineRes,
      closedSalesRes,
      leaderboardRes,
      pipelineProbRes,
      opportunitiesRes,
      salesVelocityRes,
      activityRes
    ] = await Promise.allSettled([
      fetchCachedApi('executive_kpis', getExecutiveKpis, scopeParams, force),
      fetchCachedApi('lead_funnel', getLeadFunnel, scopeParams, force),
      fetchCachedApi('pipeline_health', getPipelineHealth, scopeParams, force),
      fetchCachedApi('closed_sales', getClosedSalesAnalytics, scopeParams, force),
      fetchCachedApi('rep_leaderboard', getRepLeaderboardAnalytics, scopeParams, force),
      fetchCachedApi('pipeline_prob', getPipelineProbabilityAnalytics, scopeParams, force),
      fetchCachedApi('top_opportunities', getTopOpportunities, scopeParams, force),
      fetchCachedApi('sales_velocity', getSalesVelocityAnalytics, scopeParams, force),
      fetchCachedApi('activity_execution', getActivityExecutionAnalytics, scopeParams, force),
      store.fetchExecutiveKpiComparisonAnalyticsData(force),
      store.fetchExecutiveTrendData(force),
      store.fetchSalesTargetAnalytics(force),
      store.fetchSalesTargetRootCauseAnalytics(force),
      store.fetchDealVelocitySlippageCommandCenterData(force),
      store.fetchCollectionsData(force)
    ])

    if (kpisRes.status === 'fulfilled') kpiData.value = kpisRes.value
    if (funnelRes.status === 'fulfilled') funnelData.value = funnelRes.value
    if (pipelineRes.status === 'fulfilled') pipelineData.value = pipelineRes.value
    if (closedSalesRes.status === 'fulfilled') closedSalesData.value = closedSalesRes.value
    if (leaderboardRes.status === 'fulfilled') leaderboardData.value = leaderboardRes.value
    if (pipelineProbRes.status === 'fulfilled') pipelineProbData.value = pipelineProbRes.value
    if (opportunitiesRes.status === 'fulfilled') opportunitiesData.value = opportunitiesRes.value
    if (salesVelocityRes.status === 'fulfilled') salesVelocityData.value = salesVelocityRes.value
    if (activityRes.status === 'fulfilled') activityData.value = activityRes.value
  } finally {
    loadingKpis.value = false
    loadingFunnel.value = false
    loadingPipeline.value = false
    loadingClosedSales.value = false
    loadingLeaderboard.value = false
    loadingPipelineProb.value = false
    loadingOpportunities.value = false
    loadingSalesVelocity.value = false
    loadingActivity.value = false
  }
}

// Template refs for collapsible diagnostic sections
const bottlenecksDetailsRef = ref(null)
const lossCorrelationDetailsRef = ref(null)

// On-demand loader for Stage Bottlenecks & Deal Progression
async function loadBottlenecksDiagnostics(force = false) {
  const scopeParams = store.effectiveScopeParams
  if (!scopeParams) return

  loadingDealProgression.value = true
  try {
    const [dealProgRes] = await Promise.allSettled([
      fetchCachedApi('deal_progression', getDealProgressionAnalytics, scopeParams, force),
      store.fetchStageTransitionBottleneckAnalyticsData(force)
    ])
    if (dealProgRes.status === 'fulfilled') dealProgressionData.value = dealProgRes.value
  } finally {
    loadingDealProgression.value = false
  }
}

// On-demand loader for Loss Outcome Correlation
async function loadLossCorrelationDiagnostics(force = false) {
  await store.fetchLossOutcomeCorrelationAnalyticsData(force)
}

function handleBottlenecksToggle(event) {
  if (event.target && event.target.open) {
    loadBottlenecksDiagnostics(false)
  }
}

function handleLossCorrelationToggle(event) {
  if (event.target && event.target.open) {
    loadLossCorrelationDiagnostics(false)
  }
}

// -----------------------------------------------------------------------
// Lazy Load Handlers for Secondary Workspaces
// -----------------------------------------------------------------------
async function loadPipelineWorkspaceData(force = false) {
  const scopeParams = store.effectiveScopeParams
  if (!scopeParams) return

  // Re-verify essential shared datasets if missing
  if (!pipelineData.value) {
    loadingPipeline.value = true
    try {
      pipelineData.value = await fetchCachedApi('pipeline_health', getPipelineHealth, scopeParams, force)
    } finally {
      loadingPipeline.value = false
    }
  }
  if (!pipelineProbData.value) {
    loadingPipelineProb.value = true
    try {
      pipelineProbData.value = await fetchCachedApi('pipeline_prob', getPipelineProbabilityAnalytics, scopeParams, force)
    } finally {
      loadingPipelineProb.value = false
    }
  }
  if (!opportunitiesData.value) {
    loadingOpportunities.value = true
    try {
      opportunitiesData.value = await fetchCachedApi('top_opportunities', getTopOpportunities, scopeParams, force)
    } finally {
      loadingOpportunities.value = false
    }
  }

  // Section 4 (Execution Health) is open by default: fetch its 3 datasets
  await Promise.all([
    store.fetchDealVelocitySlippageCommandCenterData(force),
    store.fetchDealExecutionHealthAnalytics(force),
    store.fetchDealExecutionAnalyticsData(force)
  ])

  // If Section 5 (Stage Bottlenecks) is open, fetch its diagnostics
  if (bottlenecksDetailsRef.value && bottlenecksDetailsRef.value.open) {
    await loadBottlenecksDiagnostics(force)
  }

  // If Section 6 (Loss Correlation) is open, fetch its diagnostics
  if (lossCorrelationDetailsRef.value && lossCorrelationDetailsRef.value.open) {
    await loadLossCorrelationDiagnostics(force)
  }
}

async function loadTargetsWorkspaceData(force = false) {
  const scopeParams = store.effectiveScopeParams
  if (!scopeParams) return

  // Re-verify shared leaderboard & closed sales if missing
  if (!leaderboardData.value) {
    loadingLeaderboard.value = true
    try {
      leaderboardData.value = await fetchCachedApi('rep_leaderboard', getRepLeaderboardAnalytics, scopeParams, force)
    } finally {
      loadingLeaderboard.value = false
    }
  }
  if (!closedSalesData.value) {
    loadingClosedSales.value = true
    try {
      closedSalesData.value = await fetchCachedApi('closed_sales', getClosedSalesAnalytics, scopeParams, force)
    } finally {
      loadingClosedSales.value = false
    }
  }

  await Promise.all([
    store.fetchSalesTargetAnalytics(force),
    store.fetchSalesTargetRootCauseAnalytics(force)
  ])
}

async function loadAccountsWorkspaceData(force = false) {
  const scopeParams = store.effectiveScopeParams
  if (!scopeParams) return

  loadingIndustry.value = true
  loadingOrganization.value = true

  try {
    const [indRes, orgRes] = await Promise.allSettled([
      fetchCachedApi('industry_analytics', getIndustryAnalytics, scopeParams, force),
      fetchCachedApi('organization_analytics', getOrganizationAnalytics, scopeParams, force),
      store.fetchKeyAccountIntelligenceData(force)
    ])

    if (indRes.status === 'fulfilled') industryData.value = indRes.value
    if (orgRes.status === 'fulfilled') organizationData.value = orgRes.value
  } finally {
    loadingIndustry.value = false
    loadingOrganization.value = false
  }
}

async function loadLeadsWorkspaceData(force = false) {
  const scopeParams = store.effectiveScopeParams
  if (!scopeParams) return

  loadingFunnel.value = true
  loadingSources.value = true
  loadingLeadConv.value = true
  loadingActivity.value = true

  try {
    const [funnelRes, sourcesRes, leadConvRes, activityRes] = await Promise.allSettled([
      fetchCachedApi('lead_funnel', getLeadFunnel, scopeParams, force),
      fetchCachedApi('lead_sources', getLeadSources, scopeParams, force),
      fetchCachedApi('lead_conversion', getLeadConversionAnalytics, scopeParams, force),
      fetchCachedApi('activity_execution', getActivityExecutionAnalytics, scopeParams, force)
    ])

    store.fetchUnconvertedLeadAnalyticsData(force)

    if (funnelRes.status === 'fulfilled') funnelData.value = funnelRes.value
    if (sourcesRes.status === 'fulfilled') sourcesData.value = sourcesRes.value
    if (leadConvRes.status === 'fulfilled') leadConvData.value = leadConvRes.value
    if (activityRes.status === 'fulfilled') activityData.value = activityRes.value
  } finally {
    loadingFunnel.value = false
    loadingSources.value = false
    loadingLeadConv.value = false
    loadingActivity.value = false
  }
}

async function loadExperimentalExecWorkspaceData(force = false) {
  const scopeParams = store.effectiveScopeParams
  if (!scopeParams) return

  loadingKpis.value = true
  loadingSources.value = true
  loadingSalesVelocity.value = true
  loadingPipeline.value = true

  try {
    const [kpisRes, sourcesRes, salesVelocityRes, pipelineRes] = await Promise.allSettled([
      fetchCachedApi('executive_kpis', getExecutiveKpis, scopeParams, force),
      fetchCachedApi('lead_sources', getLeadSources, scopeParams, force),
      fetchCachedApi('sales_velocity', getSalesVelocityAnalytics, scopeParams, force),
      fetchCachedApi('pipeline_health', getPipelineHealth, scopeParams, force),
      store.fetchExecutiveKpiComparisonAnalyticsData(force),
      store.fetchExecutiveTrendData(force),
      store.fetchSalesTargetAnalytics(force),
      store.fetchDealVelocitySlippageCommandCenterData(force)
    ])

    if (kpisRes.status === 'fulfilled') kpiData.value = kpisRes.value
    if (sourcesRes.status === 'fulfilled') sourcesData.value = sourcesRes.value
    if (salesVelocityRes.status === 'fulfilled') salesVelocityData.value = salesVelocityRes.value
    if (pipelineRes.status === 'fulfilled') pipelineData.value = pipelineRes.value
  } finally {
    loadingKpis.value = false
    loadingSources.value = false
    loadingSalesVelocity.value = false
    loadingPipeline.value = false
  }
}

function handleInspectCause(targetTab) {
  if (targetTab) {
    activeTab.value = targetTab
  }
}

// -----------------------------------------------------------------------
// Workspace Tab Switch Orchestrator
// -----------------------------------------------------------------------
async function loadActiveWorkspaceData(tabId = activeTab.value, force = false) {
  if (!store.effectiveScopeParams) return

  if (tabId === 'overview') {
    await loadExecutiveEssentials(force)
  } else if (tabId === 'experimental_exec') {
    await loadExperimentalExecWorkspaceData(force)
  } else if (tabId === 'pipeline') {
    await loadPipelineWorkspaceData(force)
  } else if (tabId === 'targets') {
    await loadTargetsWorkspaceData(force)
  } else if (tabId === 'accounts') {
    await loadAccountsWorkspaceData(force)
  } else if (tabId === 'leads_activities') {
    await loadLeadsWorkspaceData(force)
  }
}

function fmtMetric(v) {
  if (v === null || v === undefined) return 'Not measured'
  return new Intl.NumberFormat('en-IN').format(v)
}

function fmtCurr(v) {
  if (v === null || v === undefined) return 'Not measured'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

onMounted(async () => {
  await store.fetchFilterOptions()
  await store.validateScope()
})

// Watch active tab changes to trigger lazy loading for newly opened workspaces
watch(activeTab, (newTab) => {
  loadActiveWorkspaceData(newTab, false)
})

// Watch effective scope changes: invalidate component cache and reload ONLY current active workspace
watch(
  () => store.effectiveScopeParams,
  (newParams) => {
    if (newParams) {
      clearComponentCache()
      loadActiveWorkspaceData(activeTab.value, true)
    }
  },
  { deep: true }
)

function handleAccountAction(payload) {
  if (payload && payload.actionType) {
    store.executeAction({
      action_type: payload.actionType,
      target_doctype: payload.doctype,
      target_id: payload.id
    })
  }
}
</script>

<style>
/* Global Salesforce Lightning Card & Utility Styling */
.sf-card {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
</style>
