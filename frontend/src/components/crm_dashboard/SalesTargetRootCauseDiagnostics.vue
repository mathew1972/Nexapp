<template>
  <div class="sf-card p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <span>Sales Target Root-Cause Diagnostics</span>
        </h3>
        <p class="text-[11px] text-gray-500">Why targets are at risk, evidence metrics, and recommended management actions</p>
      </div>
    </div>

    <!-- Loading Skeleton State -->
    <div v-if="loading" class="h-32 bg-gray-50 animate-pulse rounded-lg"></div>

    <!-- Empty State -->
    <div v-else-if="!summary || diagnostics.length === 0" class="p-4 text-center text-xs text-gray-400">
      No diagnostic root-cause data available for this scope.
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-4">
      <!-- Diagnostic Summary Pills Row -->
      <div class="flex flex-wrap gap-2 text-[11px] font-medium">
        <div class="px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5">
          <span class="font-extrabold">{{ summary.critical_reps || 0 }}</span> Critical Reps
        </div>
        <div class="px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
          <span class="font-extrabold">{{ summary.at_risk_reps || 0 }}</span> At Risk Reps
        </div>
        <div class="px-2.5 py-1 rounded bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1">
          <span class="font-bold">Pipeline Deficits:</span>
          <span>{{ summary.primary_cause_breakdown?.INSUFFICIENT_PIPELINE_VOLUME || 0 }}</span>
        </div>
        <div class="px-2.5 py-1 rounded bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1">
          <span class="font-bold">Stage Bottlenecks:</span>
          <span>{{ summary.primary_cause_breakdown?.LOW_STAGE_PROBABILITY || 0 }}</span>
        </div>
        <div class="px-2.5 py-1 rounded bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1">
          <span class="font-bold">Aging Deals:</span>
          <span>{{ summary.primary_cause_breakdown?.STALLED_DEAL_AGING || 0 }}</span>
        </div>
        <div class="px-2.5 py-1 rounded bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1">
          <span class="font-bold">Activity Deficits:</span>
          <span>{{ summary.primary_cause_breakdown?.ACTIVITY_EXECUTION_DEFICIT || 0 }}</span>
        </div>
      </div>

      <!-- Representative Diagnostics List -->
      <div class="space-y-3">
        <div
          v-for="diag in atRiskDiagnostics"
          :key="diag.user"
          class="p-3 border rounded-lg bg-gray-50/40 space-y-2.5"
          :class="diag.risk_status === 'CRITICAL' ? 'border-red-200' : 'border-amber-200'"
        >
          <!-- Rep Header Line -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-gray-900">{{ diag.user_name || diag.user }}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase border" :class="getStatusBadgeClass(diag.risk_status)">
                {{ diag.risk_status }}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded font-medium bg-gray-200/80 text-gray-700">
                Primary: {{ formatCause(diag.primary_root_cause) }}
              </span>
            </div>
            <div class="text-xs font-bold text-gray-800">
              Target Gap: <span class="text-red-700">{{ fmtCurr(diag.remaining_value) }}</span>
            </div>
          </div>

          <!-- Evidence Metrics Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-white p-2 rounded border border-gray-100">
            <div>
              <span class="text-gray-400 block">Pipeline Coverage</span>
              <span class="font-extrabold text-gray-800">{{ diag.metrics?.pipeline_coverage !== undefined ? diag.metrics.pipeline_coverage.toFixed(1) : '0.0' }}%</span>
            </div>
            <div>
              <span class="text-gray-400 block">Early Stage Ratio</span>
              <span class="font-extrabold text-gray-800">{{ diag.metrics?.early_stage_ratio !== undefined ? diag.metrics.early_stage_ratio.toFixed(1) : '0.0' }}%</span>
            </div>
            <div>
              <span class="text-gray-400 block">Avg Deal Age</span>
              <span class="font-extrabold text-gray-800">{{ diag.metrics?.avg_deal_age_days ?? 0 }} days</span>
            </div>
            <div>
              <span class="text-gray-400 block">Activities / Overdue</span>
              <span class="font-extrabold" :class="diag.metrics?.overdue_tasks > 0 ? 'text-red-600' : 'text-gray-800'">
                {{ diag.metrics?.completed_activities ?? 0 }} done / {{ diag.metrics?.overdue_tasks ?? 0 }} overdue
              </span>
            </div>
          </div>

          <!-- Recommended Action Box -->
          <div class="p-2 rounded text-[11px] bg-blue-50/70 border border-blue-100 text-blue-900 font-medium flex items-start gap-1.5">
            <span class="font-extrabold text-blue-700 uppercase text-[9px] tracking-wider shrink-0 mt-0.5">Action:</span>
            <span>{{ diag.recommended_action }}</span>
          </div>

          <!-- Top Contributing Risk Deals -->
          <div v-if="diag.critical_risk_deals?.length > 0" class="space-y-1.5 pt-1 border-t border-gray-200/60">
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Top Contributing Opportunities</span>
              <span class="text-[9px] text-gray-400 font-normal">Click deal to open • Click action to intervene</span>
            </div>
            <div class="space-y-1.5">
              <div
                v-for="deal in diag.critical_risk_deals"
                :key="deal.deal_id"
                class="p-2 rounded bg-white hover:bg-slate-50 border border-gray-200 text-[10px] flex items-center justify-between gap-2 transition-colors"
              >
                <div class="flex items-center gap-2 truncate cursor-pointer" @click="openDeal(deal.deal_id)" title="Open CRM Deal form">
                  <span class="font-bold text-blue-700 hover:underline truncate max-w-[140px]">
                    {{ deal.deal_title }}
                  </span>
                  <span class="font-black text-gray-900">{{ fmtCurr(deal.deal_value) }}</span>
                  <span class="text-[9px] text-gray-500">({{ deal.stage }} • {{ deal.age_days }}d)</span>
                </div>

                <!-- Intervention Action Buttons -->
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    @click="triggerAction(deal, 'CREATE_REVIEW_TASK', diag)"
                    type="button"
                    class="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
                    title="Request Management Review"
                  >
                    Review
                  </button>
                  <button
                    @click="triggerAction(deal, 'CREATE_FOLLOWUP_ACTIVITY', diag)"
                    type="button"
                    class="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors"
                    title="Create Follow-up Activity"
                  >
                    Follow-up
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Confirmation Drawer -->
    <ActionConfirmationDrawer
      :is-open="drawerOpen"
      :action-type="selectedActionType"
      target-doctype="CRM Deal"
      :target-id="selectedDealId"
      :extra-context="selectedDealContext"
      :why-flagged="selectedWhyFlagged"
      @close="drawerOpen = false"
      @success="onActionSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'
