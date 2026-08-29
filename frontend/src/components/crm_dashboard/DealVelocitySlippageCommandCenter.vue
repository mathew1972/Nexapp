<template>
  <div class="sf-card p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <span>Deal Velocity & Slippage Command Center</span>
        </h3>
        <p class="text-[11px] text-gray-500">Deterministic risk assessment, schedule slippage, stage stagnation, and exposure analysis</p>
      </div>
      <span class="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
        {{ summary?.total_active_deals || 0 }} Active Opportunities
      </span>
    </div>

    <!-- Loading Skeleton State -->
    <div v-if="loading" class="space-y-3">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div v-for="i in 6" :key="i" class="h-16 bg-gray-50 animate-pulse rounded-lg"></div>
      </div>
      <div class="h-48 bg-gray-50 animate-pulse rounded-lg"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
      Unable to load Deal Velocity & Slippage analytics. ({{ error }})
    </div>

    <!-- Empty State -->
    <div v-else-if="!summary || totalActiveDeals === 0" class="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
      No deals match the current scope and period.
    </div>

    <!-- Main Content Panel -->
    <div v-else class="space-y-4">
      <!-- SECTION 1: EXECUTIVE KPI STRIP -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
        <div class="p-2 rounded bg-amber-50/70 border border-amber-200/60">
          <div class="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">Deals Slipped</div>
          <div class="text-base font-extrabold text-amber-900">{{ summary?.total_slipped_deals || 0 }}</div>
          <div class="text-[10px] text-amber-600 font-medium">Schedule revised</div>
        </div>

        <div class="p-2 rounded bg-rose-50/70 border border-rose-200/60">
          <div class="text-[10px] text-rose-700 font-semibold uppercase tracking-wider">Repeat Slippage</div>
          <div class="text-base font-extrabold text-rose-900">{{ summary?.repeat_slippage_deals || 0 }}</div>
          <div class="text-[10px] text-rose-600 font-medium">≥ 2 close date pushes</div>
        </div>

        <div class="p-2 rounded bg-purple-50/70 border border-purple-200/60">
          <div class="text-[10px] text-purple-700 font-semibold uppercase tracking-wider">Stage Stagnation</div>
          <div class="text-base font-extrabold text-purple-900">{{ summary?.stagnant_deals || 0 }}</div>
          <div class="text-[10px] text-purple-600 font-medium">> 30 days in stage</div>
        </div>

        <div class="p-2 rounded bg-blue-50/70 border border-blue-200/60">
          <div class="text-[10px] text-blue-700 font-semibold uppercase tracking-wider">Days Pushed</div>
          <div class="text-base font-extrabold text-blue-900">+{{ summary?.total_positive_days_pushed || 0 }}d</div>
          <div class="text-[10px] text-blue-600 font-medium">Pull forward: {{ summary?.total_days_pulled_forward || 0 }}d</div>
        </div>

        <div class="p-2 rounded bg-red-50/70 border border-red-200/60">
          <div class="text-[10px] text-red-700 font-semibold uppercase tracking-wider">High-Risk Deals</div>
          <div class="text-base font-extrabold text-red-900">{{ summary?.high_risk_deals || 0 }}</div>
          <div class="text-[10px] text-red-600 font-medium">Risk score ≥ 60</div>
        </div>

        <div class="p-2 rounded bg-emerald-50/70 border border-emerald-200/60">
          <div class="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">High-Risk Exposure</div>
          <div class="text-base font-extrabold text-emerald-900">{{ fmtCurr(summary?.high_risk_value_exposure) }}</div>
          <div class="text-[10px] text-emerald-600 font-medium">{{ summary?.high_value_slippage_deals || 0 }} high-val slipped</div>
        </div>
      </div>

      <!-- SECTION 2: RISK TRIAGE FILTERS -->
      <div class="flex items-center justify-between border-b border-gray-200 pb-2">
        <div class="flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <button
            v-for="filter in triageFilters"
            :key="filter.id"
            @click="activeFilter = filter.id"
            :class="[
              'px-2.5 py-1 rounded-full font-medium transition-colors whitespace-nowrap',
              activeFilter === filter.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
          >
            {{ filter.label }}
            <span class="ml-1 text-[10px] opacity-75">({{ filter.count }})</span>
          </button>
        </div>
        <span class="text-[11px] text-gray-500 shrink-0 font-medium ml-2">
          Showing {{ filteredDeals.length }} of {{ dealMatrix.length }} deals
        </span>
      </div>

      <!-- SECTION 3: RISK TABLE -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[11px]">
          <thead>
            <tr class="text-gray-400 border-b border-gray-200 pb-1 uppercase tracking-wider text-[10px]">
              <th class="font-semibold py-1.5">Deal / Org</th>
              <th class="font-semibold py-1.5">Owner</th>
              <th class="font-semibold py-1.5">Stage</th>
              <th class="font-semibold text-right py-1.5">Value</th>
              <th class="font-semibold text-center py-1.5">Pushes</th>
              <th class="font-semibold text-right py-1.5">Cum. Push</th>
              <th class="font-semibold text-right py-1.5">Dwell</th>
              <th class="font-semibold text-right py-1.5">Prob. Shift</th>
              <th class="font-semibold text-right py-1.5">Val. Shift</th>
              <th class="font-semibold text-center py-1.5">Risk Level</th>
              <th class="font-semibold py-1.5 pl-3">Deterministic Risk Factors</th>
              <th class="font-semibold text-center py-1.5">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-150 text-gray-800">
            <tr v-if="filteredDeals.length === 0">
              <td colspan="12" class="py-4 text-center text-gray-400 italic">
                No deals match the selected triage filter.
              </td>
            </tr>
            <tr v-for="d in filteredDeals" :key="d.deal_id" class="hover:bg-gray-50/80 transition-colors">
              <!-- Deal / Org -->
              <td class="py-2 font-bold text-gray-900">
                <div>{{ d.deal_title }}</div>
                <div class="text-[10px] text-gray-400 font-normal">{{ d.organization || '—' }}</div>
              </td>

              <!-- Owner -->
              <td class="py-2 text-gray-600 font-medium">
                {{ d.owner }}
              </td>

              <!-- Stage -->
              <td class="py-2">
                <span class="px-1.5 py-0.5 rounded bg-gray-100 font-medium text-gray-700 text-[10px]">
                  {{ d.stage }}
                </span>
              </td>

              <!-- Value -->
              <td class="py-2 text-right font-extrabold text-gray-900">
                {{ fmtCurr(d.deal_value) }}
              </td>

              <!-- Pushes -->
              <td class="py-2 text-center">
                <span
                  v-if="d.close_date_push_count > 0"
                  :class="[
                    'px-1.5 py-0.5 rounded font-bold text-[10px]',
                    d.close_date_push_count >= 2 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  ]"
                >
                  {{ d.close_date_push_count }}x
                </span>
                <span v-else class="text-gray-400">—</span>
              </td>

              <!-- Cumulative Push -->
              <td class="py-2 text-right">
                <span v-if="d.cumulative_days_pushed > 0" class="font-bold text-amber-700">+{{ d.cumulative_days_pushed }}d</span>
                <span v-else-if="d.days_pulled_forward > 0" class="font-bold text-emerald-700">-{{ d.days_pulled_forward }}d</span>
                <span v-else class="text-gray-400">—</span>
              </td>

              <!-- Dwell -->
              <td class="py-2 text-right">
                <span v-if="d.current_stage_dwell_days !== null" :class="d.current_stage_dwell_days > 30 ? 'font-bold text-purple-700' : 'text-gray-700'">
                  {{ d.current_stage_dwell_days }}d
                </span>
                <span v-else class="text-gray-400 italic text-[10px]">Not measured</span>
              </td>

              <!-- Prob. Shift -->
              <td class="py-2 text-right font-medium">
                <span v-if="d.net_probability_change < 0" class="font-bold text-red-700">{{ formatPp(d.net_probability_change) }}</span>
                <span v-else-if="d.net_probability_change > 0" class="font-bold text-emerald-700">{{ formatPp(d.net_probability_change) }}</span>
                <span v-else class="text-gray-400">—</span>
              </td>

              <!-- Val. Shift -->
              <td class="py-2 text-right font-medium">
                <span v-if="d.net_value_change < 0" class="font-bold text-red-700">{{ fmtCurr(d.net_value_change) }}</span>
                <span v-else-if="d.net_value_change > 0" class="font-bold text-emerald-700">+{{ fmtCurr(d.net_value_change) }}</span>
                <span v-else class="text-gray-400">—</span>
              </td>

              <!-- Risk Level (Visual Tier Tag) -->
              <td class="py-2 text-center">
                <span :class="['px-2 py-0.5 rounded-full font-bold text-[10px]', getRiskTier(d.deterministic_risk_score).bgClass]">
                  {{ getRiskTier(d.deterministic_risk_score).label }} ({{ d.deterministic_risk_score }})
                </span>
              </td>

              <!-- Deterministic Risk Factors -->
              <td class="py-2 pl-3">
                <div v-if="d.risk_factors && d.risk_factors.length > 0" class="flex flex-wrap gap-1">
                  <span
                    v-for="(rf, idx) in d.risk_factors"
                    :key="idx"
                    class="px-1.5 py-0.2 rounded bg-red-50 text-red-700 border border-red-200 text-[9px] font-medium"
                  >
                    {{ rf }}
                  </span>
                </div>
                <div v-else class="text-[10px] text-gray-400 italic">
                  No deterministic risk factors recorded
                </div>
              </td>

              <!-- Actions -->
              <td class="py-2 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button
                    @click.stop="triggerAction(d, 'CREATE_REVIEW_TASK')"
                    type="button"
                    class="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[9px] font-bold transition-colors"
                    title="Request Executive Review"
                  >
                    Review
                  </button>
                  <button
                    @click.stop="triggerAction(d, 'CREATE_FOLLOWUP_ACTIVITY')"
                    type="button"
                    class="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[9px] font-bold transition-colors"
                    title="Create Follow-up Task"
                  >
                    Follow-up
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'
import ActionConfirmationDrawer from './ActionConfirmationDrawer.vue'

