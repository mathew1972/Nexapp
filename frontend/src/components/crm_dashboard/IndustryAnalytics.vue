<template>
  <div class="sf-card p-4">
    <h3 class="text-sm font-semibold text-gray-800 mb-3">Industry Performance</h3>
    <div v-if="loading" class="h-20 bg-gray-50 animate-pulse rounded"></div>
    <div v-else-if="!industries || industries.length === 0" class="py-3 text-xs text-gray-400 text-center">No industry data available.</div>
    <table v-else class="w-full text-xs">
      <thead><tr class="border-b border-gray-100 text-[11px] text-gray-500 font-medium">
        <th class="py-2 text-left">Industry</th><th class="py-2 text-right">Won Rev</th><th class="py-2 text-center">W/L</th><th class="py-2 text-right">Win %</th><th class="py-2 text-right">Pipeline</th>
      </tr></thead>
      <tbody><tr v-for="r in industries" :key="r.industry" class="border-b border-gray-50 hover:bg-gray-50">
        <td class="py-2 font-medium" :class="r.industry === 'Unspecified' ? 'text-gray-400 italic' : 'text-gray-800'">{{ r.industry }}</td>
        <td class="py-2 text-right font-semibold text-green-700">{{ fmtCurr(r.won_revenue) }}</td>
        <td class="py-2 text-center"><span class="text-green-600">{{ r.won_deals_count }}</span><span class="text-gray-300">/</span><span class="text-red-500">{{ r.lost_deals_count }}</span></td>
        <td class="py-2 text-right text-gray-600">{{ r.win_rate }}%</td>
        <td class="py-2 text-right text-blue-600 font-medium">{{ fmtCurr(r.open_pipeline_value) }}</td>
      </tr></tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({ industries: { type: Array, default: () => [] }, meta: { type: Object, default: null }, loading: { type: Boolean, default: false }, error: { type: String, default: null } })
function fmtCurr(v) { if (!v) return '₹0'; return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v) }
</script>
