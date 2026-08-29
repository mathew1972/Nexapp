<template>
  <div class="sf-card p-4">
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="text-sm font-black text-gray-900">Sales Execution Board</h3>
        <p class="text-[11px] text-gray-500">Activity completion, overdue tracking, and execution rate</p>
      </div>
      <span
        class="text-[10px] font-bold px-2 py-0.5 rounded-full border"
        :class="(summary?.overdue_activities_count || 0) > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'"
      >
        {{ (summary?.overdue_activities_count || 0) > 0 ? `${summary?.overdue_activities_count} overdue` : 'All clear' }}
      </span>
    </div>
    
    <div v-if="loading" class="space-y-2">
      <div class="h-6 bg-gray-50 animate-pulse rounded"></div>
      <div class="h-6 bg-gray-50 animate-pulse rounded"></div>
      <div class="h-6 bg-gray-50 animate-pulse rounded"></div>
    </div>
    <template v-else-if="!hasActivityData">
      <div class="py-8 text-center border border-dashed border-gray-200 rounded-lg">
        <div class="text-sm font-bold text-gray-400 mb-1">No Activities Recorded</div>
        <div class="text-xs text-gray-400">Tasks and scheduled communications will appear here once logged.</div>
      </div>
    </template>
    <template v-else>
      <!-- Compact KPI Row -->
      <div class="flex items-center gap-2 mb-3">
        <div class="flex-1 flex items-center gap-2 p-2 rounded bg-gray-50 border border-gray-100">
          <span class="text-[10px] font-black text-gray-400 uppercase">Total</span>
          <span class="text-sm font-black text-gray-900">{{ fmtNum(summary?.total_activities_count) }}</span>
        </div>
        <div class="flex-1 flex items-center gap-2 p-2 rounded bg-emerald-50/80 border border-emerald-100">
          <span class="text-[10px] font-black text-emerald-500 uppercase">Done</span>
          <span class="text-sm font-black text-emerald-700">{{ fmtNum(summary?.completed_activities_count) }}</span>
        </div>
        <div class="flex-1 flex items-center gap-2 p-2 rounded" :class="(summary?.overdue_activities_count || 0) > 0 ? 'bg-red-50/80 border border-red-100' : 'bg-gray-50 border border-gray-100'">
          <span class="text-[10px] font-black uppercase" :class="(summary?.overdue_activities_count || 0) > 0 ? 'text-red-500' : 'text-gray-400'">Overdue</span>
          <span class="text-sm font-black" :class="(summary?.overdue_activities_count || 0) > 0 ? 'text-red-700' : 'text-gray-800'">{{ fmtNum(summary?.overdue_activities_count) }}</span>
        </div>
        <div class="flex-1 flex items-center gap-2 p-2 rounded bg-blue-50/80 border border-blue-100">
          <span class="text-[10px] font-black text-blue-500 uppercase">Rate</span>
          <span class="text-sm font-black text-blue-700">{{ summary?.completion_rate || 0 }}%</span>
        </div>
      </div>

      <!-- Completion Progress Bar -->
      <div>
        <div class="flex items-center justify-between text-[10px] text-gray-400 mb-1">
          <span class="font-bold uppercase tracking-wider">Execution Progress</span>
          <span class="font-extrabold text-gray-600">{{ summary?.completion_rate || 0 }}%</span>
        </div>
        <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="(summary?.completion_rate || 0) >= 80 ? 'bg-emerald-500' : (summary?.completion_rate || 0) >= 50 ? 'bg-amber-400' : 'bg-red-400'"
            :style="{ width: (summary?.completion_rate || 0) + '%' }"
          ></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  activityBreakdown: { type: Array, default: () => [] },
  meta: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const hasActivityData = computed(() => {
  return (props.summary?.total_activities_count || 0) > 0
})

function fmtNum(v) { return new Intl.NumberFormat('en-IN').format(v || 0) }
</script>
