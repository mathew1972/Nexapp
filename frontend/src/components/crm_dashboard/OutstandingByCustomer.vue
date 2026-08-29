<template>
  <div class="sf-card p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between h-full">
    <div>
      <!-- Card Header -->
      <div class="flex items-center justify-between mb-3">
        <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">
          OUTSTANDING — BY CUSTOMER
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

      <!-- Top Summary Box (Hero Total + 4 Aging Cards) as shown in image -->
      <div 
        @click="showModal = true"
        class="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-xl transition-all cursor-pointer group"
      >
        <!-- Top Line: Hero Total Amount -->
        <div class="mb-3 flex items-center justify-between">
          <span class="text-3xl font-black text-slate-900 leading-none tracking-tight">
            {{ formatLakh(grandTotal) }}
          </span>
          <span class="text-[11px] font-extrabold text-slate-400 group-hover:text-blue-600 transition-colors flex items-center gap-1">
            <span>Click for details</span>
            <span>→</span>
          </span>
        </div>

        <!-- 4 Aging Buckets Summary Row (0–30d, 31–60d, 61–90d, 90+d) -->
        <div class="grid grid-cols-4 gap-1.5">
          <!-- Bucket 1: 0–30d -->
          <div class="p-1.5 sm:p-2 bg-white rounded-lg border border-slate-200/80 text-center shadow-2xs overflow-hidden">
            <div class="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
              {{ formatLakh(totalsBucket.aging_0_30) }}
            </div>
            <div class="text-[10px] font-bold text-slate-400 mt-1 whitespace-nowrap">
              0–30d
            </div>
          </div>

          <!-- Bucket 2: 31–60d -->
          <div class="p-1.5 sm:p-2 bg-white rounded-lg border border-amber-200/80 text-center shadow-2xs overflow-hidden">
            <div class="text-xs sm:text-sm font-black text-amber-700 leading-tight truncate">
              {{ formatLakh(totalsBucket.aging_31_60) }}
            </div>
            <div class="text-[10px] font-bold text-amber-600 mt-1 whitespace-nowrap">
              31–60d
            </div>
          </div>

          <!-- Bucket 3: 61–90d -->
          <div class="p-1.5 sm:p-2 bg-white rounded-lg border border-orange-200/80 text-center shadow-2xs overflow-hidden">
            <div class="text-xs sm:text-sm font-black text-orange-700 leading-tight truncate">
              {{ formatLakh(totalsBucket.aging_61_90) }}
            </div>
            <div class="text-[10px] font-bold text-orange-600 mt-1 whitespace-nowrap">
              61–90d
            </div>
          </div>

          <!-- Bucket 4: 90+d (Risk Highlighting) -->
          <div class="p-1.5 sm:p-2 bg-white rounded-lg border border-rose-200/80 text-center shadow-2xs overflow-hidden">
            <div class="text-xs sm:text-sm font-black text-rose-600 leading-tight truncate">
              {{ formatLakh(totalsBucket.aging_90_plus) }}
            </div>
            <div class="text-[10px] font-bold text-rose-600 mt-1 whitespace-nowrap">
              90+d
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- POPUP MODAL FOR CUSTOMER DETAILS WITH SEARCH -->
    <Teleport to="body">
      <div 
        v-if="showModal" 
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="showModal = false"
      >
        <div class="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
          
          <!-- Modal Header -->
          <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 class="text-base font-extrabold text-slate-900 tracking-tight">
                Customer Outstanding Receivables Breakdown
              </h3>
              <p class="text-xs text-slate-500 font-medium">
                Detailed aging breakdown by customer account
              </p>
            </div>
            <button
              @click="showModal = false"
              class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition-all"
            >
              ✕
            </button>
          </div>

          <!-- Modal Sub-header: Dynamic Hero total & Search Input -->
          <div class="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-xs font-semibold text-slate-400">Total Outstanding</span>
              <div class="text-2xl font-black text-slate-900">
                {{ formatLakh(grandTotal) }}
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

          <!-- Modal Body Table Content -->
          <div class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
            <!-- Loading Skeleton State -->
            <div v-if="loading" class="h-44 bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
              Loading customer balances...
            </div>

            <!-- Empty State -->
            <div v-else-if="!sortedCustomers || sortedCustomers.length === 0" class="py-12 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              {{ searchQuery ? `No customers matching "${searchQuery}"` : 'No outstanding customer balances found.' }}
            </div>

            <!-- Customer Breakdown Table -->
            <div v-else class="space-y-1.5">
              <!-- Table Column Headers -->
              <div class="grid grid-cols-12 items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] uppercase font-black text-slate-400">
                <div class="col-span-4 font-bold text-slate-500">Customer</div>
                <div class="col-span-6 grid grid-cols-4 gap-1 text-right">
                  <span>0–30</span>
                  <span>31–60</span>
                  <span>61–90</span>
                  <span class="text-rose-600 font-black">90+</span>
                </div>
                <div class="col-span-2 text-right">Total</div>
              </div>

              <!-- Customer Rows -->
              <div
                v-for="item in sortedCustomers"
                :key="item.customer"
                class="px-3 py-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all grid grid-cols-12 items-center gap-2 text-xs"
              >
                <!-- Customer Name -->
                <div class="col-span-4 font-bold text-slate-900 truncate flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full shrink-0" :class="item.aging_90_plus > 0 ? 'bg-rose-500' : 'bg-slate-300'"></span>
                  <span class="truncate text-xs">{{ item.customer }}</span>
                </div>

                <!-- Four Aging Bucket Amounts -->
                <div class="col-span-6 grid grid-cols-4 gap-1 text-right font-extrabold text-xs">
                  <span class="text-slate-800">
                    {{ formatLakh(item.aging_0_30) }}
                  </span>
                  <span class="text-amber-700">
                    {{ formatLakh(item.aging_31_60) }}
                  </span>
                  <span class="text-orange-700">
                    {{ formatLakh(item.aging_61_90) }}
                  </span>
                  <span :class="item.aging_90_plus > 0 ? 'text-rose-600 font-black bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 inline-block' : 'text-slate-400 font-medium'">
                    {{ formatLakh(item.aging_90_plus) }}
                  </span>
                </div>

                <!-- Total Outstanding -->
                <div class="col-span-2 text-right font-black text-slate-900 text-xs">
                  {{ formatLakh(item.total) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-3 px-5 border-t border-slate-100 bg-slate-50/50 flex justify-start items-center text-xs text-slate-500 font-medium">
            Showing {{ sortedCustomers.length }} customer account(s)
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
  },
  collectionsMetrics: {
    type: Object,
    default: null
  }
})

