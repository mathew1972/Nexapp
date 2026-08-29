<template>
  <div class="sf-card p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between h-full">
    <div>
      <!-- Card Header -->
      <div class="flex items-center justify-between mb-3">
        <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none pr-2">
          CIRCUIT DISCONNECTION IN PROCESS / DISCONNECTED
        </span>

        <!-- Square External Link Action Button with #3B82F6 -->
        <button
          @click="showModal = true"
          title="Open Details Popup"
          class="w-7 h-7 rounded-md bg-[#3B82F6] hover:bg-[#2563EB] active:scale-95 text-white flex items-center justify-center shadow-xs hover:shadow transition-all cursor-pointer shrink-0"
        >
          <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>

      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-semibold text-slate-400">
          {{ dateRangeLabel }}
        </span>
        <span class="text-[10px] font-bold text-slate-400 uppercase">
          Total: {{ grandTotalDisconnections }}
        </span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-8 space-y-2.5">
        <div v-for="i in 6" :key="i" class="h-7 bg-slate-100 animate-pulse rounded-lg"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!monthlyData || monthlyData.length === 0" class="py-8 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
        No circuit disconnection records found for the selected period.
      </div>

      <!-- Horizontal Bar Chart Items List (Clickable to open popup) -->
      <div 
        v-else 
        @click="showModal = true"
        class="space-y-3 py-1 cursor-pointer group rounded-xl p-1 hover:bg-slate-50/70 transition-all"
      >
        <div 
          v-for="item in monthlyData" 
          :key="item.month"
          class="flex items-center gap-3 text-xs"
        >
          <!-- Month Label (Left) -->
          <span class="w-16 font-bold text-slate-700 text-[11px] shrink-0 text-right">
            {{ item.month }}
          </span>

          <!-- Thin Pill Bar without background track -->
          <div class="flex-1 flex items-center gap-2">
            <div
              class="h-3.5 bg-[#DC2626] group-hover:bg-[#B91C1C] transition-all duration-500 rounded-full min-w-[12px]"
              :style="{ width: `${getBarWidth(item.count)}%` }"
            ></div>
            <!-- Count Value outside the bar -->
            <span class="text-xs font-black text-slate-900 leading-none shrink-0">
              {{ item.count }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- POPUP MODAL FOR CIRCUIT DISCONNECTION BREAKDOWN BY CUSTOMER -->
    <Teleport to="body">
      <div 
        v-if="showModal" 
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="showModal = false"
      >
        <div class="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
          
          <!-- Modal Header -->
          <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 class="text-base font-extrabold text-slate-900 tracking-tight">
                Circuit Disconnection In Process / Disconnected — By Customer
              </h3>
              <p class="text-xs text-slate-500 font-medium">
                Monthly breakdown of circuit disconnections per customer account ({{ dateRangeLabel }})
              </p>
            </div>
            <button
              @click="showModal = false"
              class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition-all"
            >
              ✕
            </button>
          </div>

          <!-- Modal Sub-header: Search Input -->
          <div class="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-xs font-semibold text-slate-400">Total Disconnection Instances</span>
              <div class="text-2xl font-black text-slate-900">
                {{ grandTotalDisconnections }}
              </div>
            </div>

            <!-- Customer Search Input Box inside Popup -->
            <div class="relative w-full sm:w-64">
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search customer name..."
                class="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 placeholder-slate-400 font-medium transition-all"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Modal Body Table Content (Columns: Customer, Mar 2026, Apr 2026, May 2026, Jun 2026, Jul 2026, Aug 2026, Total) -->
          <div class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
            <!-- Empty State -->
            <div v-if="!filteredCustomerBreakdown || filteredCustomerBreakdown.length === 0" class="py-12 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              {{ searchQuery ? `No customers matching "${searchQuery}"` : 'No disconnection records found.' }}
            </div>

            <!-- Customer Monthly Matrix Table -->
            <div v-else class="space-y-1.5">
              <!-- Table Column Headers matching the Excel layout requested by user -->
              <div class="grid grid-cols-12 items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] uppercase font-black text-slate-400">
                <div class="col-span-4 font-bold text-slate-500">Customer</div>
                <div class="col-span-6 grid grid-cols-6 gap-1 text-center">
                  <span v-for="m in monthHeaders" :key="m" class="truncate">{{ m }}</span>
                </div>
                <div class="col-span-2 text-right">Total</div>
              </div>

              <!-- Customer Rows -->
              <div
                v-for="row in filteredCustomerBreakdown"
                :key="row.customer"
                class="px-3 py-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all grid grid-cols-12 items-center gap-2 text-xs"
              >
                <!-- Customer Name -->
                <div class="col-span-4 font-bold text-slate-900 truncate flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full shrink-0" :class="row.total > 20 ? 'bg-rose-500' : 'bg-slate-300'"></span>
                  <span class="truncate text-xs">{{ row.customer }}</span>
                </div>

                <!-- Monthly Values -->
                <div class="col-span-6 grid grid-cols-6 gap-1 text-center font-extrabold text-xs">
                  <span 
                    v-for="(m, idx) in monthHeaders" 
                    :key="idx"
                    :class="row.monthlyCounts[m] > 0 ? 'text-slate-800 font-black' : 'text-slate-300 font-medium'"
                  >
                    {{ row.monthlyCounts[m] || 0 }}
                  </span>
                </div>

                <!-- Row Total -->
                <div class="col-span-2 text-right font-black text-rose-600 text-xs">
                  {{ row.total }}
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-3 px-5 border-t border-slate-100 bg-slate-50/50 flex justify-start items-center text-xs text-slate-500 font-medium">
            Showing {{ filteredCustomerBreakdown.length }} customer account(s)
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Modal Popup State
const showModal = ref(false)
const searchQuery = ref('')

// Generate rolling last 6 months headers dynamically
const dynamicLast6Months = computed(() => {
  const months = []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    months.push({
      month: monthStr,
      count: 0
    })
  }
  return months
})

const monthlyData = computed(() => {
  return (props.items && props.items.length > 0) ? props.items : []
})

const monthHeaders = computed(() => {
  return (props.items && props.items.length > 0) ? props.items.map(d => d.month) : dynamicLast6Months.value.map(d => d.month)
})

const dateRangeLabel = computed(() => {
  if (!monthlyData.value || monthlyData.value.length === 0) return ''
  const first = monthlyData.value[0]?.month || ''
  const last = monthlyData.value[monthlyData.value.length - 1]?.month || ''
  return `${first} - ${last}`
})

const filteredCustomerBreakdown = computed(() => {
  const items = (props.items && props.items.length > 0) ? props.items : []
  const query = searchQuery.value.trim().toLowerCase()
  return items
    .filter(row => {
      if (!query) return true
      return (row.customer || '').toLowerCase().includes(query)
    })
    .map(row => {
      const total = Object.values(row.monthlyCounts || {}).reduce((a, b) => a + Number(b || 0), 0)
      return {
        ...row,
        total
      }
    })
    .sort((a, b) => b.total - a.total)
})

const grandTotalDisconnections = computed(() => {
  if (props.items && props.items.length > 0) {
    return props.items.reduce((acc, row) => acc + (row.count || row.total || 0), 0)
  }
  return 0
})

const maxCount = computed(() => {
  if (!monthlyData.value || monthlyData.value.length === 0) return 1
  return Math.max(...monthlyData.value.map(d => d.count || 0), 1)
})

function getBarWidth(count) {
  if (!count) return 0
  const pct = (count / maxCount.value) * 100
  return Math.max(pct, 6)
}
</script>
