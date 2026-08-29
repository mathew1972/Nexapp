<template>
  <div class="sf-card p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <span>Historical Deal Execution Analytics</span>
        </h3>
        <p class="text-[11px] text-gray-500">Historical velocity, dwell time, close-date slippage, probability movement, and ownership transfers</p>
      </div>
      <span class="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
        {{ summary?.stage_velocity?.total_stage_transitions || 0 }} Historical Events
      </span>
    </div>

    <!-- Loading Skeleton State -->
    <div v-if="loading" class="h-44 bg-gray-50 animate-pulse rounded-lg"></div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
      {{ error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="!summary || totalEventsCount === 0" class="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
      No Deal execution events recorded for this period.
    </div>

    <!-- Main Content Panel -->
    <div v-else class="space-y-5">
      <!-- SECTION 1: EXECUTIVE EVENT SUMMARY CARDS -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
        <div class="p-2 rounded bg-blue-50/70 border border-blue-200/60">
          <div class="text-[10px] text-blue-700 font-semibold uppercase tracking-wider">Stage Changes</div>
          <div class="text-base font-extrabold text-blue-900">{{ summary?.stage_velocity?.total_stage_transitions || 0 }}</div>
          <div class="text-[10px] text-blue-600 font-medium">Transitions</div>
        </div>
        <div class="p-2 rounded bg-amber-50/70 border border-amber-200/60">
          <div class="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">Deals Slipped</div>
          <div class="text-base font-extrabold text-amber-900">{{ summary?.slippage?.deals_affected || 0 }}</div>
          <div class="text-[10px] text-amber-600 font-medium">{{ summary?.slippage?.percentage_affected_deals || 0 }}% of pipeline</div>
        </div>
        <div class="p-2 rounded bg-purple-50/70 border border-purple-200/60">
          <div class="text-[10px] text-purple-700 font-semibold uppercase tracking-wider">Positive Slippage</div>
          <div class="text-base font-extrabold text-purple-900">+{{ summary?.slippage?.positive_slippage_days || 0 }}d</div>
          <div class="text-[10px] text-purple-600 font-medium">Avg +{{ summary?.slippage?.average_positive_slippage_days ?? 'N/A' }}d</div>
        </div>
        <div class="p-2 rounded bg-indigo-50/70 border border-indigo-200/60">
          <div class="text-[10px] text-indigo-700 font-semibold uppercase tracking-wider">Prob. Movement</div>
          <div class="text-base font-extrabold" :class="probMovementClass">
            {{ formatProbMovement(summary?.probability_movement?.net_probability_movement) }}
          </div>
          <div class="text-[10px] text-indigo-600 font-medium">{{ summary?.probability_movement?.probability_changes || 0 }} updates</div>
        </div>
        <div class="p-2 rounded bg-emerald-50/70 border border-emerald-200/60">
          <div class="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Value Expansion</div>
          <div class="text-base font-extrabold text-emerald-900">{{ fmtCurr(summary?.value_movement?.net_value_movement) }}</div>
          <div class="text-[10px] text-emerald-600 font-medium">{{ summary?.value_movement?.value_changes || 0 }} adjustments</div>
        </div>
        <div class="p-2 rounded bg-gray-50 border border-gray-200">
          <div class="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Owner Transfers</div>
          <div class="text-base font-extrabold text-gray-800">{{ summary?.owner_changes?.owner_changes || 0 }}</div>
          <div class="text-[10px] text-gray-500 font-medium">{{ summary?.owner_changes?.deals_affected || 0 }} deals shifted</div>
        </div>
      </div>

      <!-- SECTION 2 & 3: STAGE VELOCITY & SLIPPAGE GRID -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- STAGE VELOCITY -->
        <div class="p-3 bg-gray-50/50 border rounded-lg space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Stage Progression & Dwell Time</h4>
            <span class="text-[10px] text-gray-500 font-medium">Avg Dwell: {{ summary?.stage_velocity?.overall_average_dwell_days !== null ? `${summary?.stage_velocity?.overall_average_dwell_days}d` : 'Not Measured' }}</span>
          </div>

          <div v-if="!details?.stages || details.stages.length === 0" class="text-[11px] text-gray-400 py-3 text-center">
            No stage transitions recorded in this period.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-[11px]">
              <thead>
                <tr class="text-gray-400 border-b border-gray-200 pb-1">
                  <th class="font-semibold py-1">Stage</th>
                  <th class="font-semibold text-center py-1">Transitions</th>
                  <th class="font-semibold text-right py-1">Avg Dwell</th>
                  <th class="font-semibold text-right py-1">Med Dwell</th>
                  <th class="font-semibold text-right py-1">Max Dwell</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-150 text-gray-800">
                <tr v-for="stg in details.stages" :key="stg.stage">
                  <td class="font-bold py-1.5">{{ stg.stage }}</td>
                  <td class="text-center py-1.5">{{ stg.transitions }}</td>
                  <td class="text-right py-1.5 font-medium">
                    <span v-if="stg.average_dwell_days !== null">{{ stg.average_dwell_days }}d</span>
                    <span v-else class="text-gray-400 italic">Not measured</span>
                  </td>
                  <td class="text-right py-1.5 text-gray-600">
                    <span v-if="stg.median_dwell_days !== null">{{ stg.median_dwell_days }}d</span>
                    <span v-else class="text-gray-400 italic">—</span>
                  </td>
                  <td class="text-right py-1.5 text-gray-600">
                    <span v-if="stg.max_dwell_days !== null">{{ stg.max_dwell_days }}d</span>
                    <span v-else class="text-gray-400 italic">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- DEAL SLIPPAGE & PULL-FORWARD -->
        <div class="p-3 bg-gray-50/50 border rounded-lg space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Close-Date Schedule Slippage</h4>
            <span class="text-[10px] text-gray-500 font-medium">{{ summary?.slippage?.close_date_changes || 0 }} Schedule Revisions</span>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div class="p-2 bg-red-50/60 border border-red-200/60 rounded">
              <div class="text-[10px] font-bold text-red-700 uppercase">Pushed Later (Slippage)</div>
              <div class="text-sm font-extrabold text-red-900 mt-0.5">+{{ summary?.slippage?.positive_slippage_days || 0 }} Days</div>
              <div class="text-[10px] text-red-600 mt-1">Avg per push: +{{ summary?.slippage?.average_positive_slippage_days ?? 'N/A' }}d</div>
            </div>
            <div class="p-2 bg-green-50/60 border border-green-200/60 rounded">
              <div class="text-[10px] font-bold text-green-700 uppercase">Pulled Earlier (Accelerated)</div>
              <div class="text-sm font-extrabold text-green-900 mt-0.5">-{{ summary?.slippage?.negative_slippage_days || 0 }} Days</div>
              <div class="text-[10px] text-green-600 mt-1">Avg per pull: -{{ summary?.slippage?.average_negative_slippage_days ?? 'N/A' }}d</div>
            </div>
          </div>

          <div class="p-2 bg-white border rounded text-[11px] space-y-1">
            <div class="flex items-center justify-between text-gray-600">
              <span>Deals Affected by Slippage:</span>
              <b class="text-gray-900">{{ summary?.slippage?.deals_affected || 0 }} Opportunities</b>
            </div>
            <div class="flex items-center justify-between text-gray-600">
              <span>Pipeline Exposure:</span>
              <b class="text-gray-900">{{ summary?.slippage?.percentage_affected_deals || 0 }}% of Total Deals</b>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 4 & 5: PROBABILITY & VALUE MOVEMENT -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- PROBABILITY MOVEMENT -->
        <div class="p-3 bg-gray-50/50 border rounded-lg space-y-2 text-[11px]">
          <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Probability Calibration Changes</h4>
          <div class="grid grid-cols-3 gap-2 py-1 text-center">
            <div class="p-1.5 bg-white border rounded">
              <div class="text-[10px] text-gray-400">Avg Increase</div>
              <div class="font-bold text-green-700">{{ formatProbPp(summary?.probability_movement?.average_increase) }}</div>
            </div>
            <div class="p-1.5 bg-white border rounded">
              <div class="text-[10px] text-gray-400">Avg Decrease</div>
              <div class="font-bold text-red-700">{{ formatProbPp(summary?.probability_movement?.average_decrease) }}</div>
            </div>
            <div class="p-1.5 bg-white border rounded">
              <div class="text-[10px] text-gray-400">Max Shift</div>
              <div class="font-bold text-gray-800">+{{ formatProbPp(summary?.probability_movement?.largest_increase) }}</div>
            </div>
          </div>
        </div>

        <!-- VALUE MOVEMENT -->
        <div class="p-3 bg-gray-50/50 border rounded-lg space-y-2 text-[11px]">
          <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Deal Value Expansion & Contraction</h4>
          <div class="grid grid-cols-3 gap-2 py-1 text-center">
            <div class="p-1.5 bg-white border rounded">
              <div class="text-[10px] text-gray-400">Total Expansion</div>
              <div class="font-bold text-green-700">+{{ fmtCurr(summary?.value_movement?.total_positive_movement) }}</div>
            </div>
            <div class="p-1.5 bg-white border rounded">
              <div class="text-[10px] text-gray-400">Total Contraction</div>
              <div class="font-bold text-red-700">-{{ fmtCurr(summary?.value_movement?.total_negative_movement) }}</div>
            </div>
            <div class="p-1.5 bg-white border rounded">
              <div class="text-[10px] text-gray-400">Net Value Shift</div>
              <div class="font-bold" :class="(summary?.value_movement?.net_value_movement || 0) >= 0 ? 'text-emerald-800' : 'text-red-800'">
                {{ fmtCurr(summary?.value_movement?.net_value_movement) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 6: OWNER TRANSFERS -->
      <div v-if="details?.transfers && details.transfers.length > 0" class="p-3 bg-gray-50/50 border rounded-lg space-y-2 text-[11px]">
        <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Representative Ownership Transfers</h4>
        <div class="flex flex-wrap gap-2 pt-1">
          <div v-for="(tx, idx) in details.transfers" :key="idx" class="px-2.5 py-1 bg-white border rounded text-gray-700 flex items-center gap-1.5">
            <span class="font-semibold text-gray-900">{{ tx.from_owner }}</span>
            <span class="text-gray-400">→</span>
            <span class="font-semibold text-gray-900">{{ tx.to_owner }}</span>
            <span class="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10px]">{{ tx.count }} Deals</span>
          </div>
        </div>
      </div>

      <div v-else class="text-[11px] text-gray-400 italic text-center py-1">
        No ownership transfers recorded in this period.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  details: { type: Object, default: () => ({}) },
  meta: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const totalEventsCount = computed(() => {
  const s = props.summary
  if (!s) return 0
  return (
    (s.stage_velocity?.total_stage_transitions || 0) +
    (s.slippage?.close_date_changes || 0) +
    (s.probability_movement?.probability_changes || 0) +
    (s.value_movement?.value_changes || 0) +
    (s.owner_changes?.owner_changes || 0)
  )
})

const probMovementClass = computed(() => {
  const net = props.summary?.probability_movement?.net_probability_movement || 0
  if (net > 0) return 'text-emerald-800'
  if (net < 0) return 'text-red-800'
  return 'text-gray-800'
})

function fmtCurr(v) {
  if (!v && v !== 0) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

function formatProbMovement(val) {
  if (val === undefined || val === null) return '0.0 pp'
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${val} pp`
}

function formatProbPp(val) {
  if (val === undefined || val === null) return 'N/A'
  return `${val} pp`
}
</script>
