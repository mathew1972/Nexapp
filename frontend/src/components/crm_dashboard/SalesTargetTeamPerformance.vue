<template>
  <div class="sf-card p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="text-sm font-bold text-gray-900">Team Target Performance</h3>
        <p class="text-[11px] text-gray-500">Sales team targets, achievement rates, and pipeline coverage</p>
      </div>
      <span v-if="teams.length > 0" class="text-xs font-semibold text-gray-500">
        {{ teams.length }} Teams
      </span>
    </div>

    <!-- Loading Skeleton State -->
    <div v-if="loading" class="h-24 bg-gray-50 animate-pulse rounded"></div>

    <!-- Empty State -->
    <div v-else-if="!teams || teams.length === 0" class="py-6 text-center text-xs text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
      No team target data available for this scope.
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs text-left">
        <thead>
          <tr class="border-b border-gray-100 text-[10px] uppercase font-bold text-gray-400 bg-gray-50/50">
            <th class="py-2 px-2.5">Team</th>
            <th class="py-2 px-2 text-center">Reps</th>
            <th class="py-2 px-2 text-right">Target</th>
            <th class="py-2 px-2 text-right">Achieved</th>
            <th class="py-2 px-2.5 text-center min-w-[120px]">Achievement</th>
            <th class="py-2 px-2 text-right">Remaining Gap</th>
            <th class="py-2 px-2 text-right">Pipeline</th>
            <th class="py-2 px-2 text-right">Forecast Attain.</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="t in sortedTeams" :key="t.team_id" class="hover:bg-blue-50/40 transition-colors">
            <td class="py-2.5 px-2.5 font-bold text-gray-800">
              {{ t.team_name }}
            </td>
            <td class="py-2.5 px-2 text-center text-gray-500 font-medium">
              {{ t.member_count }}
            </td>
            <td class="py-2.5 px-2 text-right font-semibold text-gray-900">
              {{ fmtCurr(t.target_value) }}
            </td>
            <td class="py-2.5 px-2 text-right font-extrabold text-emerald-700">
              {{ fmtCurr(t.achieved_value) }}
            </td>
            <td class="py-2.5 px-2.5">
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200/50">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="getProgressColor(t.achievement_percent)"
                    :style="{ width: `${getBarWidth(t.achievement_percent)}%` }"
                  ></div>
                </div>
                <span class="text-[11px] font-extrabold w-10 text-right" :class="getStatusTextColor(t.achievement_percent)">
                  {{ t.achievement_percent?.toFixed(1) }}%
                </span>
              </div>
            </td>
            <td class="py-2.5 px-2 text-right font-medium text-gray-600">
              {{ fmtCurr(t.remaining_value) }}
            </td>
            <td class="py-2.5 px-2 text-right font-semibold text-blue-600">
              {{ fmtCurr(t.pipeline_value) }}
            </td>
            <td class="py-2.5 px-2 text-right font-bold text-indigo-700">
              {{ t.forecast_attainment_percent?.toFixed(1) }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'

const store = useCrmDashboardStore()

const salesTarget = computed(() => store.salesTarget)
const loading = computed(() => store.loadingSalesTarget)

const teams = computed(() => salesTarget.value?.by_team || [])
const currency = computed(() => salesTarget.value?.meta?.currency || 'INR')

/** Sort teams by Achievement % descending */
const sortedTeams = computed(() => {
  return [...teams.value].sort((a, b) => (b.achievement_percent || 0) - (a.achievement_percent || 0))
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

function fmtCurr(val) {
  if (val === null || val === undefined) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.value,
    maximumFractionDigits: 0
  }).format(val)
}
</script>
