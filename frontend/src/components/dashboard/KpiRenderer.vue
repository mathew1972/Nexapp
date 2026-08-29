<template>
  <div class="flex flex-col items-center justify-center w-full h-full min-h-[150px] bg-white rounded p-4">
    <div class="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
      {{ measureName }}
    </div>
    <div class="text-4xl font-bold text-blue-600">
      {{ kpiValue }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, required: true },
  config: { type: Object, default: () => ({}) }
})

const measureName = computed(() => {
  const measures = props.config.measures || (props.data?.aggregations?.map(a => a.alias) || [])
  return measures[0] || 'KPI'
})

const kpiValue = computed(() => {
  if (!props.data || !props.data.rows || props.data.rows.length === 0) return '—'
  const measure = measureName.value
  
  // Return the first row's value for this measure
  const val = props.data.rows[0][measure]
  if (val === undefined) return '—'
  
  // Format as number if possible
  return typeof val === 'number' ? val.toLocaleString() : val
})
</script>