import { openDeal } from '../../utils/crmDashboardNavigation'
import ActionConfirmationDrawer from './ActionConfirmationDrawer.vue'

const store = useCrmDashboardStore()

const drawerOpen = ref(false)
const selectedActionType = ref('CREATE_FOLLOWUP_ACTIVITY')
const selectedDealId = ref('')
const selectedDealContext = ref('')
const selectedWhyFlagged = ref('')

function triggerAction(deal, actionType, diag) {
  selectedActionType.value = actionType
  selectedDealId.value = deal.deal_id
  selectedDealContext.value = `Rep: ${diag.user_name || diag.user} • Stage: ${deal.stage} • Value: ${fmtCurr(deal.deal_value)}`
  selectedWhyFlagged.value = `Primary Root Cause: ${formatCause(diag.primary_root_cause)} (${diag.risk_status})`
  drawerOpen.value = true
}

function onActionSuccess() {
  drawerOpen.value = false
}

const salesTargetRootCause = computed(() => store.salesTargetRootCause)
const loading = computed(() => store.loadingSalesTargetRootCause)

const summary = computed(() => salesTargetRootCause.value?.summary)
const diagnostics = computed(() => salesTargetRootCause.value?.diagnostics || [])
const currency = computed(() => salesTargetRootCause.value?.meta?.currency || 'INR')

/** Filter reps in CRITICAL or AT_RISK status, or top 5 if none */
const atRiskDiagnostics = computed(() => {
  const atRisk = diagnostics.value.filter(d => d.risk_status === 'CRITICAL' || d.risk_status === 'AT_RISK')
  return atRisk.length > 0 ? atRisk : diagnostics.value.slice(0, 5)
})

function formatCause(causeStr) {
  if (!causeStr || causeStr === 'NONE') return 'On Track'
  return causeStr.replace(/_/g, ' ')
}

function getStatusBadgeClass(status) {
  if (status === 'CRITICAL') return 'bg-red-50 text-red-700 border-red-200'
  if (status === 'AT_RISK') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'ON_TRACK') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
}

function fmtCurr(val) {
  if (val === null || val === undefined) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.value,
    maximumFractionDigits: 0
  }).format(val)
}
</script>
