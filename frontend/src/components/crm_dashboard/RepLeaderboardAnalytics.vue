<template>
  <div class="sf-card p-4">
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="text-sm font-bold text-gray-900">Sales Rep Leaderboard</h3>
        <p class="text-[11px] text-gray-500">Rep performance, won deals, and revenue attainment</p>
      </div>
      <span v-if="filteredLeaderboard.length > 0" class="text-xs font-semibold text-gray-500">
        {{ filteredLeaderboard.length }} Active Reps
      </span>
    </div>

    <div v-if="loading" class="h-24 bg-gray-50 animate-pulse rounded"></div>
    <div v-else-if="filteredLeaderboard.length === 0" class="py-8 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
      <svg class="w-7 h-7 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
      <p class="text-xs font-semibold text-gray-600">No representative data for this period</p>
      <p class="text-[11px] text-gray-400">Sales performance rankings will populate once deals are updated.</p>
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs text-left">
        <thead>
          <tr class="border-b border-gray-100 text-[10px] uppercase font-bold text-gray-400 bg-gray-50/50">
            <th class="py-2 px-2 text-center w-8">#</th>
            <th class="py-2 px-2">Sales Rep</th>
            <th class="py-2 px-2 text-right">Won Deals</th>
            <th class="py-2 px-2 text-right">Revenue</th>
            <th class="py-2 px-2 text-right">Win Rate</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr 
            v-for="(r, i) in filteredLeaderboard" 
            :key="r.rep_owner || i" 
            @click="openDealsByUser(r.rep_owner, store.effectiveScopeParams)"
            class="hover:bg-blue-50/50 cursor-pointer transition-colors group"
          >
            <td class="py-2 px-2 text-center">
              <span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" :class="i === 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' : i === 1 ? 'bg-gray-200 text-gray-700 border border-gray-300' : i === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-500'">
                {{ i + 1 }}
              </span>
            </td>
            <td class="py-2 px-2 font-semibold text-gray-800 group-hover:text-blue-600 flex items-center gap-1">
              <span>{{ r.rep_name || r.rep_owner || 'Unassigned' }}</span>
              <svg class="w-3 h-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </td>
            <td class="py-2 px-2 text-right text-gray-600 font-medium">
              {{ r.won_deals_count || r.won_deals || 0 }}
            </td>
            <td class="py-2 px-2 text-right font-extrabold text-green-700">
              {{ fmtCurr(r.won_revenue) }}
            </td>
            <td class="py-2 px-2 text-right font-bold text-gray-700">
              {{ r.win_rate || 0 }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { openDealsByUser } from '../../utils/crmDashboardNavigation'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'

const store = useCrmDashboardStore()

const props = defineProps({
  leaderboard: { type: Array, default: () => [] },
  meta: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const filteredLeaderboard = computed(() => {
  if (!props.leaderboard || props.leaderboard.length === 0) return []
  const seenUsers = new Set()
  return props.leaderboard.filter(row => {
    const userKey = row.rep_owner || row.rep_name || 'Unassigned'
    if (userKey === 'Unassigned' && (row.won_revenue || 0) === 0 && (row.won_deals_count || row.won_deals || 0) === 0) {
      if (seenUsers.has('Unassigned')) return false
    }
    seenUsers.add(userKey)
    return true
  })
})

function fmtCurr(v) {
  if (!v && v !== 0) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}
</script>
