<template>
  <div class="sf-card p-4">
    <h3 class="text-sm font-semibold text-gray-800 mb-3">Unconverted Lead Bottlenecks</h3>
    <div v-if="loading" class="h-20 bg-gray-50 animate-pulse rounded"></div>
    <template v-else>
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="p-2.5 rounded bg-gray-50 border border-gray-100">
          <div class="text-[11px] text-gray-500 font-medium">Unconverted Leads</div>
          <div class="text-lg font-bold text-gray-800">{{ fmtNum(summary?.total_unconverted_leads) }}</div>
        </div>
        <div class="p-2.5 rounded" :class="isStalePositive ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'">
          <div class="text-[11px] font-medium" :class="isStalePositive ? 'text-amber-700' : 'text-gray-700'">Stale (>14 days)</div>
          <div class="text-lg font-bold" :class="isStalePositive ? 'text-amber-700' : 'text-gray-700'">{{ fmtNum(summary?.stale_leads) }}</div>
        </div>
      </div>
      <div v-if="bottlenecks && bottlenecks.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div v-if="stages && stages.length > 0">
          <div class="text-[11px] font-medium text-gray-500 mb-2">Stage distribution</div>
          <table class="w-full text-xs">
            <thead><tr class="border-b border-gray-100 text-[11px] text-gray-500 font-medium">
              <th class="py-1.5 text-left">Stage</th><th class="py-1.5 text-right">Count</th><th class="py-1.5 text-right">%</th>
            </tr></thead>
            <tbody><tr v-for="r in stages" :key="r.status" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-1.5 font-medium text-gray-800">{{ r.status }}</td>
              <td class="py-1.5 text-right text-gray-600">{{ fmtNum(r.count) }}</td>
              <td class="py-1.5 text-right text-gray-500">{{ r.percentage !== null && r.percentage !== undefined ? `${r.percentage}%` : 'Not measured' }}</td>
            </tr></tbody>
          </table>
        </div>
        <div v-if="ageDistribution && ageDistribution.length > 0">
          <div class="text-[11px] font-medium text-gray-500 mb-2">Age distribution</div>
          <table class="w-full text-xs">
            <thead><tr class="border-b border-gray-100 text-[11px] text-gray-500 font-medium">
              <th class="py-1.5 text-left">Age</th><th class="py-1.5 text-right">Count</th><th class="py-1.5 text-right">%</th>
            </tr></thead>
            <tbody><tr v-for="r in ageDistribution" :key="r.bucket" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-1.5 font-medium text-gray-800">{{ r.bucket }}</td>
              <td class="py-1.5 text-right text-gray-600">{{ fmtNum(r.count) }}</td>
              <td class="py-1.5 text-right text-gray-500">{{ r.percentage !== null && r.percentage !== undefined ? `${r.percentage}%` : 'Not measured' }}</td>
            </tr></tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  bottlenecks: { type: Array, default: () => [] },
  stages: { type: Array, default: () => [] },
  ageDistribution: { type: Array, default: () => [] },
  meta: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null }
})

const isStalePositive = computed(() => {
  const count = props.summary?.stale_leads
  return count !== null && count !== undefined && Number(count) > 0
})

function fmtNum(v) {
  if (v === null || v === undefined) return 'Not measured'
  return new Intl.NumberFormat('en-IN').format(v)
}
</script>
