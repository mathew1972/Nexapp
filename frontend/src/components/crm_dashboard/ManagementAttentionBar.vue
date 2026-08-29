<template>
  <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-xs border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
    <div class="flex items-center gap-2 font-black tracking-wider uppercase text-[10px] sm:text-[11px] text-slate-300 shrink-0">
      <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
      <span>MANAGEMENT ATTENTION</span>
    </div>
    
    <div class="flex items-center gap-1.5 sm:gap-2 text-[11px] font-semibold overflow-x-auto w-full sm:w-auto pb-0.5 sm:pb-0">
      <!-- 1. Overdue Activities Badge -->
      <button
        @click="$emit('selectTab', 'leads_activities')"
        type="button"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-150 focus:outline-none whitespace-nowrap shrink-0"
        :class="(overdueCount !== 'Not measured' && Number(overdueCount) > 0) ? 'bg-red-950/80 text-red-200 border-red-800/80 hover:bg-red-900/80 font-bold shadow-2xs' : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'"
        title="Click to view Overdue Activities"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="(overdueCount !== 'Not measured' && Number(overdueCount) > 0) ? 'bg-red-400' : 'bg-slate-500'"></span>
        <span>Overdue:</span>
        <span class="font-extrabold">{{ overdueCount }}</span>
      </button>

      <!-- 2. Stale Deals Badge -->
      <button
        @click="$emit('selectTab', 'pipeline')"
        type="button"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-150 focus:outline-none whitespace-nowrap shrink-0"
        :class="(staleDealsCount !== 'Not measured' && Number(staleDealsCount) > 0) ? 'bg-amber-950/80 text-amber-200 border-amber-800/80 hover:bg-amber-900/80 font-bold shadow-2xs' : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'"
        title="Click to view Pipeline Stale Deals"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="(staleDealsCount !== 'Not measured' && Number(staleDealsCount) > 0) ? 'bg-amber-400' : 'bg-slate-500'"></span>
        <span>Stale Deals:</span>
        <span class="font-extrabold">{{ staleDealsCount }}</span>
        <span v-if="staleDealsValue !== 'Not measured' && staleDealsValue !== '₹0'" class="text-[10px] text-amber-300 font-normal">({{ staleDealsValue }})</span>
      </button>

      <!-- 3. Stale Unconverted Leads Badge -->
      <button
        @click="$emit('selectTab', 'leads_activities')"
        type="button"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-150 focus:outline-none whitespace-nowrap shrink-0"
        :class="(staleLeadsCount !== 'Not measured' && Number(staleLeadsCount) > 0) ? 'bg-amber-950/80 text-amber-200 border-amber-800/80 hover:bg-amber-900/80 font-bold shadow-2xs' : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'"
        title="Click to view Unconverted Stale Leads"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="(staleLeadsCount !== 'Not measured' && Number(staleLeadsCount) > 0) ? 'bg-amber-400' : 'bg-slate-500'"></span>
        <span>Stale Leads:</span>
        <span class="font-extrabold">{{ staleLeadsCount }}</span>
      </button>

      <!-- 4. Active Pipeline Badge -->
      <button
        @click="$emit('selectTab', 'pipeline')"
        type="button"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/80 text-blue-200 border border-blue-800/80 hover:bg-blue-900/80 font-bold shadow-2xs focus:outline-none transition-all duration-150 whitespace-nowrap shrink-0"
        title="Click to view Active Pipeline Operations"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
        <span>Active Pipeline:</span>
        <span class="font-black text-white">{{ pipelineValue }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'

const store = useCrmDashboardStore()

const props = defineProps({
  activitySummary: { type: Object, default: () => ({}) },
  velocitySummary: { type: Object, default: () => ({}) },
  pipelineSummary: { type: Object, default: () => ({}) }
})

const overdueCount = computed(() => fmtNum(props.activitySummary?.overdue_activities_count))
const staleDealsCount = computed(() => fmtNum(props.velocitySummary?.stale_deals_count))
const staleDealsValue = computed(() => fmtCurr(props.velocitySummary?.stale_deals_value))
const staleLeadsCount = computed(() => fmtNum(store.unconvertedLeadAnalytics?.summary?.stale_leads))
const pipelineValue = computed(() => fmtCurr(props.pipelineSummary?.pipeline_value))

function fmtNum(v) {
  if (v === null || v === undefined) return 'Not measured'
  return new Intl.NumberFormat('en-IN').format(v)
}

function fmtCurr(v) {
  if (v === null || v === undefined) return 'Not measured'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}
</script>