// Modal Popup Reactive State
const showModal = ref(false)

// Search Query Reactive State
const searchQuery = ref('')

// Base dataset source: strictly real database-derived items from prop or store
const rawCustomerData = computed(() => {
  return (props.items && props.items.length > 0) ? props.items : []
})

// Normalize items, filter by search query, compute customer total, and sort by total descending
const sortedCustomers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  
  return rawCustomerData.value
    .filter(c => {
      if (!query) return true
      return (c.customer || '').toLowerCase().includes(query)
    })
    .map(c => {
      const a0_30 = Number(c.aging_0_30 || 0)
      const a31_60 = Number(c.aging_31_60 || 0)
      const a61_90 = Number(c.aging_61_90 || 0)
      const a90_plus = Number(c.aging_90_plus || 0)
      const total = a0_30 + a31_60 + a61_90 + a90_plus
      return {
        customer: c.customer || 'Unknown Customer',
        aging_0_30: a0_30,
        aging_31_60: a31_60,
        aging_61_90: a61_90,
        aging_90_plus: a90_plus,
        total
      }
    })
    .sort((a, b) => b.total - a.total)
})

// Calculate sum total across all 4 aging buckets for the active filtered customer list
const totalsBucket = computed(() => {
  return sortedCustomers.value.reduce(
    (acc, c) => {
      acc.aging_0_30 += c.aging_0_30
      acc.aging_31_60 += c.aging_31_60
      acc.aging_61_90 += c.aging_61_90
      acc.aging_90_plus += c.aging_90_plus
      return acc
    },
    { aging_0_30: 0, aging_31_60: 0, aging_61_90: 0, aging_90_plus: 0 }
  )
})

// Calculate grand total aggregate sum across active filtered customer balances
const grandTotal = computed(() => {
  return totalsBucket.value.aging_0_30 + totalsBucket.value.aging_31_60 + totalsBucket.value.aging_61_90 + totalsBucket.value.aging_90_plus
})

// Format amount to Indian Lakh notation (e.g. 1400000 -> ₹14L, 1250000 -> ₹12.5L, 50000 -> ₹50k, 0 -> ₹0)
function formatLakh(val) {
  if (val === null || val === undefined || val === 0) return '₹0'
  const lakhVal = val / 100000
  if (lakhVal >= 1) {
    const formattedNum = Number.isInteger(lakhVal) ? lakhVal.toString() : lakhVal.toFixed(1)
    return `₹${formattedNum}L`
  }
  return `₹${(val / 1000).toFixed(0)}k`
}
</script>
