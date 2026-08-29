<template>
  <div v-if="hasComparison" class="inline-flex items-center gap-1 font-sans text-xs">
    <!-- Direction Icon + Value Delta -->
    <span
      :class="[
        'inline-flex items-center font-bold px-1.5 py-0.5 rounded text-[10px] gap-0.5',
        badgeColorClass
      ]"
    >
      <span v-if="direction === 'up'">↑</span>
      <span v-else-if="direction === 'down'">↓</span>
      <span v-else>→</span>

      <span>{{ formattedDelta }}</span>
    </span>

    <!-- Comparison Period Label Context -->
    <span v-if="comparisonLabel" class="text-[10px] text-gray-500 font-medium">
      vs {{ comparisonLabel }}
    </span>
  </div>
  <div v-else-if="labelOnly" class="inline-flex items-center text-[10px] text-gray-400 font-medium italic">
    Not measurable vs {{ comparisonLabel || 'previous period' }}
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  current: { type: [Number, String], default: null },
  previous: { type: [Number, String], default: null },
  absoluteDelta: { type: [Number, String], default: null },
  percentageDelta: { type: [Number, String], default: null },
  ppDelta: { type: [Number, String], default: null },
  direction: { type: String, default: 'flat' }, // 'up' | 'down' | 'flat'
  managementEffect: { type: String, default: 'neutral' }, // 'positive' | 'negative' | 'neutral'
  comparisonLabel: { type: String, default: '' },
  isRatio: { type: Boolean, default: false },
  isCurrency: { type: Boolean, default: false },
  labelOnly: { type: Boolean, default: false }
})

const hasComparison = computed(() => {
  return props.previous !== null && props.previous !== undefined && (props.percentageDelta !== null || props.ppDelta !== null)
})

const formattedDelta = computed(() => {
  if (props.isRatio && props.ppDelta !== null && props.ppDelta !== undefined) {
    const val = Number(props.ppDelta)
    const prefix = val > 0 ? '+' : ''
    return `${prefix}${val.toFixed(1)} pp`
  }

  if (props.percentageDelta !== null && props.percentageDelta !== undefined) {
    const val = Number(props.percentageDelta)
    const prefix = val > 0 ? '+' : ''
    return `${prefix}${val.toFixed(1)}%`
  }

  if (props.absoluteDelta !== null && props.absoluteDelta !== undefined) {
    const val = Number(props.absoluteDelta)
    const prefix = val > 0 ? '+' : ''
    if (props.isCurrency) {
      return `${prefix}${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)}`
    }
    return `${prefix}${val}`
  }

  return '0.0%'
})

const badgeColorClass = computed(() => {
  if (props.managementEffect === 'positive') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  }
  if (props.managementEffect === 'negative') {
    return 'bg-rose-50 text-rose-700 border border-rose-200'
  }
  return 'bg-gray-100 text-gray-600 border border-gray-200'
})
</script>
