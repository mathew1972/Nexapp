<template>
  <div class="overflow-auto w-full h-full min-h-[300px]">
    <table v-if="data && data.rows && data.rows.length" class="min-w-full text-left border-collapse">
      <thead class="bg-gray-50 sticky top-0">
        <tr>
          <th v-for="col in columns" :key="col" class="px-4 py-2 border-b font-semibold text-gray-700 text-sm">
            {{ col }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        <tr v-for="(row, idx) in data.rows" :key="idx" class="hover:bg-gray-50">
          <td v-for="col in columns" :key="col" class="px-4 py-2 text-sm text-gray-600">
            {{ row[col] }}
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="text-center py-8 text-gray-400 italic">
      No data to display
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, required: true },
  config: { type: Object, default: () => ({}) }
})

const columns = computed(() => {
  if (props.data && props.data.rows && props.data.rows.length > 0) {
    return Object.keys(props.data.rows[0])
  }
  return []
})
</script>
