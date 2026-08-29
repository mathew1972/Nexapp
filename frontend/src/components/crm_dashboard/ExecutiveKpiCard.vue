<template>
  <div class="sf-card p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-150 hover:border-gray-300" :class="accentClass">
    <div class="mb-1">
      <span class="text-[10px] font-bold text-gray-500 tracking-wider uppercase">{{ title }}</span>
    </div>
    <div v-if="loading" class="space-y-2 my-1">
      <div class="w-24 h-7 bg-gray-100 animate-pulse rounded"></div>
      <div class="w-16 h-3 bg-gray-50 animate-pulse rounded"></div>
    </div>
    <div v-else>
      <div class="text-xl sm:text-2xl font-bold text-gray-900 leading-none tracking-tight">{{ formattedValue }}</div>

      <!-- Comparison Context: direction + delta + previous value -->
      <div v-if="comparison && comparison.previous !== null && comparison.previous !== undefined" class="mt-2 flex items-center gap-1.5 flex-wrap">
        <span
          class="text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-0.5"
          :class="comparison.management_effect === 'positive' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : comparison.management_effect === 'negative' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-gray-50 text-gray-600 border-gray-200'"
        >
          <span v-if="comparison.direction === 'up'">↑</span>
          <span v-else-if="comparison.direction === 'down'">↓</span>
          <span v-else>→</span>
          <span>{{ shortDelta }}</span>
        </span>
        <span class="text-[10px] text-gray-400 font-medium">
          vs {{ formattedPrevious }} {{ comparisonLabel ? comparisonLabel : '' }}
        </span>
      </div>
    </div>
    <p v-if="subtitle && !loading" class="text-[10px] text-gray-400 font-medium mt-2 truncate leading-tight">{{ subtitle }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: String,
  value: [Number, String],
  subtitle: { type: String, default: '' },
  formatter: { type: String, default: 'number' },
  loading: { type: Boolean, default: false },
  comparison: { type: Object, default: null },
  comparisonLabel: { type: String, default: '' },
  accent: { type: String, default: 'blue' }
})

const accentClass = computed(() => {
  // Derive accent from title context
  const t = (props.title || '').toLowerCase()
  if (t.includes('pipeline')) return 'border-l-2 border-l-blue-500'
  if (t.includes('closed') || t.includes('revenue') || t.includes('won')) return 'border-l-2 border-l-emerald-500'
  if (t.includes('win rate')) return 'border-l-2 border-l-blue-400'
  if (t.includes('average') || t.includes('deal size')) return 'border-l-2 border-l-slate-400'
  return 'border-l-2 border-l-gray-300'
})

const formattedValue = computed(() => {
  if (props.value === null || props.value === undefined) return '—'
  if (typeof props.value === 'string') return props.value
  if (props.formatter === 'currency') return fmtCurr(props.value)
  if (props.formatter === 'percent') return `${props.value.toFixed(1)}%`
  return new Intl.NumberFormat('en-IN').format(props.value)
})

const formattedPrevious = computed(() => {
  if (!props.comparison || props.comparison.previous === null || props.comparison.previous === undefined) return ''
  if (props.formatter === 'currency') return fmtCurr(props.comparison.previous)
  if (props.formatter === 'percent') return `${Number(props.comparison.previous).toFixed(1)}%`
  return new Intl.NumberFormat('en-IN').format(props.comparison.previous)
})

const shortDelta = computed(() => {
  if (!props.comparison) return ''
  if (props.formatter === 'percent' && props.comparison.pp_delta !== null && props.comparison.pp_delta !== undefined) {
    const v = Number(props.comparison.pp_delta)
    return `${v > 0 ? '+' : ''}${v.toFixed(1)}pp`
  }
  if (props.comparison.percentage_delta !== null && props.comparison.percentage_delta !== undefined) {
    const v = Number(props.comparison.percentage_delta)
    return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
  }
  return ''
})

function fmtCurr(v) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}
</script>
