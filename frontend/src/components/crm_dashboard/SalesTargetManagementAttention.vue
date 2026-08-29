<template>
  <div class="sf-card p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <span>Sales Target Intelligence & Actionability</span>
        </h3>
        <p class="text-[11px] text-gray-500">Automated risk classification, forecast coverage gaps, and executive attention ranking</p>
      </div>
    </div>

    <!-- Loading Skeleton State -->
    <div v-if="loading" class="h-28 bg-gray-50 animate-pulse rounded"></div>

    <!-- Empty State -->
    <div v-else-if="!summary" class="p-4 text-center text-xs text-gray-400">
      No target intelligence available for this scope.
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-4">
      <!-- 4-Card Summary Risk Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <!-- Critical -->
        <div class="p-3 bg-red-50/60 border border-red-200/80 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-red-700 tracking-wider">Critical Risk</span>
            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          </div>
          <div class="text-xl font-extrabold text-red-900 mt-1">{{ summary.critical_count || 0 }}</div>
          <p class="text-[10px] text-red-700/80 mt-0.5 font-medium">Insufficient forecast coverage</p>
        </div>

        <!-- At Risk -->
        <div class="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-amber-700 tracking-wider">At Risk</span>
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <div class="text-xl font-extrabold text-amber-900 mt-1">{{ summary.at_risk_count || 0 }}</div>
          <p class="text-[10px] text-amber-700/80 mt-0.5 font-medium">Partial gap coverage</p>
        </div>

        <!-- On Track -->
        <div class="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">On Track</span>
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div class="text-xl font-extrabold text-emerald-900 mt-1">{{ summary.on_track_count || 0 }}</div>
          <p class="text-[10px] text-emerald-700/80 mt-0.5 font-medium">Forecast covers target</p>
        </div>

        <!-- Achieved -->
        <div class="p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Quota Achieved</span>
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <div class="text-xl font-extrabold text-blue-900 mt-1">{{ summary.achieved_count || 0 }}</div>
          <p class="text-[10px] text-blue-700/80 mt-0.5 font-medium">Goal exceeded (>= 100%)</p>
        </div>
      </div>

      <!-- Top Target Risks List -->
      <div v-if="topRisks.length > 0" class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Top Representative Target Risks</h4>
          <span class="text-[10px] text-gray-400 font-medium">Sorted by risk severity & gap</span>
        </div>
        <div class="divide-y divide-gray-100 border border-gray-100 rounded-lg bg-gray-50/30 overflow-hidden">
          <div
            v-for="(r, idx) in topRisks"
            :key="r.user"
            @click="openDealsByUser(r.user, store.effectiveScopeParams)"
            class="p-2.5 flex items-center justify-between hover:bg-blue-50/50 cursor-pointer transition-colors group"
          >
            <div class="flex items-center gap-3">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" :class="getBadgeClass(r.risk_status)">
                {{ idx + 1 }}
              </span>
              <div>
                <div class="text-xs font-bold text-gray-900 group-hover:text-blue-600 flex items-center gap-1">
                  <span>{{ r.user_name || r.user }}</span>
                  <span class="text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase border" :class="getStatusBadgeClass(r.risk_status)">
                    {{ r.risk_status }}
                  </span>
                </div>
                <div class="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                  <span>Remaining Gap: <strong class="text-gray-700">{{ fmtCurr(r.remaining_value) }}</strong></span>
                  <span>•</span>
                  <span>Weighted Pipeline: <strong class="text-gray-700">{{ fmtCurr(r.weighted_pipeline) }}</strong></span>
                </div>
              </div>
            </div>

            <div class="text-right">
              <div class="text-xs font-extrabold" :class="getTextColorClass(r.risk_status)">
                {{ r.forecast_attainment_percent?.toFixed(1) }}% Forecast
              </div>
              <div class="text-[10px] text-gray-400 font-medium mt-0.5">
                {{ r.weighted_coverage?.toFixed(1) }}% Weighted Coverage
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="p-3 text-center text-xs text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
        No immediate target risks detected. All representatives are currently on track.
      </div>
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

const summary = computed(() => salesTarget.value?.summary)
const currency = computed(() => salesTarget.value?.meta?.currency || 'INR')

/** Filter top 4 reps needing attention (CRITICAL or AT_RISK prioritized) */
const topRisks = computed(() => {
  const users = salesTarget.value?.by_user || []
  return users.filter(u => u.risk_status === 'CRITICAL' || u.risk_status === 'AT_RISK').slice(0, 4)
})

function getBadgeClass(status) {
  if (status === 'CRITICAL') return 'bg-red-100 text-red-800 border border-red-200'
  if (status === 'AT_RISK') return 'bg-amber-100 text-amber-800 border border-amber-200'
  if (status === 'ON_TRACK') return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
  return 'bg-blue-100 text-blue-800 border border-blue-200'
}

function getStatusBadgeClass(status) {
  if (status === 'CRITICAL') return 'bg-red-50 text-red-700 border-red-200'
  if (status === 'AT_RISK') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'ON_TRACK') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
}

function getTextColorClass(status) {
  if (status === 'CRITICAL') return 'text-red-700'
  if (status === 'AT_RISK') return 'text-amber-700'
  if (status === 'ON_TRACK') return 'text-emerald-700'
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
