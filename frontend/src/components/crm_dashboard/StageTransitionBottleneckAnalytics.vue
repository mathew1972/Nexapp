<template>
  <div class="sf-card p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <span>Stage Transition & Bottleneck Analytics</span>
        </h3>
        <p class="text-[11px] text-gray-500">
          Historical stage dwell duration, transition matrix, and process bottleneck diagnostic index
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
          Historical Anchored
        </span>
        <span class="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
          {{ summary?.total_stage_transitions || 0 }} Transitions
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <div v-for="i in 8" :key="i" class="h-16 bg-gray-50 animate-pulse rounded-lg"></div>
      </div>
      <div class="h-44 bg-gray-50 animate-pulse rounded-lg"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
      Unable to load Stage Transition & Bottleneck analytics. ({{ error }})
    </div>

    <!-- Empty State -->
    <div v-else-if="!summary || summary.total_stage_transitions === 0" class="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
      No historical stage transition data available for the selected period and scope.
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-4">
      <!-- SECTION A: EXECUTIVE SUMMARY KPI CARDS -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center">
        <div class="p-2 rounded bg-indigo-50/70 border border-indigo-200/60">
          <div class="text-[10px] text-indigo-700 font-semibold uppercase tracking-wider">Total Transitions</div>
          <div class="text-base font-extrabold text-indigo-900">{{ summary.total_stage_transitions }}</div>
          <div class="text-[10px] text-indigo-600 font-medium">{{ summary.unique_deals }} unique deals</div>
        </div>

        <div class="p-2 rounded bg-emerald-50/70 border border-emerald-200/60">
          <div class="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Measured</div>
          <div class="text-base font-extrabold text-emerald-900">{{ summary.measured_transitions }}</div>
          <div class="text-[10px] text-emerald-600 font-medium">Valid dwell data</div>
        </div>

        <div class="p-2 rounded bg-amber-50/70 border border-amber-200/60">
          <div class="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">Unmeasured</div>
          <div class="text-base font-extrabold text-amber-900">{{ summary.unmeasured_transitions }}</div>
          <div class="text-[10px] text-amber-600 font-medium">Missing dwell</div>
        </div>

        <div class="p-2 rounded bg-blue-50/70 border border-blue-200/60">
          <div class="text-[10px] text-blue-700 font-semibold uppercase tracking-wider">Unique Stages</div>
          <div class="text-base font-extrabold text-blue-900">{{ summary.unique_stages }}</div>
          <div class="text-[10px] text-blue-600 font-medium">Active stages</div>
        </div>

        <div class="p-2 rounded bg-purple-50/70 border border-purple-200/60">
          <div class="text-[10px] text-purple-700 font-semibold uppercase tracking-wider">Paths</div>
          <div class="text-base font-extrabold text-purple-900">{{ summary.unique_transition_paths }}</div>
          <div class="text-[10px] text-purple-600 font-medium">Stage connections</div>
        </div>

        <div class="p-2 rounded bg-rose-50/70 border border-rose-200/60 col-span-2 sm:col-span-2">
          <div class="text-[10px] text-rose-700 font-semibold uppercase tracking-wider">Slowest Path</div>
          <div class="text-xs font-bold text-rose-900 truncate" :title="summary.slowest_transition || 'None'">
            {{ summary.slowest_transition || 'None' }}
          </div>
          <div class="text-[10px] text-rose-600 font-medium">Max measured dwell path</div>
        </div>

        <div class="p-2 rounded bg-gray-50 border border-gray-200/60">
          <div class="text-[10px] text-gray-700 font-semibold uppercase tracking-wider">Slowest Stage</div>
          <div class="text-xs font-bold text-gray-900 truncate" :title="summary.slowest_stage || 'None'">
            {{ summary.slowest_stage || 'None' }}
          </div>
          <div class="text-[10px] text-gray-500 font-medium">Max average dwell</div>
        </div>
      </div>

      <!-- SECTION B & D: STAGE VELOCITY & BOTTLENECK INDEX TABLE -->
      <div class="space-y-2">
        <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Stage Velocity & Bottleneck Index</h4>
        <div class="overflow-x-auto border border-gray-200 rounded-lg">
          <table class="w-full text-left text-[11px]">
            <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th class="py-2 px-3">Stage</th>
                <th class="py-2 px-3 text-center">Transitions</th>
                <th class="py-2 px-3 text-center">Measured</th>
                <th class="py-2 px-3 text-center">Unmeasured</th>
                <th class="py-2 px-3 text-right">Avg Dwell (Days)</th>
                <th class="py-2 px-3 text-right">Median Dwell</th>
                <th class="py-2 px-3 text-right">Max Dwell</th>
                <th class="py-2 px-3 text-right">Bottleneck Index</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 font-medium">
              <tr v-for="item in stageVelocityList" :key="item.stage" class="hover:bg-gray-50/80 transition-colors">
                <td class="py-2 px-3 font-semibold text-gray-900">{{ item.stage }}</td>
                <td class="py-2 px-3 text-center font-bold text-gray-700">{{ item.transition_count }}</td>
                <td class="py-2 px-3 text-center text-emerald-700 font-semibold">{{ item.measured_count }}</td>
                <td class="py-2 px-3 text-center text-amber-700">{{ item.unmeasured_count }}</td>
                <td class="py-2 px-3 text-right font-bold" :class="item.average_dwell_days > 15 ? 'text-rose-700' : 'text-gray-800'">
                  {{ formatDwell(item.average_dwell_days) }}
                </td>
                <td class="py-2 px-3 text-right text-gray-700">{{ formatDwell(item.median_dwell_days) }}</td>
                <td class="py-2 px-3 text-right text-gray-700">{{ formatDwell(item.maximum_dwell_days) }}</td>
                <td class="py-2 px-3 text-right">
                  <span
                    v-if="getBottleneckIndex(item.stage) !== null"
                    :class="[
                      'px-2 py-0.5 rounded font-extrabold text-[10px]',
                      getBottleneckIndex(item.stage) >= 50
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : getBottleneckIndex(item.stage) >= 20
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    ]"
                  >
                    {{ getBottleneckIndex(item.stage).toFixed(1) }}
                  </span>
                  <span v-else class="text-gray-400 italic">Not measured</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION C: TRANSITION MATRIX -->
      <div class="space-y-2">
        <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">Pairwise Transition Matrix</h4>
        <div class="overflow-x-auto border border-gray-200 rounded-lg">
          <table class="w-full text-left text-[11px]">
            <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th class="py-2 px-3">From Stage</th>
                <th class="py-2 px-3">To Stage</th>
                <th class="py-2 px-3 text-center">Transition Count</th>
                <th class="py-2 px-3 text-center">Measured</th>
                <th class="py-2 px-3 text-right">Avg Dwell</th>
                <th class="py-2 px-3 text-right">Median Dwell</th>
                <th class="py-2 px-3 text-right">Max Dwell</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 font-medium">
              <tr v-for="(path, idx) in transitionMatrixList" :key="idx" class="hover:bg-gray-50/80 transition-colors">
                <td class="py-2 px-3 text-gray-800 font-semibold">{{ path.from_stage }}</td>
                <td class="py-2 px-3 text-gray-900 font-bold flex items-center gap-1">
                  <span class="text-gray-400">→</span> {{ path.to_stage }}
                </td>
                <td class="py-2 px-3 text-center font-bold text-gray-800">{{ path.transition_count }}</td>
                <td class="py-2 px-3 text-center text-emerald-700">{{ path.measured_count }}</td>
                <td class="py-2 px-3 text-right font-bold text-gray-900">{{ formatDwell(path.average_dwell_days) }}</td>
                <td class="py-2 px-3 text-right text-gray-700">{{ formatDwell(path.median_dwell_days) }}</td>
                <td class="py-2 px-3 text-right text-gray-700">{{ formatDwell(path.maximum_dwell_days) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'

const store = useCrmDashboardStore()

const loading = computed(() => store.loadingStageTransitionBottleneckAnalytics)
const error = computed(() => store.stageTransitionBottleneckAnalyticsError)
const data = computed(() => store.stageTransitionBottleneckAnalytics)

const summary = computed(() => data.value?.summary)
const stageVelocityList = computed(() => data.value?.stage_velocity || [])
const transitionMatrixList = computed(() => data.value?.transition_matrix || [])
const bottlenecksList = computed(() => data.value?.bottlenecks || [])

const bottleneckMap = computed(() => {
  const map = {}
  bottlenecksList.value.forEach(b => {
    map[b.stage] = b.bottleneck_index
  })
  return map
})

function getBottleneckIndex(stage) {
  return bottleneckMap.value[stage] ?? null
}

function formatDwell(val) {
  if (val === null || val === undefined) return 'Not measured'
  return `${Number(val).toFixed(1)} d`
}
</script>
