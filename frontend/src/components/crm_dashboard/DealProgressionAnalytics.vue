<template>
  <div class="sf-card p-4">
    <h3 class="text-sm font-semibold text-gray-800 mb-3">Deal Progression & Dwell Time</h3>
    <div v-if="loading" class="h-20 bg-gray-50 animate-pulse rounded"></div>
    <template v-else>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div class="p-2.5 rounded bg-gray-50 border border-gray-100">
          <div class="text-[11px] text-gray-500 font-medium">Transitions</div>
          <div class="text-lg font-bold text-gray-800">{{ summary?.total_transitions || 0 }}</div>
        </div>
        <div class="p-2.5 rounded bg-gray-50 border border-gray-100">
          <div class="text-[11px] text-gray-500 font-medium">Avg Dwell Time</div>
          <div class="text-lg font-bold text-blue-700">{{ summary?.average_dwell_days || 0 }} <span class="text-xs font-normal text-gray-400">days</span></div>
        </div>
        <div class="p-2.5 rounded bg-gray-50 border border-gray-100">
          <div class="text-[11px] text-gray-500 font-medium">Friction Stage</div>
          <div class="text-sm font-bold text-amber-700 truncate mt-1">{{ summary?.highest_friction_stage || 'None' }}</div>
        </div>
        <div class="p-2.5 rounded bg-red-50 border border-red-100">
          <div class="text-[11px] text-red-700 font-medium">Lost Value from Open</div>
          <div class="text-lg font-bold text-red-700">{{ fmtCurr(summary?.lost_stage_value) }}</div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div v-if="stages && stages.length > 0">
          <div class="text-[11px] font-medium text-gray-500 mb-2">Stage dwell duration</div>
          <table class="w-full text-xs">
            <thead><tr class="border-b border-gray-100 text-[11px] text-gray-500 font-medium">
              <th class="py-1.5 text-left">Stage</th><th class="py-1.5 text-right">In</th><th class="py-1.5 text-right">Out</th><th class="py-1.5 text-right">Avg Dwell</th>
            </tr></thead>
            <tbody><tr v-for="s in stages" :key="s.stage" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-1.5 font-medium text-gray-800">{{ s.stage }}</td>
              <td class="py-1.5 text-right text-gray-600">{{ s.entries }}</td>
              <td class="py-1.5 text-right text-gray-600">{{ s.exits }}</td>
              <td class="py-1.5 text-right font-semibold text-gray-800">{{ s.average_dwell_days }}d</td>
            </tr></tbody>
          </table>
        </div>
        <div v-if="transitions && transitions.length > 0">
          <div class="text-[11px] font-medium text-gray-500 mb-2">Transition flow</div>
          <table class="w-full text-xs">
            <thead><tr class="border-b border-gray-100 text-[11px] text-gray-500 font-medium">
              <th class="py-1.5 text-left">From</th><th class="py-1.5 text-left">To</th><th class="py-1.5 text-right">Count</th>
            </tr></thead>
            <tbody><tr v-for="(t, i) in transitions" :key="i" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-1.5 font-medium text-gray-700">{{ t.from_stage === 'Unspecified' ? 'Initial State' : t.from_stage }}</td>
              <td class="py-1.5 text-gray-600" :class="t.to_stage === 'Won' ? 'text-green-600 font-semibold' : t.to_stage === 'Lost' ? 'text-red-500 font-semibold' : ''">{{ t.to_stage === 'Unspecified' ? 'Destination not recorded' : t.to_stage }}</td>
              <td class="py-1.5 text-right font-medium text-gray-800">{{ t.transition_count }}</td>
            </tr></tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({ summary: { type: Object, default: () => ({}) }, transitions: { type: Array, default: () => [] }, stages: { type: Array, default: () => [] }, lossBreakdown: { type: Array, default: () => [] }, meta: { type: Object, default: null }, loading: { type: Boolean, default: false }, error: { type: String, default: null } })
function fmtCurr(v) { if (!v) return '₹0'; return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v) }
</script>