const store = useCrmDashboardStore()

const drawerOpen = ref(false)
const selectedActionType = ref('CREATE_REVIEW_TASK')
const selectedDealId = ref('')
const selectedDealContext = ref('')
const selectedWhyFlagged = ref('')

const summary = computed(() => store.dealVelocitySlippageCommandCenter?.summary || {})
const dealMatrix = computed(() => store.dealVelocitySlippageCommandCenter?.deal_matrix || [])
const loading = computed(() => store.loadingDealVelocitySlippageCommandCenter)
const error = computed(() => store.dealVelocitySlippageCommandCenterError)

function triggerAction(deal, actionType) {
  selectedDealId.value = deal.deal_id
  selectedActionType.value = actionType
  selectedDealContext.value = `Organization: ${deal.organization || '—'} • Stage: ${deal.stage} • Value: ${fmtCurr(deal.deal_value)}`
  selectedWhyFlagged.value = deal.risk_factors && deal.risk_factors.length > 0
    ? deal.risk_factors.join(', ')
    : `Deterministic Risk Score: ${deal.deterministic_risk_score}`
  drawerOpen.value = true
}

function onActionSuccess() {
  drawerOpen.value = false
}

const totalActiveDeals = computed(() => summary.value?.total_active_deals || 0)

const activeFilter = ref('all')

