<template>
  <div class="sf-card p-4">
    <h3 class="text-sm font-semibold text-gray-800 mb-3">Lead Conversion Efficiency</h3>
    <div v-if="loading" class="h-20 bg-gray-50 animate-pulse rounded"></div>
    <template v-else>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div class="p-2.5 rounded bg-green-50 border border-green-100">
          <div class="text-[11px] text-green-700 font-medium">Conversion Rate</div>
          <div class="text-lg font-bold text-green-700">{{ summary?.conversion_rate || 0 }}%</div>
        </div>
        <div class="p-2.5 rounded bg-gray-50 border border-gray-100">
          <div class="text-[11px] text-gray-500 font-medium">Avg Days to Convert</div>
          <div class="text-lg font-bold text-gray-800">{{ summary?.avg_days_to_convert || 0 }} <span class="text-xs font-normal text-gray-400">days</span></div>
        </div>
        <div class="p-2.5 rounded bg-gray-50 border border-gray-100">
          <div class="text-[11px] text-gray-500 font-medium">Converted</div>
          <div class="text-lg font-bold text-gray-800">{{ summary?.converted_leads || 0 }}<span class="text-xs font-normal text-gray-400"> / {{ summary?.total_leads || 0 }}</span></div>
        </div>
        <div class="p-2.5 rounded bg-blue-50 border border-blue-100">
          <div class="text-[11px] text-blue-700 font-medium">Pipeline Generated</div>
          <div class="text-lg font-bold text-blue-700">{{ fmtCurr(summary?.converted_pipeline_value) }}</div>
        </div>
      </div>
      <div v-if="sourceBreakdown && sourceBreakdown.length > 0">
        <div class="text-[11px] font-medium text-gray-500 mb-2">Source conversion breakdown</div>
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-100 text-[11px] text-gray-500 font-medium">
            <th class="py-1.5 text-left">Source</th><th class="py-1.5 text-right">Intake</th><th class="py-1.5 text-right">Converted</th><th class="py-1.5 text-right">Rate</th><th class="py-1.5 text-right">Value</th>
          </tr></thead>
          <tbody><tr v-for="r in sourceBreakdown" :key="r.source" class="border-b border-gray-50 hover:bg-gray-50">
            <td class="py-1.5 font-medium" :class="r.source === 'Unspecified' ? 'text-gray-400 italic' : 'text-gray-800'">{{ r.source }}</td>
            <td class="py-1.5 text-right text-gray-600">{{ r.total_leads }}</td>
            <td class="py-1.5 text-right text-green-600 font-semibold">{{ r.converted_leads }}</td>
            <td class="py-1.5 text-right text-gray-600">{{ r.conversion_rate }}%</td>
            <td class="py-1.5 text-right text-blue-600 font-medium">{{ fmtCurr(r.converted_value) }}</td>
          </tr></tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({ summary: { type: Object, default: () => ({}) }, sourceBreakdown: { type: Array, default: () => [] }, funnel: { type: Array, default: () => [] }, meta: { type: Object, default: null }, loading: { type: Boolean, default: false }, error: { type: String, default: null } })
function fmtCurr(v) { if (!v) return '₹0'; return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v) }
</script>
