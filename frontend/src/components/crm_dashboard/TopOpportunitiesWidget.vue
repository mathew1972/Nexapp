<template>
  <div class="sf-card p-4">
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="text-sm font-black text-gray-900">Sales Action Queue</h3>
        <p class="text-[11px] text-gray-500">Highest value open deals requiring executive attention</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
          {{ opportunities.length }} Deals
        </span>
      </div>
    </div>

    <div v-if="loading" class="h-40 bg-gray-50 animate-pulse rounded"></div>
    <div v-else-if="opportunities.length === 0" class="py-10 text-center border border-dashed border-gray-200 rounded-lg">
      <div class="text-sm font-bold text-gray-400 mb-1">No Open Opportunities</div>
      <div class="text-xs text-gray-400">There are currently no active deals in this scope.</div>
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs text-left">
        <thead>
          <tr class="text-[10px] uppercase font-black text-gray-400 border-b-2 border-gray-200 bg-gray-50/80">
            <th class="py-2.5 px-2 w-6"></th>
            <th class="py-2.5 px-2">Opportunity / Account</th>
            <th class="py-2.5 px-2">Owner</th>
            <th class="py-2.5 px-2">Stage</th>
            <th class="py-2.5 px-2 text-right">Gross Value</th>
            <th class="py-2.5 px-2 text-right">Weighted</th>
            <th class="py-2.5 px-2 text-center">Prob.</th>
            <th class="py-2.5 px-2 text-right">Age</th>
            <th class="py-2.5 px-2 text-center">Risk</th>
            <th class="py-2.5 px-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr 
            v-for="(deal, idx) in opportunities" 
            :key="deal.deal_id" 
            class="transition-colors group hover:bg-gray-50/80"
            :class="getDealRiskLevel(deal) === 'high' ? 'border-l-2 border-l-red-500' : getDealRiskLevel(deal) === 'medium' ? 'border-l-2 border-l-amber-400' : 'border-l-2 border-l-transparent'"
          >
            <!-- Priority Rank -->
            <td class="py-2.5 px-2">
              <span
                class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black border"
                :class="idx === 0 ? 'bg-blue-600 text-white border-blue-600' : idx === 1 ? 'bg-blue-100 text-blue-800 border-blue-200' : idx === 2 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-200'"
              >{{ idx + 1 }}</span>
            </td>
            <!-- Opportunity / Account -->
            <td class="py-2.5 px-2 cursor-pointer" @click="openDeal(deal.deal_id)">
              <div class="font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                <span>{{ deal.deal_id }}</span>
                <svg class="w-3 h-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <div class="text-[10px] text-gray-400 font-medium">{{ deal.organization }}</div>
            </td>
            <!-- Owner -->
            <td class="py-2.5 px-2 text-gray-600 font-medium cursor-pointer" @click="openDeal(deal.deal_id)">
              {{ deal.owner }}
            </td>
            <!-- Stage -->
            <td class="py-2.5 px-2 cursor-pointer" @click="openDeal(deal.deal_id)">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                {{ deal.stage }}
              </span>
            </td>
            <!-- Gross Value -->
            <td class="py-2.5 px-2 text-right font-extrabold text-gray-900 cursor-pointer" @click="openDeal(deal.deal_id)">
              {{ fmtCurr(deal.gross_value) }}
            </td>
            <!-- Weighted -->
            <td class="py-2.5 px-2 text-right font-bold text-blue-600 cursor-pointer" @click="openDeal(deal.deal_id)">
              {{ fmtCurr(deal.weighted_value) }}
            </td>
            <!-- Probability -->
            <td class="py-2.5 px-2 text-center cursor-pointer" @click="openDeal(deal.deal_id)">
              <span
                class="px-2 py-0.5 rounded text-[10px] font-bold border"
                :class="deal.probability >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : deal.probability >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'"
              >
                {{ deal.probability }}%
              </span>
            </td>
            <!-- Age -->
            <td class="py-2.5 px-2 text-right cursor-pointer" @click="openDeal(deal.deal_id)">
              <span class="font-bold" :class="deal.age_days > 45 ? 'text-red-600' : deal.age_days > 21 ? 'text-amber-600' : 'text-gray-500'">
                {{ deal.age_days }}d
              </span>
            </td>
            <!-- Risk Indicator -->
            <td class="py-2.5 px-2 text-center cursor-pointer" @click="openDeal(deal.deal_id)">
              <span v-if="getDealRiskLevel(deal) === 'high'" class="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">⚠ HIGH</span>
              <span v-else-if="getDealRiskLevel(deal) === 'medium'" class="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">WATCH</span>
              <span v-else class="text-[10px] font-medium text-gray-400">—</span>
            </td>
            <!-- Action -->
            <td class="py-2.5 px-2 text-center">
              <button
                @click.stop="triggerFollowup(deal)"
                type="button"
                class="text-[10px] font-bold text-gray-400 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-all duration-150 group-hover:text-blue-600"
                title="Create follow-up task"
              >
                Follow-up →
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Action Drawer -->
    <ActionConfirmationDrawer
      :is-open="drawerOpen"
      action-type="CREATE_FOLLOWUP_ACTIVITY"
      target-doctype="CRM Deal"
      :target-id="selectedDealId"
      :extra-context="selectedDealContext"
      @close="drawerOpen = false"
      @success="onActionSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ActionConfirmationDrawer from './ActionConfirmationDrawer.vue'

const props = defineProps({
  opportunitiesData: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false }
})

const drawerOpen = ref(false)
const selectedDealId = ref('')
const selectedDealContext = ref('')

const opportunities = computed(() => {
  return props.opportunitiesData?.opportunities || []
})

function getDealRiskLevel(deal) {
  if (deal.age_days > 45 || deal.probability < 30) return 'high'
  if (deal.age_days > 21 || deal.probability < 50) return 'medium'
  return 'low'
}

function triggerFollowup(deal) {
  selectedDealId.value = deal.deal_id
  selectedDealContext.value = `Organization: ${deal.organization} • Stage: ${deal.stage} • Value: ${fmtCurr(deal.gross_value)}`
  drawerOpen.value = true
}

function onActionSuccess() {
  drawerOpen.value = false
}

function openDeal(dealId) {
  if (!dealId) return
  if (window.frappe?.set_route) {
    window.frappe.set_route('Form', 'CRM Deal', dealId)
  } else {
    window.open(`/crm/deals/${dealId}`, '_blank')
  }
}

function fmtCurr(v) {
  if (!v && v !== 0) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}
</script>
