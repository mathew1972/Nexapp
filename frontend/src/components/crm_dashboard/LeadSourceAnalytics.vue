<template>
  <div class="sf-card p-4">
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="text-sm font-black text-gray-900">Lead Source Performance</h3>
        <p class="text-[11px] text-gray-500">Acquisition channel ranking by volume and conversion rate</p>
      </div>
      <span v-if="sources && sources.length > 0" class="text-xs font-extrabold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
        {{ sources.length }} Sources
      </span>
    </div>
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-8 bg-gray-50 animate-pulse rounded"></div>
    </div>
    <div v-else-if="!sources || sources.length === 0" class="py-6 text-center text-xs text-gray-400 border border-dashed rounded-lg">
      No lead source data available.
    </div>
    <div v-else class="space-y-2">
      <div v-for="s in sortedSources" :key="s.source" class="group">
        <div class="flex items-center gap-3 text-xs">
          <div class="w-28 text-[11px] font-bold text-gray-800 truncate">{{ s.source || 'Unknown' }}</div>
          <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 bg-blue-500"
              :style="{ width: `${getSourcePct(s.leads_created)}%` }"
            ></div>
          </div>
          <div class="w-12 text-right text-[11px] font-extrabold text-gray-900">{{ s.leads_created }}</div>
          <div class="w-10 text-right text-[10px] font-bold" :class="s.cohorted_conversion_rate >= 40 ? 'text-emerald-600' : s.cohorted_conversion_rate > 0 ? 'text-gray-700' : 'text-gray-400'">
            {{ s.cohorted_conversion_rate }}%
          </div>
          <div class="w-8 text-right text-[10px] font-medium text-gray-400">{{ s.cohorted_converted }}c</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sources: { type: Array, default: () => [] },
  meta: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null }
})

const sortedSources = computed(() => {
  return [...(props.sources || [])].sort((a, b) => (b.leads_created || 0) - (a.leads_created || 0))
})

function getSourcePct(count) {
  const maxCount = Math.max(...(props.sources || []).map(s => s.leads_created || 0), 1)
  return Math.min(100, Math.max(3, ((count || 0) / maxCount) * 100))
}
</script>
