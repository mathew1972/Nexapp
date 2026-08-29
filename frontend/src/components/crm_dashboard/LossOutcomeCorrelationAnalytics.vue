<template>
  <div class="sf-card p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <span>Loss Outcome Correlation Analytics</span>
        </h3>
        <p class="text-[11px] text-gray-500">
          Associational comparison of execution behaviors prior to deal Won vs Lost outcomes
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          Historical association — not predictive or causal
        </span>
        <span class="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
          {{ fmtVal(summary?.total_outcome_deals) }} Total Outcomes
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div class="grid grid-cols-3 gap-2">
        <div v-for="i in 3" :key="i" class="h-16 bg-gray-50 animate-pulse rounded-lg"></div>
      </div>
      <div class="h-44 bg-gray-50 animate-pulse rounded-lg"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
      Unable to load Loss Outcome Correlation analytics. ({{ error }})
    </div>

    <!-- Empty State -->
    <div v-else-if="!summary || summary.total_outcome_deals === 0" class="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
      No closed Won or Lost deals available for the selected period and scope.
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-4">
      <!-- SECTION A: OUTCOME SUMMARY -->
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="p-3 rounded bg-emerald-50/70 border border-emerald-200/60">
          <div class="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Won Deals</div>
          <div class="text-lg font-extrabold text-emerald-900">{{ fmtVal(summary.won_deals) }}</div>
          <div class="text-[10px] text-emerald-600 font-medium">Closed Won outcomes</div>
        </div>

        <div class="p-3 rounded bg-rose-50/70 border border-rose-200/60">
          <div class="text-[10px] text-rose-700 font-semibold uppercase tracking-wider">Lost Deals</div>
          <div class="text-lg font-extrabold text-rose-900">{{ fmtVal(summary.lost_deals) }}</div>
          <div class="text-[10px] text-rose-600 font-medium">Closed Lost outcomes</div>
        </div>

        <div class="p-3 rounded bg-indigo-50/70 border border-indigo-200/60">
          <div class="text-[10px] text-indigo-700 font-semibold uppercase tracking-wider">Total Outcomes</div>
          <div class="text-lg font-extrabold text-indigo-900">{{ fmtVal(summary.total_outcome_deals) }}</div>
          <div class="text-[10px] text-indigo-600 font-medium">Closed deal cohort</div>
        </div>
      </div>

      <!-- SECTION B: HISTORICAL CORRELATION COMPARISON (WON vs LOST) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 1. PROBABILITY DECLINE -->
        <div class="border border-gray-200 rounded-lg p-3 space-y-3 bg-white">
          <div class="flex items-center justify-between border-b border-gray-100 pb-2">
            <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Probability Decline</h4>
            <span class="text-[10px] text-gray-500 font-medium">Negative probability revisions</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-left text-[11px]">
            <!-- Won -->
            <div class="p-2 rounded bg-emerald-50/50 border border-emerald-100 space-y-1">
              <div class="text-[10px] font-bold text-emerald-800 uppercase">Won Deals</div>
              <div>Affected: <span class="font-bold text-gray-900">{{ fmtVal(probDecline.won?.affected_deals) }}</span> ({{ fmtPct(probDecline.won?.affected_percentage) }})</div>
              <div>Total Decline: <span class="font-bold text-gray-900">{{ fmtPct(probDecline.won?.total_decline_amount) }}</span></div>
              <div>Avg / Deal: <span class="font-bold text-gray-900">{{ fmtPct(probDecline.won?.average_decline_per_affected_deal) }}</span></div>
            </div>
            <!-- Lost -->
            <div class="p-2 rounded bg-rose-50/50 border border-rose-100 space-y-1">
              <div class="text-[10px] font-bold text-rose-800 uppercase">Lost Deals</div>
              <div>Affected: <span class="font-bold text-gray-900">{{ fmtVal(probDecline.lost?.affected_deals) }}</span> ({{ fmtPct(probDecline.lost?.affected_percentage) }})</div>
              <div>Total Decline: <span class="font-bold text-gray-900">{{ fmtPct(probDecline.lost?.total_decline_amount) }}</span></div>
              <div>Avg / Deal: <span class="font-bold text-gray-900">{{ fmtPct(probDecline.lost?.average_decline_per_affected_deal) }}</span></div>
            </div>
          </div>
        </div>

        <!-- 2. CLOSE-DATE PUSH -->
        <div class="border border-gray-200 rounded-lg p-3 space-y-3 bg-white">
          <div class="flex items-center justify-between border-b border-gray-100 pb-2">
            <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Close-Date Pushes</h4>
            <span class="text-[10px] text-gray-500 font-medium">Schedule delay events</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-left text-[11px]">
            <!-- Won -->
            <div class="p-2 rounded bg-emerald-50/50 border border-emerald-100 space-y-1">
              <div class="text-[10px] font-bold text-emerald-800 uppercase">Won Deals</div>
              <div>Affected: <span class="font-bold text-gray-900">{{ fmtVal(datePush.won?.affected_deals) }}</span> ({{ fmtPct(datePush.won?.affected_percentage) }})</div>
              <div>Total Pushes: <span class="font-bold text-gray-900">{{ fmtVal(datePush.won?.total_pushes) }}</span> ({{ fmtDays(datePush.won?.total_days_pushed) }})</div>
              <div>Avg / Deal: <span class="font-bold text-gray-900">{{ fmtDec(datePush.won?.average_pushes_per_deal) }}</span> ({{ fmtDays(datePush.won?.average_days_pushed_per_deal) }})</div>
            </div>
            <!-- Lost -->
            <div class="p-2 rounded bg-rose-50/50 border border-rose-100 space-y-1">
              <div class="text-[10px] font-bold text-rose-800 uppercase">Lost Deals</div>
              <div>Affected: <span class="font-bold text-gray-900">{{ fmtVal(datePush.lost?.affected_deals) }}</span> ({{ fmtPct(datePush.lost?.affected_percentage) }})</div>
              <div>Total Pushes: <span class="font-bold text-gray-900">{{ fmtVal(datePush.lost?.total_pushes) }}</span> ({{ fmtDays(datePush.lost?.total_days_pushed) }})</div>
              <div>Avg / Deal: <span class="font-bold text-gray-900">{{ fmtDec(datePush.lost?.average_pushes_per_deal) }}</span> ({{ fmtDays(datePush.lost?.average_days_pushed_per_deal) }})</div>
            </div>
          </div>
        </div>

        <!-- 3. REPEAT SLIPPAGE -->
        <div class="border border-gray-200 rounded-lg p-3 space-y-3 bg-white">
          <div class="flex items-center justify-between border-b border-gray-100 pb-2">
            <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Repeat Slippage</h4>
            <span class="text-[10px] text-gray-500 font-medium">≥ 2 close date pushes</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-left text-[11px]">
            <!-- Won -->
            <div class="p-2 rounded bg-emerald-50/50 border border-emerald-100 space-y-1">
              <div class="text-[10px] font-bold text-emerald-800 uppercase">Won Deals</div>
              <div>Affected: <span class="font-bold text-gray-900">{{ fmtVal(repeatSlip.won?.affected_deals) }}</span></div>
              <div>Percentage: <span class="font-bold text-gray-900">{{ fmtPct(repeatSlip.won?.affected_percentage) }}</span></div>
            </div>
            <!-- Lost -->
            <div class="p-2 rounded bg-rose-50/50 border border-rose-100 space-y-1">
              <div class="text-[10px] font-bold text-rose-800 uppercase">Lost Deals</div>
              <div>Affected: <span class="font-bold text-gray-900">{{ fmtVal(repeatSlip.lost?.affected_deals) }}</span></div>
              <div>Percentage: <span class="font-bold text-gray-900">{{ fmtPct(repeatSlip.lost?.affected_percentage) }}</span></div>
            </div>
          </div>
        </div>

        <!-- 4. VALUE CONTRACTION -->
        <div class="border border-gray-200 rounded-lg p-3 space-y-3 bg-white">
          <div class="flex items-center justify-between border-b border-gray-100 pb-2">
            <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Value Contraction</h4>
            <span class="text-[10px] text-gray-500 font-medium">Negative deal value revisions</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-left text-[11px]">
            <!-- Won -->
            <div class="p-2 rounded bg-emerald-50/50 border border-emerald-100 space-y-1">
              <div class="text-[10px] font-bold text-emerald-800 uppercase">Won Deals</div>
              <div>Affected: <span class="font-bold text-gray-900">{{ fmtVal(valContract.won?.affected_deals) }}</span> ({{ fmtPct(valContract.won?.affected_percentage) }})</div>
              <div>Total Contraction: <span class="font-bold text-gray-900">{{ fmtCurr(valContract.won?.total_contraction_amount) }}</span></div>
              <div>Avg / Deal: <span class="font-bold text-gray-900">{{ fmtCurr(valContract.won?.average_contraction_per_affected_deal) }}</span></div>
            </div>
            <!-- Lost -->
            <div class="p-2 rounded bg-rose-50/50 border border-rose-100 space-y-1">
              <div class="text-[10px] font-bold text-rose-800 uppercase">Lost Deals</div>
              <div>Affected: <span class="font-bold text-gray-900">{{ fmtVal(valContract.lost?.affected_deals) }}</span> ({{ fmtPct(valContract.lost?.affected_percentage) }})</div>
              <div>Total Contraction: <span class="font-bold text-gray-900">{{ fmtCurr(valContract.lost?.total_contraction_amount) }}</span></div>
              <div>Avg / Deal: <span class="font-bold text-gray-900">{{ fmtCurr(valContract.lost?.average_contraction_per_affected_deal) }}</span></div>
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

const loading = computed(() => store.loadingLossOutcomeCorrelationAnalytics)
const error = computed(() => store.lossOutcomeCorrelationAnalyticsError)
const data = computed(() => store.lossOutcomeCorrelationAnalytics)

const summary = computed(() => data.value?.summary)
const correlations = computed(() => data.value?.correlations)

const probDecline = computed(() => correlations.value?.probability_decline || { won: {}, lost: {} })
const datePush = computed(() => correlations.value?.close_date_push || { won: {}, lost: {} })
const repeatSlip = computed(() => correlations.value?.repeat_slippage || { won: {}, lost: {} })
const valContract = computed(() => correlations.value?.value_contraction || { won: {}, lost: {} })

function fmtVal(val) {
  if (val === null || val === undefined) return 'Not measured'
  return String(val)
}

function fmtDec(val) {
  if (val === null || val === undefined) return 'Not measured'
  return Number(val).toFixed(1)
}

function fmtPct(val) {
  if (val === null || val === undefined) return 'Not measured'
  return `${Number(val).toFixed(1)}%`
}

function fmtDays(val) {
  if (val === null || val === undefined) return 'Not measured'
  return `${Number(val).toFixed(1)}d`
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
