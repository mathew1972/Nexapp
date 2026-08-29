<template>
  <div class="sf-card p-4">
    <h3 class="text-sm font-semibold text-gray-800 mb-3">Sales Cycle & Velocity</h3>
    <div v-if="loading" class="h-20 bg-gray-50 animate-pulse rounded"></div>
    <template v-else>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div class="p-2.5 rounded bg-gray-50 border border-gray-100">
          <div class="text-[11px] text-gray-500 font-medium">Avg Won Cycle</div>
          <div class="text-lg font-bold text-gray-800">{{ summary?.avg_won_sales_cycle_days || 0 }} <span class="text-xs font-normal text-gray-400">days</span></div>
        </div>
        <div class="p-2.5 rounded bg-gray-50 border border-gray-100">
          <div class="text-[11px] text-gray-500 font-medium">Avg Lost Cycle</div>
          <div class="text-lg font-bold text-gray-800">{{ summary?.avg_lost_sales_cycle_days || 0 }} <span class="text-xs font-normal text-gray-400">days</span></div>
        </div>
        <div class="p-2.5 rounded bg-gray-50 border border-gray-100">
          <div class="text-[11px] text-gray-500 font-medium">Avg Open Age</div>
          <div class="text-lg font-bold text-amber-700">{{ summary?.avg_open_deal_age_days || 0 }} <span class="text-xs font-normal text-gray-400">days</span></div>
        </div>
        <div class="p-2.5 rounded bg-blue-50 border border-blue-100">
          <div class="text-[11px] text-blue-700 font-medium">Sales Velocity</div>
          <div class="text-lg font-bold text-blue-700">{{ fmtCurr(summary?.sales_velocity_per_day) }}<span class="text-xs font-normal text-blue-400">/day</span></div>
        </div>
      </div>
      <div v-if="ageDistribution && ageDistribution.length > 0">
        <div class="text-[11px] font-medium text-gray-500 mb-2">Open Pipeline Age Distribution</div>
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-100 text-[11px] text-gray-500 font-medium">
            <th class="py-1.5 text-left">Age Bracket</th><th class="py-1.5 text-right">Deals</th><th class="py-1.5 text-right">Value</th><th class="py-1.5 text-right">% Pipeline</th>
          </tr></thead>
          <tbody><tr v-for="r in ageDistribution" :key="r.bracket" class="border-b border-gray-50 hover:bg-gray-50">
            <td class="py-1.5 font-medium text-gray-700 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full" :class="bracketDot(r.bracket)"></span>{{ r.bracket }}
              <span v-if="r.bracket === '90+ Days' && r.deal_count > 0" class="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-800">Risk</span>
            </td>
            <td class="py-1.5 text-right text-gray-600">{{ r.deal_count }}</td>
            <td class="py-1.5 text-right text-gray-700 font-medium">{{ fmtCurr(r.pipeline_value) }}</td>
            <td class="py-1.5 text-right">
              <div class="inline-flex items-center gap-1.5">
                <div class="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div class="h-full rounded-full" :class="bracketBar(r.bracket)" :style="{ width: r.percentage_of_pipeline + '%' }"></div></div>
                <span class="text-gray-600 w-8 text-right">{{ r.percentage_of_pipeline }}%</span>
              </div>
            </td>
          </tr></tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({ summary: { type: Object, default: null }, ageDistribution: { type: Array, default: () => [] }, meta: { type: Object, default: null }, loading: { type: Boolean, default: false }, error: { type: String, default: null } })
function fmtCurr(v) { if (!v) return '₹0'; return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v) }
function bracketDot(b) { if (b.includes('90+')) return 'bg-amber-500'; if (b.includes('61')) return 'bg-orange-400'; if (b.includes('31')) return 'bg-blue-400'; return 'bg-green-500' }
function bracketBar(b) { if (b.includes('90+')) return 'bg-amber-500'; if (b.includes('61')) return 'bg-orange-400'; if (b.includes('31')) return 'bg-blue-400'; return 'bg-green-500' }
</script>
