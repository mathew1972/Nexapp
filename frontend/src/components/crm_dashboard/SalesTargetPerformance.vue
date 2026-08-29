<template>
  <div class="sf-card p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <span>Sales Target Performance</span>
          <span v-if="salesTarget?.scope?.period" class="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
            {{ formatPeriodLabel(salesTarget?.scope?.period) }}
          </span>
        </h3>
        <p class="text-[11px] text-gray-500">Executive target allocation, won achievement & forecast attainment</p>
      </div>
      <div v-if="!loading && summary" class="text-right">
        <span class="text-xs font-extrabold" :class="achievementStatusColorClass">
          {{ summary.achievement_percent?.toFixed(1) }}% Achieved
        </span>
      </div>
    </div>

    <!-- Loading Skeleton State -->
    <div v-if="loading" class="space-y-3 py-2">
      <div class="grid grid-cols-3 gap-2">
        <div class="h-10 bg-gray-100 animate-pulse rounded"></div>
        <div class="h-10 bg-gray-100 animate-pulse rounded"></div>
        <div class="h-10 bg-gray-100 animate-pulse rounded"></div>
      </div>
      <div class="h-3 bg-gray-100 animate-pulse rounded-full w-full"></div>
      <div class="grid grid-cols-3 gap-2">
        <div class="h-10 bg-gray-100 animate-pulse rounded"></div>
        <div class="h-10 bg-gray-100 animate-pulse rounded"></div>
        <div class="h-10 bg-gray-100 animate-pulse rounded"></div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-medium">
      {{ error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="!summary" class="p-4 text-center text-xs text-gray-400">
      No sales target data available for this scope.
    </div>

    <!-- Data Display -->
    <div v-else class="space-y-3">
      <!-- Primary Top Row: Target, Achieved, Achievement % -->
      <div class="grid grid-cols-3 gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
        <div>
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target</span>
          <span class="text-base font-extrabold text-gray-900 leading-tight block truncate">{{ fmtCurr(summary.target_value) }}</span>
        </div>
        <div>
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Achieved</span>
          <span class="text-base font-extrabold text-emerald-700 leading-tight block truncate">{{ fmtCurr(summary.achieved_value) }}</span>
        </div>
        <div>
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Achievement</span>
          <span class="text-base font-extrabold leading-tight block truncate" :class="achievementStatusColorClass">
            {{ summary.achievement_percent?.toFixed(1) }}%
          </span>
        </div>
      </div>

      <!-- Progress Bar Container -->
      <div class="space-y-1">
        <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200/60 shadow-inner">
          <div
            class="h-full rounded-full transition-all duration-500 ease-out"
            :class="progressBarColorClass"
            :style="{ width: `${progressWidth}%` }"
          ></div>
        </div>
        <div class="flex justify-between items-center text-[10px] text-gray-400 px-0.5 font-medium">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <!-- Secondary Bottom Row: Remaining, Pipeline, Forecast Attainment -->
      <div class="grid grid-cols-3 gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
        <div>
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Remaining Gap</span>
          <span class="text-sm font-bold text-gray-700 leading-tight block truncate">{{ fmtCurr(summary.remaining_value) }}</span>
        </div>
        <div>
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Open Pipeline</span>
          <span class="text-sm font-bold text-blue-700 leading-tight block truncate">{{ fmtCurr(summary.pipeline_value) }}</span>
        </div>
        <div>
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Forecast Attain.</span>
          <span class="text-sm font-bold text-indigo-700 leading-tight block truncate">
            {{ summary.forecast_attainment_percent?.toFixed(1) }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'

const store = useCrmDashboardStore()

const salesTarget = computed(() => store.salesTarget)
const loading = computed(() => store.loadingSalesTarget)
const error = computed(() => store.salesTargetError)

const summary = computed(() => salesTarget.value?.summary)
const currency = computed(() => salesTarget.value?.meta?.currency || 'INR')

/** Width calculation capped visually at 100% for CSS overflow safety */
const progressWidth = computed(() => {
  if (!summary.value) return 0
  const pct = summary.value.achievement_percent || 0
  return Math.min(Math.max(pct, 0), 100)
})

/** Visual status color mapping based on achievement % */
const progressBarColorClass = computed(() => {
  const pct = summary.value?.achievement_percent || 0
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 40) return 'bg-amber-500'
  return 'bg-blue-600'
})

const achievementStatusColorClass = computed(() => {
  const pct = summary.value?.achievement_percent || 0
  if (pct >= 80) return 'text-emerald-700'
  if (pct >= 40) return 'text-amber-700'
  return 'text-blue-700'
})

/** Number formatter strictly using backend currency meta */
function fmtCurr(val) {
  if (val === null || val === undefined) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.value,
    maximumFractionDigits: 0
  }).format(val)
}

function formatPeriodLabel(p) {
  if (!p) return ''
  const map = {
    today: 'Today',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_quarter: 'This Quarter',
    last_quarter: 'Last Quarter',
    this_year: 'This Year',
    custom: 'Custom Range'
  }
  return map[p] || p
}
</script>
