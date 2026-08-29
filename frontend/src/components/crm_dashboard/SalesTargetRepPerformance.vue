<template>
  <div class="sf-card p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="text-sm font-black text-gray-900">Sales Rep Performance Board</h3>
        <p class="text-[11px] text-gray-500">Individual quota attainment, pipeline coverage, and management ranking</p>
      </div>
      <span v-if="users.length > 0" class="text-xs font-extrabold text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200">
        {{ users.length }} Reps
      </span>
    </div>

    <!-- Loading Skeleton State -->
    <div v-if="loading" class="h-28 bg-gray-50 animate-pulse rounded"></div>

    <!-- Empty State -->
    <div v-else-if="!users || users.length === 0" class="py-6 text-center text-xs text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
      No sales representative target data available for this scope.
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs text-left">
        <thead>
          <tr class="border-b border-gray-100 text-[10px] uppercase font-black text-gray-400 bg-gray-50/80">
            <th class="py-2.5 px-2 text-center w-8">#</th>
            <th class="py-2.5 px-2.5">Sales Rep</th>
            <th class="py-2.5 px-2 text-right">Target</th>
            <th class="py-2.5 px-2 text-right">Achieved</th>
            <th class="py-2.5 px-2.5 text-center min-w-[120px]">Achievement</th>
            <th class="py-2.5 px-2 text-right">Gap</th>
            <th class="py-2.5 px-2 text-right">Pipeline</th>
            <th class="py-2.5 px-2 text-right">Forecast</th>
            <th class="py-2.5 px-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr
            v-for="(u, i) in sortedUsers"
            :key="u.user"
            @click="openDealsByUser(u.user, store.effectiveScopeParams)"
            class="hover:bg-blue-50/50 cursor-pointer transition-colors group"
          >
            <td class="py-2.5 px-2 text-center">
              <span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" :class="i === 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' : i === 1 ? 'bg-gray-200 text-gray-700 border border-gray-300' : i === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-500'">
                {{ i + 1 }}
              </span>
            </td>
            <td class="py-2.5 px-2.5 font-bold text-gray-800 group-hover:text-blue-600 flex items-center gap-1">
              <span>{{ u.user_name || u.user }}</span>
              <svg class="w-3 h-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </td>
            <td class="py-2.5 px-2 text-right font-semibold text-gray-900">
              {{ fmtCurr(u.target_value) }}
            </td>
            <td class="py-2.5 px-2 text-right font-extrabold text-emerald-700">
              {{ fmtCurr(u.achieved_value) }}
            </td>
            <td class="py-2.5 px-2.5">
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200/50">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="getProgressColor(u.achievement_percent)"
                    :style="{ width: `${getBarWidth(u.achievement_percent)}%` }"
                  ></div>
                </div>
                <span class="text-[11px] font-extrabold w-10 text-right" :class="getStatusTextColor(u.achievement_percent)">
                  {{ u.achievement_percent?.toFixed(1) }}%
                </span>
              </div>
            </td>
            <td class="py-2.5 px-2 text-right font-medium text-gray-600">
              {{ fmtCurr(u.remaining_value) }}
            </td>
            <td class="py-2.5 px-2 text-right font-semibold text-blue-600">
              {{ fmtCurr(u.pipeline_value) }}
            </td>
            <td class="py-2.5 px-2 text-right font-bold text-indigo-700">
              {{ u.forecast_attainment_percent?.toFixed(1) }}%
            </td>
            <td class="py-2.5 px-2 text-center">
              <span
                class="px-2 py-0.5 rounded text-[10px] font-black uppercase border"
                :class="getStatusBadge(u.achievement_percent)"
              >
                {{ getStatusLabel(u.achievement_percent) }}
              </span>
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

const salesTarget = computed(() => store.salesTarget)
const loading = computed(() => store.loadingSalesTarget)

const users = computed(() => salesTarget.value?.by_user || [])
const currency = computed(() => salesTarget.value?.meta?.currency || 'INR')

/** Sort representatives by Achievement % descending, then Achieved Value, then Target Value */
const sortedUsers = computed(() => {
  return [...users.value].sort((a, b) => {
    const diffPct = (b.achievement_percent || 0) - (a.achievement_percent || 0)
    if (Math.abs(diffPct) > 0.001) return diffPct
    const diffAchieved = (b.achieved_value || 0) - (a.achieved_value || 0)
    if (Math.abs(diffAchieved) > 0.001) return diffAchieved
    return (b.target_value || 0) - (a.target_value || 0)
  })
})

function getBarWidth(pct) {
  if (!pct) return 0
  return Math.min(Math.max(pct, 0), 100)
}

function getProgressColor(pct) {
  if (!pct) return 'bg-gray-300'
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 40) return 'bg-amber-500'
  return 'bg-blue-600'
}

function getStatusTextColor(pct) {
  if (!pct) return 'text-gray-500'
  if (pct >= 80) return 'text-emerald-700'
  if (pct >= 40) return 'text-amber-700'
  return 'text-blue-700'
}

function getStatusLabel(pct) {
  if (!pct || pct < 40) return 'Critical'
  if (pct < 80) return 'At Risk'
  return 'On Track'
}

function getStatusBadge(pct) {
  if (!pct || pct < 40) return 'bg-red-50 text-red-700 border-red-200'
  if (pct < 80) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