const triageFilters = computed(() => {
  const matrix = dealMatrix.value
  return [
    { id: 'all', label: 'All Deals', count: matrix.length },
    { id: 'slipped', label: 'Slipped Deals', count: matrix.filter(d => d.close_date_push_count > 0).length },
    { id: 'repeat', label: 'Repeat Slippage (≥2)', count: matrix.filter(d => d.close_date_push_count >= 2).length },
    { id: 'stagnant', label: 'Stage Stagnant (>30d)', count: matrix.filter(d => d.current_stage_dwell_days !== null && d.current_stage_dwell_days > 30).length },
    { id: 'prob_decline', label: 'Prob. Decline', count: matrix.filter(d => d.net_probability_change < 0).length },
    { id: 'val_contraction', label: 'Value Contraction', count: matrix.filter(d => d.net_value_change < 0).length },
    { id: 'high_risk', label: 'High Risk (≥60)', count: matrix.filter(d => d.deterministic_risk_score >= 60).length },
  ]
})

const filteredDeals = computed(() => {
  let list = [...dealMatrix.value]

  switch (activeFilter.value) {
    case 'slipped':
      list = list.filter(d => d.close_date_push_count > 0)
      break
    case 'repeat':
      list = list.filter(d => d.close_date_push_count >= 2)
      break
    case 'stagnant':
      list = list.filter(d => d.current_stage_dwell_days !== null && d.current_stage_dwell_days > 30)
      break
    case 'prob_decline':
      list = list.filter(d => d.net_probability_change < 0)
      break
    case 'val_contraction':
      list = list.filter(d => d.net_value_change < 0)
      break
    case 'high_risk':
      list = list.filter(d => d.deterministic_risk_score >= 60)
      break
  }

  // Primary Sort: deterministic_risk_score DESC, Secondary Sort: deal_value DESC
  return list.sort((a, b) => {
    if (b.deterministic_risk_score !== a.deterministic_risk_score) {
      return b.deterministic_risk_score - a.deterministic_risk_score
    }
    return b.deal_value - a.deal_value
  })
})

function getRiskTier(score) {
  if (score >= 80) return { label: 'CRITICAL', bgClass: 'bg-red-100 text-red-800 border border-red-300' }
  if (score >= 60) return { label: 'HIGH', bgClass: 'bg-rose-100 text-rose-800 border border-rose-200' }
  if (score >= 40) return { label: 'ELEVATED', bgClass: 'bg-amber-100 text-amber-800 border border-amber-200' }
  if (score >= 20) return { label: 'MODERATE', bgClass: 'bg-yellow-100 text-yellow-800 border border-yellow-200' }
  return { label: 'LOW', bgClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200' }
}

function fmtCurr(v) {
  if (!v && v !== 0) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

function formatPp(val) {
  if (val === undefined || val === null) return '0.0 pp'
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${val} pp`
}
</script>
