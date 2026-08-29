<template>
  <div class="sf-card p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between h-full">
    <div>
      <!-- Card Header matching standardized uppercase style -->
      <div class="flex items-center justify-between mb-3">
        <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none pr-2">
          PIPELINE HEALTH
        </span>
        <span class="text-[11px] font-medium text-slate-400">
          open deals by stage
        </span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-8 space-y-2.5">
        <div v-for="i in 4" :key="i" class="h-6 bg-slate-100 animate-pulse rounded-lg"></div>
      </div>

      <!-- Stage Funnel Bars with Gradient Blue Shades -->
      <div class="space-y-2.5 py-1">
        <div 
          v-for="stg in displayStages" 
          :key="stg.name"
          class="flex items-center gap-3 text-xs"
        >
          <!-- Stage Name (Left) -->
          <span class="w-24 font-bold text-slate-800 text-xs shrink-0">
            {{ stg.name }}
          </span>

          <!-- Rounded Pill Bar Track -->
          <div class="flex-1 flex items-center">
            <div
              class="h-4 transition-all duration-500 rounded-full min-w-[20px]"
              :class="stg.barColorClass"
              :style="{ width: `${stg.widthPct}%` }"
            ></div>
          </div>

          <!-- Count & Value (Right) -->
          <div class="font-extrabold text-slate-700 text-xs shrink-0 text-right min-w-[85px]">
            <span>{{ stg.count }}</span>
            <span class="mx-1 text-slate-300 font-normal">·</span>
            <span class="text-blue-700">₹{{ stg.valueFmt }}</span>
          </div>
        </div>
      </div>

      <!-- Key Pipeline Metrics Badges -->
      <div class="mt-4 pt-3 border-t border-slate-100 space-y-2">
        <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <!-- Stale Badge -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Stale (14d+): <strong class="font-black text-slate-900">18% of value</strong></span>
          </div>

          <!-- Slipped Badge -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Slipped this qtr: <strong class="font-black text-slate-900">6 deals</strong></span>
          </div>

          <!-- Single-threaded Badge -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Single-threaded ₹5L+: <strong class="font-black text-slate-900">7 deals</strong></span>
          </div>

          <!-- Score Badge -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Avg qualification score: <strong class="font-black text-slate-900">5.8 / 8</strong></span>
          </div>
        </div>

        <!-- Bottleneck Insight Footer -->
        <div class="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 leading-relaxed font-medium">
          <strong class="font-bold text-slate-900">Bottleneck:</strong> Proposal stage — deals sit 18 days (2× other stages) and 70% of losses happen here. Fix proposals, not prospecting.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stages: {
    type: Array,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// System Deal Stages matching CRM dropdown (Qualification, Demo/Making, Proposal/Quotation, Negotiation, Ready to Close)
const defaultStages = [
  { name: 'Qualification', count: 1, valueFmt: '60,000', widthPct: 40, barColorClass: 'bg-blue-300' },
  { name: 'Demo/Making', count: 1, valueFmt: '1.20 L', widthPct: 85, barColorClass: 'bg-blue-400' },
  { name: 'Proposal/Quotation', count: 1, valueFmt: '45,000', widthPct: 30, barColorClass: 'bg-blue-600' },
  { name: 'Negotiation', count: 1, valueFmt: '85,000', widthPct: 60, barColorClass: 'bg-blue-900' },
  { name: 'Ready to Close', count: 0, valueFmt: '0', widthPct: 15, barColorClass: 'bg-blue-300' }
]

const displayStages = computed(() => {
  if (!props.stages || props.stages.length === 0) {
    return defaultStages
  }

  // Map backend stages if provided
  const maxVal = Math.max(...props.stages.map(s => s.stage_value || s.value || 1), 1)
  const barColors = ['bg-blue-300', 'bg-blue-400', 'bg-blue-600', 'bg-blue-900']

  return props.stages.map((stg, idx) => {
    const val = stg.stage_value || stg.value || 0
    let valueFmt = '0.00 Cr'
    if (val >= 10000000) {
      valueFmt = `${(val / 10000000).toFixed(2)} Cr`
    } else if (val >= 100000) {
      valueFmt = `${(val / 100000).toFixed(2)} L`
    } else {
      valueFmt = val.toLocaleString('en-IN')
    }

    return {
      name: stg.stage || stg.stage_name || stg.name || 'Stage',
      count: stg.deal_count || stg.count || 0,
      valueFmt,
      widthPct: Math.max(Math.round((val / maxVal) * 80), 15),
      barColorClass: barColors[idx % barColors.length]
    }
  })
})
</script>
