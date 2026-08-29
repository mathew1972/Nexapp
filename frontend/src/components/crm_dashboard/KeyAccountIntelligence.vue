<template>
  <div class="space-y-4">
    <!-- Account Health Band -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="sf-card p-3 border-l-2 border-l-red-500">
        <div class="text-[10px] font-black text-gray-400 uppercase tracking-wider">Critical Accounts</div>
        <div class="text-xl font-black text-gray-900 mt-0.5">{{ summary?.critical_accounts || 0 }}</div>
        <div class="text-[10px] text-gray-400">of {{ summary?.total_accounts || 0 }} require intervention</div>
      </div>
      <div class="sf-card p-3 border-l-2 border-l-amber-500">
        <div class="text-[10px] font-black text-gray-400 uppercase tracking-wider">High-Risk Exposure</div>
        <div class="text-xl font-black text-gray-900 mt-0.5">{{ fmtCurr(summary?.total_high_risk_exposure) }}</div>
        <div class="text-[10px] text-gray-400">Pipeline at risk (score ≥60)</div>
      </div>
      <div class="sf-card p-3 border-l-2 border-l-blue-500">
        <div class="text-[10px] font-black text-gray-400 uppercase tracking-wider">Active Pipeline</div>
        <div class="text-xl font-black text-gray-900 mt-0.5">{{ fmtCurr(summary?.total_active_pipeline) }}</div>
        <div class="text-[10px] text-gray-400">{{ summary?.total_active_deals || 0 }} open deals</div>
      </div>
      <div class="sf-card p-3 border-l-2 border-l-emerald-500">
        <div class="text-[10px] font-black text-gray-400 uppercase tracking-wider">Healthy Accounts</div>
        <div class="text-xl font-black text-gray-900 mt-0.5">{{ summary?.healthy_accounts || 0 }}</div>
        <div class="text-[10px] text-gray-400">On track</div>
      </div>
    </div>

    <!-- Main Key Accounts Table Card -->
    <div class="sf-card p-4">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-sm font-black text-gray-900">Strategic Account Risk Board</h3>
          <p class="text-[11px] text-gray-500">Account-level risk exposure, pipeline concentration, and management evidence</p>
        </div>
        <div class="text-xs font-extrabold text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200">
          {{ accounts?.length || 0 }} Accounts
        </div>
      </div>

      <div v-if="loading" class="h-40 bg-gray-50 animate-pulse rounded-lg flex items-center justify-center text-xs text-gray-400">
        Loading Key Account Intelligence...
      </div>
      <div v-else-if="!accounts || accounts.length === 0" class="py-12 text-center text-xs text-gray-400 border border-dashed rounded-lg">
        No account data available for selected scope.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="border-b-2 border-gray-200 bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-wider">
              <th class="py-2.5 px-3">Account</th>
              <th class="py-2.5 px-3">Attention</th>
              <th class="py-2.5 px-3 text-center">Deals</th>
              <th class="py-2.5 px-3">Pipeline Exposure</th>
              <th class="py-2.5 px-3 text-right">Weighted</th>
              <th class="py-2.5 px-3 text-right">Risk Exposure</th>
              <th class="py-2.5 px-3">Risk Signal</th>
              <th class="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="acc in accounts"
              :key="acc.account_name"
              class="hover:bg-blue-50/40 transition-colors group cursor-pointer"
              @click="selectAccount(acc)"
            >
              <!-- Account Name -->
              <td class="py-3 px-3 font-semibold" :class="acc.account_name === 'Individual / Unassigned' ? 'text-gray-400 italic' : 'text-gray-900'">
                <div class="flex items-center space-x-2">
                  <a
                    v-if="acc.organization_id && acc.account_name !== 'Individual / Unassigned'"
                    @click.stop.prevent="openAccountRecord(acc.organization_id)"
                    class="text-blue-600 hover:underline font-bold"
                  >
                    {{ acc.account_name }}
                  </a>
                  <span v-else>{{ acc.account_name }}</span>
                </div>
              </td>

              <!-- Attention Level Badge -->
              <td class="py-3 px-3">
                <span
                  class="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border"
                  :class="badgeClass(acc.attention_level)"
                >
                  {{ acc.attention_level }}
                </span>
              </td>

              <!-- Active Deals -->
              <td class="py-3 px-3 text-center">
                <span class="font-bold text-gray-800">{{ acc.active_deal_count }}</span>
                <span v-if="acc.high_risk_deal_count > 0" class="text-red-600 font-bold text-[10px] block">
                  {{ acc.high_risk_deal_count }} risky
                </span>
              </td>

              <!-- Open Pipeline with Exposure Bar -->
              <td class="py-3 px-3">
                <div class="text-right font-extrabold text-gray-900 text-xs">{{ fmtCurr(acc.active_pipeline_value) }}</div>
                <div class="mt-1 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="acc.attention_level === 'CRITICAL' ? 'bg-red-500' : acc.attention_level === 'HIGH_RISK' ? 'bg-amber-500' : 'bg-blue-500'"
                    :style="{ width: `${getExposurePct(acc.active_pipeline_value)}%` }"
                  ></div>
                </div>
              </td>

              <!-- Weighted Pipeline -->
              <td class="py-3 px-3 text-right font-bold text-blue-600">
                {{ fmtCurr(acc.weighted_pipeline_value) }}
              </td>

              <!-- High Risk Exposure -->
              <td class="py-3 px-3 text-right font-bold" :class="acc.high_risk_value_exposure > 0 ? 'text-red-600 font-extrabold' : 'text-gray-400'">
                {{ fmtCurr(acc.high_risk_value_exposure) }}
              </td>

              <!-- Primary Risk Signal Evidence -->
              <td class="py-3 px-3 text-gray-600">
                <div v-if="acc.evidence_reasons && acc.evidence_reasons.length > 0" class="text-[11px] space-y-0.5">
                  <span class="font-medium text-gray-800">{{ acc.evidence_reasons[0] }}</span>
                  <span v-if="acc.evidence_reasons.length > 1" class="text-[10px] text-gray-400 block">
                    +{{ acc.evidence_reasons.length - 1 }} more signal(s)
                  </span>
                </div>
                <span v-else class="text-gray-400 italic text-[11px]">No risk signals</span>
              </td>

              <!-- Action Button -->
              <td class="py-3 px-3 text-right" @click.stop>
                <button
                  @click="selectAccount(acc)"
                  class="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 text-gray-700 hover:bg-blue-600 hover:text-white rounded border border-gray-200 transition-colors shadow-2xs"
                >
                  Review Account
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Progressive Disclosure Account Detail Drawer -->
    <AccountDetailDrawer
      :is-open="isDrawerOpen"
      :account="selectedAccountData"
      @close="isDrawerOpen = false"
      @trigger-action="handleActionFromDrawer"
    />
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import AccountDetailDrawer from './AccountDetailDrawer.vue'

const props = defineProps({
  accounts: { type: Array, default: () => [] },
  summary: { type: Object, default: () => null },
  meta: { type: Object, default: () => null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null }
})

const emit = defineEmits(['trigger-action'])

const isDrawerOpen = ref(false)
const selectedAccountData = ref(null)

function selectAccount(acc) {
  selectedAccountData.value = acc
  isDrawerOpen.value = true
}

function openAccountRecord(orgName) {
  if (window.frappe && window.frappe.set_route) {
    window.frappe.set_route('Form', 'CRM Organization', orgName)
  }
}

function handleActionFromDrawer(payload) {
  emit('trigger-action', payload)
}

function fmtCurr(v) {
  if (v === null || v === undefined) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

function getExposurePct(val) {
  const maxPipeline = Math.max(...(props.accounts || []).map(a => a.active_pipeline_value || 0), 1)
  return Math.min(100, Math.max(3, ((val || 0) / maxPipeline) * 100))
}

function badgeClass(level) {
  if (level === 'CRITICAL') return 'bg-red-100 text-red-800 border-red-200'
  if (level === 'HIGH_RISK') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-green-100 text-green-800 border-green-200'
}
</script>
