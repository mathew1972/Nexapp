<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden bg-gray-900/50 backdrop-blur-xs flex justify-end transition-opacity duration-200">
    <div
      class="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"
      @click.stop
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-blue-100 text-blue-700 rounded-lg font-bold text-sm">
            🏢
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900 leading-tight">
              {{ account?.account_name }}
            </h2>
            <div class="flex items-center space-x-2 mt-0.5">
              <span
                class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border"
                :class="badgeClass(account?.attention_level)"
              >
                {{ account?.attention_level }}
              </span>
              <span class="text-xs text-gray-500 font-medium">
                {{ account?.active_deal_count }} Active Deal(s)
              </span>
            </div>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Drawer Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- 1. Key Metrics Exposure Grid -->
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-blue-50/60 border border-blue-100 p-3 rounded-lg">
            <span class="text-[11px] font-medium text-blue-700 uppercase tracking-wider block">Active Pipeline</span>
            <span class="text-base font-extrabold text-blue-900 block mt-1">{{ fmtCurr(account?.active_pipeline_value) }}</span>
          </div>
          <div class="bg-purple-50/60 border border-purple-100 p-3 rounded-lg">
            <span class="text-[11px] font-medium text-purple-700 uppercase tracking-wider block">Weighted Pipeline</span>
            <span class="text-base font-extrabold text-purple-900 block mt-1">{{ fmtCurr(account?.weighted_pipeline_value) }}</span>
          </div>
          <div class="bg-red-50/60 border border-red-100 p-3 rounded-lg">
            <span class="text-[11px] font-medium text-red-700 uppercase tracking-wider block">High-Risk Exposure</span>
            <span class="text-base font-extrabold text-red-900 block mt-1">{{ fmtCurr(account?.high_risk_value_exposure) }}</span>
          </div>
        </div>

        <!-- 2. Risk & Operational Evidence Signals -->
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <span>🔍 Factual Risk Evidence</span>
          </h4>
          <ul class="space-y-1.5">
            <li
              v-for="(reason, idx) in account?.evidence_reasons"
              :key="idx"
              class="text-xs text-gray-700 flex items-start space-x-2"
            >
              <span class="text-amber-500 font-bold">•</span>
              <span>{{ reason }}</span>
            </li>
          </ul>
        </div>

        <!-- 3. Active Deals Breakdown Table -->
        <div>
          <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            Active Deals Portfolio ({{ account?.deals?.length || 0 }})
          </h4>
          <div v-if="!account?.deals || account?.deals.length === 0" class="text-center py-6 text-xs text-gray-400 border border-dashed rounded-lg">
            No active deals currently open for this account.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="d in account.deals"
              :key="d.deal_id"
              class="border rounded-lg p-3.5 hover:border-blue-300 transition-colors shadow-2xs"
              :class="d.is_high_risk ? 'bg-red-50/30 border-red-200' : 'bg-white border-gray-200'"
            >
              <div class="flex items-start justify-between">
                <div>
                  <a
                    @click.prevent="openRecord('CRM Deal', d.deal_id)"
                    class="text-xs font-bold text-blue-600 hover:underline cursor-pointer block"
                  >
                    {{ d.deal_id }}
                  </a>
                  <span class="text-xs text-gray-500 font-medium mt-0.5 block">Owner: {{ d.owner_name }}</span>
                </div>
                <div class="text-right">
                  <span class="text-sm font-bold text-gray-900 block">{{ fmtCurr(d.deal_value) }}</span>
                  <span class="text-[10px] font-semibold text-gray-500 block">{{ d.probability }}% prob</span>
                </div>
              </div>

              <!-- Deal Details Row -->
              <div class="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-100 text-[11px]">
                <span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">{{ d.status }}</span>
                <span class="text-gray-400">•</span>
                <span class="text-gray-500">Age: {{ d.deal_age_days }}d</span>
                <span class="text-gray-400">•</span>
                <span class="text-gray-500">Dwell: {{ d.days_since_modified }}d</span>
                <span v-if="d.is_high_risk" class="ml-auto px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                  Risk Score {{ d.risk_score }}
                </span>
              </div>

              <!-- Deal Risk Reasons -->
              <div v-if="d.risk_reasons && d.risk_reasons.length > 0" class="mt-2 space-y-1">
                <div v-for="(rr, rIdx) in d.risk_reasons" :key="rIdx" class="text-[10px] text-red-600 font-medium flex items-center gap-1">
                  <span>⚠️</span> {{ rr }}
                </div>
              </div>

              <!-- Actions Bar -->
              <div class="mt-3 pt-2 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button
                  @click="triggerAction('CREATE_FOLLOWUP_ACTIVITY', 'CRM Deal', d.deal_id)"
                  class="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                >
                  + Follow-Up Task
                </button>
                <button
                  @click="triggerAction('CREATE_REVIEW_TASK', 'CRM Deal', d.deal_id)"
                  class="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                >
                  + Management Review
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  account: { type: Object, default: null }
})

const emit = defineEmits(['close', 'trigger-action'])

function fmtCurr(v) {
  if (v === null || v === undefined) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

function badgeClass(level) {
  if (level === 'CRITICAL') return 'bg-red-100 text-red-800 border-red-200'
  if (level === 'HIGH_RISK') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-green-100 text-green-800 border-green-200'
}

function openRecord(doctype, name) {
  if (window.frappe && window.frappe.set_route) {
    window.frappe.set_route('Form', doctype, name)
  }
}

function triggerAction(actionType, doctype, id) {
  emit('trigger-action', { actionType, doctype, id })
}
</script>
