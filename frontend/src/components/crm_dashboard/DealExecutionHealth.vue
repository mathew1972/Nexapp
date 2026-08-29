<template>
  <div class="sf-card p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <span>Deal Execution Health & Management Attention</span>
        </h3>
        <p class="text-[11px] text-gray-500">Operational deal execution risks, inactivity alerts, task backlogs, and recommended management actions</p>
      </div>
      <span class="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
        {{ summary?.open_deals || 0 }} Active Opportunities
      </span>
    </div>

    <!-- Loading Skeleton State -->
    <div v-if="loading" class="h-36 bg-gray-50 animate-pulse rounded-lg"></div>

    <!-- Empty State -->
    <div v-else-if="!summary || deals.length === 0" class="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
      No open opportunities available for execution health analysis.
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-4">
      <!-- Executive Summary Cards Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 text-center">
        <div class="p-2 rounded bg-red-50/70 border border-red-200/60">
          <div class="text-[10px] text-red-700 font-semibold uppercase tracking-wider">Critical Execution Risk</div>
          <div class="text-base font-extrabold text-red-800">{{ summary?.critical_deals || 0 }} Deals</div>
          <div class="text-[10px] text-red-600 mt-0.5 font-medium">Overdue tasks / Inactive</div>
        </div>
        <div class="p-2 rounded bg-amber-50/70 border border-amber-200/60">
          <div class="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">At Risk Opportunities</div>
          <div class="text-base font-extrabold text-amber-800">{{ summary?.at_risk_deals || 0 }} Deals</div>
          <div class="text-[10px] text-amber-600 mt-0.5 font-medium">Attention required</div>
        </div>
        <div class="p-2 rounded bg-gray-50 border border-gray-200">
          <div class="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Stale Opportunities</div>
          <div class="text-base font-bold text-gray-800">{{ summary?.stale_deals || 0 }} Deals</div>
          <div class="text-[10px] text-gray-600 mt-0.5 font-medium">{{ fmtCurr(summary?.stale_deal_value) }} pipeline</div>
        </div>
        <div class="p-2 rounded bg-purple-50/70 border border-purple-200/60">
          <div class="text-[10px] text-purple-700 font-semibold uppercase tracking-wider">No Customer Contact</div>
          <div class="text-base font-bold text-purple-800">{{ summary?.no_recent_engagement || 0 }} Deals</div>
          <div class="text-[10px] text-purple-600 mt-0.5 font-medium">≥ 14 days silent</div>
        </div>
      </div>

      <!-- High Priority Deal Execution Risks List -->
      <div class="space-y-3 pt-1">
        <h4 class="text-xs font-bold text-gray-800 flex items-center justify-between">
          <span>Priority Deals Requiring Management Intervention</span>
          <span class="text-[11px] text-gray-500 font-normal">Sorted by deal value & risk</span>
        </h4>

        <div
          v-for="deal in topRiskDeals"
          :key="deal.deal_id"
          class="p-3 border rounded-lg bg-gray-50/40 space-y-2 hover:border-gray-300 transition-colors"
          :class="getCardBorderClass(deal.risk_status)"
        >
          <!-- Line 1: Deal Title, Owner, Value & Status Badge -->
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span
                @click="openDeal(deal.deal_id)"
                class="text-xs font-bold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{{ deal.deal_title }}</span>
                <svg class="w-3 h-3 text-gray-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </span>
              <span class="text-[10px] text-gray-500 font-medium">
                ({{ deal.organization }})
              </span>
              <span class="text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase border" :class="getStatusBadgeClass(deal.risk_status)">
                {{ deal.risk_status }}
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="text-gray-500">Rep: <b class="text-gray-800">{{ deal.owner }}</b></span>
              <span class="text-gray-500">Stage: <b class="text-gray-800">{{ deal.stage }}</b></span>
              <span class="font-extrabold text-gray-900">{{ fmtCurr(deal.deal_value) }}</span>
            </div>
          </div>

          <!-- Line 2: Evidence Metrics -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] py-1.5 px-2 bg-white rounded border border-gray-150">
            <div>
              <span class="text-gray-400">Deal Age:</span>
              <b class="text-gray-700 ml-1">{{ deal.deal_age_days }} days</b>
            </div>
            <div>
              <span class="text-gray-400">Inactivity Dwell:</span>
              <b :class="deal.is_stale ? 'text-red-700' : 'text-gray-700'" class="ml-1">{{ deal.days_since_modified }} days</b>
            </div>
            <div>
              <span class="text-gray-400">Customer Engagement:</span>
              <b :class="deal.days_since_customer_engagement >= 14 || deal.days_since_customer_engagement === null ? 'text-amber-700' : 'text-gray-700'" class="ml-1">
                {{ deal.days_since_customer_engagement !== null ? `${deal.days_since_customer_engagement}d ago` : 'No Record' }}
              </b>
            </div>
            <div>
              <span class="text-gray-400">Tasks:</span>
              <span class="ml-1 font-semibold">
                <b class="text-green-700">{{ deal.completed_activities }} done</b> /
                <b :class="deal.overdue_activities > 0 ? 'text-red-700 font-bold' : 'text-gray-600'">{{ deal.overdue_activities }} overdue</b>
              </span>
            </div>
          </div>

          <!-- Line 3: Risk Evidence & Actionable Recommendation -->
          <div class="space-y-1 text-[11px]">
            <div class="flex items-start gap-1 text-red-700 font-medium">
              <span class="font-bold shrink-0">Evidence:</span>
              <span class="text-gray-700">{{ deal.risk_reasons?.join(' • ') || 'No elevated risk factors' }}</span>
            </div>
            <div class="flex items-start gap-1 text-blue-900 bg-blue-50/70 p-1.5 rounded border border-blue-100">
              <span class="font-bold text-blue-700 shrink-0">Management Action:</span>
              <span class="font-medium text-blue-900">{{ deal.recommended_action }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { openDeal } from '../../utils/crmDashboardNavigation'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  deals: { type: Array, default: () => [] },
  meta: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const topRiskDeals = computed(() => {
  if (!props.deals || props.deals.length === 0) return []
  // Sort priority: CRITICAL > AT_RISK > WATCH > HEALTHY, then deal_value DESC
  const weight = { CRITICAL: 4, AT_RISK: 3, WATCH: 2, HEALTHY: 1 }
  return [...props.deals].sort((a, b) => {
    const wA = weight[a.risk_status] || 0
    const wB = weight[b.risk_status] || 0
    if (wA !== wB) return wB - wA
    return (b.deal_value || 0) - (a.deal_value || 0)
  }).slice(0, 5)
})

function fmtCurr(v) {
  if (!v && v !== 0) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

function getCardBorderClass(status) {
  switch (status) {
    case 'CRITICAL': return 'border-red-200 bg-red-50/20'
    case 'AT_RISK': return 'border-amber-200 bg-amber-50/20'
    case 'WATCH': return 'border-blue-200 bg-blue-50/20'
    default: return 'border-gray-200 bg-gray-50/20'
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300'
    case 'AT_RISK': return 'bg-amber-100 text-amber-800 border-amber-300'
    case 'WATCH': return 'bg-blue-100 text-blue-800 border-blue-300'
    default: return 'bg-green-100 text-green-800 border-green-300'
  }
}
</script>
