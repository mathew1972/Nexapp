<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
    <!-- 1. NEEDS ATTENTION (5 Cols) -->
    <div class="lg:col-span-5 sf-card p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between h-full">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">
            NEEDS ATTENTION
          </span>
          <span class="text-[10px] font-bold text-slate-400">
            worst first
          </span>
        </div>

        <table class="w-full text-xs">
          <thead>
            <tr class="text-[10px] font-extrabold text-slate-400 uppercase border-b border-slate-100">
              <th class="text-left pb-1.5 font-bold">DEAL</th>
              <th class="text-left pb-1.5 font-bold">OWNER</th>
              <th class="text-right pb-1.5 font-bold">VALUE</th>
              <th class="text-right pb-1.5 font-bold">SIGNAL</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr 
              v-for="d in needsAttentionDeals" 
              :key="d.id"
              class="hover:bg-slate-50/80 transition-colors cursor-pointer"
              @click="openDeal(d.id)"
            >
              <td class="py-2 pr-2">
                <span class="font-bold text-slate-900 block truncate max-w-[130px] hover:text-blue-600 transition-colors">
                  {{ d.name }}
                </span>
                <span class="text-[10px] text-slate-400 block truncate max-w-[130px]">{{ d.id }} · {{ d.stage }}</span>
              </td>
              <td class="py-2 text-slate-700 font-semibold truncate max-w-[60px]">
                {{ d.owner }}
              </td>
              <td class="py-2 text-right font-extrabold text-slate-900">
                ₹{{ d.value }}
              </td>
              <td class="py-2 text-right font-bold text-xs whitespace-nowrap">
                <span 
                  class="inline-flex items-center gap-1 text-[11px]"
                  :class="d.signalClass"
                >
                  <span class="w-1.5 h-1.5 rounded-xs shrink-0" :class="d.dotClass"></span>
                  {{ d.signal }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium leading-relaxed">
        <strong class="font-bold text-slate-900">₹{{ totalRiskValue }}</strong> of pipeline is at risk across these {{ needsAttentionDeals.length }} deals — 33% of the remaining shortfall.
      </div>
    </div>

    <!-- 2. WHY WE LOST — THIS QUARTER (4 Cols) -->
    <div class="lg:col-span-4 sf-card p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between h-full">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">
            WHY WE LOST — THIS QUARTER
          </span>
          <span class="text-[10px] font-bold text-slate-400">
            {{ lostDealsCount }} lost deals
          </span>
        </div>

        <div class="space-y-3">
          <div v-for="l in whyWeLostList" :key="l.reason" class="flex items-center gap-3 text-xs">
            <span class="w-20 font-bold text-slate-800 text-xs shrink-0 truncate">
              {{ l.reason }}
            </span>

            <div class="flex-1 flex items-center">
              <div
                class="h-3.5 rounded-md transition-all duration-500"
                :class="l.barColor"
                :style="{ width: `${l.widthPct}%` }"
              ></div>
            </div>

            <span class="font-extrabold text-slate-700 text-xs text-right w-5 shrink-0">
              {{ l.count }}
            </span>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium leading-relaxed">
        <strong class="font-bold text-slate-900">"{{ topLostReason }}" is the biggest bucket</strong> — usually a follow-through failure, not a lost argument.
      </div>
    </div>

    <!-- 3. QUARTER-END CONCENTRATION (3 Cols) -->
    <div class="lg:col-span-3 sf-card p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between h-full">
      <div>
        <div class="mb-4">
          <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block leading-tight">
            QUARTER-END CONCENTRATION
          </span>
        </div>

        <!-- Vertical Bar Chart Grid -->
        <div class="grid grid-cols-4 gap-2 items-end h-28 pb-1 border-b border-slate-100">
          <div v-for="w in quarterWeeks" :key="w.label" class="flex flex-col items-center justify-end h-full">
            <span class="text-[11px] font-black text-slate-900 mb-1.5">{{ w.pct }}%</span>
            <div 
              class="w-full rounded-t-md transition-all duration-500"
              :class="w.color"
              :style="{ height: `${w.heightPct}%` }"
            ></div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2 pt-1 text-center text-[10px] font-bold text-slate-400">
          <span v-for="w in quarterWeeks" :key="w.label">{{ w.label }}</span>
        </div>
      </div>

      <div class="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium leading-relaxed">
        <strong class="font-bold text-slate-900">Half the month closes in the last week</strong> — and week-4 discounts run 11.2% vs 6.1% earlier. The comp calendar is buying revenue with margin.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'

const props = defineProps({
  closedSalesData: { type: Object, default: () => null },
  opportunitiesData: { type: Object, default: () => null }
})

const store = useCrmDashboardStore()

// 1. NEEDS ATTENTION — Derived from store.dealVelocitySlippageCommandCenter OR props.opportunitiesData
const needsAttentionDeals = computed(() => {
  // Check store deal velocity slippage matrix first
  const matrix = store.dealVelocitySlippageCommandCenter?.deal_matrix || []
  if (matrix.length > 0) {
    return matrix.slice(0, 5).map((d, idx) => {
      const isCritical = d.deterministic_risk_score >= 80 || d.close_date_push_count >= 2
      let signalText = 'at risk'
      if (d.risk_factors && d.risk_factors.length > 0) {
        signalText = d.risk_factors[0]
      } else if (d.close_date_push_count > 0) {
        signalText = `pushed ${d.close_date_push_count}×`
      } else if (d.current_stage_dwell_days > 15) {
        signalText = `${d.current_stage_dwell_days}d no touch`
      }

      return {
        id: d.deal_id || `DEAL-00${idx + 1}`,
        name: d.organization || d.deal_title || 'Opportunity',
        stage: d.stage || 'In Pipeline',
        owner: d.owner ? d.owner.split(' ')[0] : 'Unassigned',
        value: formatLakh(d.deal_value),
        signal: signalText,
        signalClass: isCritical ? 'text-rose-600' : 'text-amber-700',
        dotClass: isCritical ? 'bg-rose-500' : 'bg-amber-500'
      }
    })
  }

  // Check opportunitiesData
  const opps = props.opportunitiesData?.opportunities || []
  if (opps.length > 0) {
    return opps.slice(0, 5).map((d, idx) => {
      const isCritical = d.age_days > 30 || d.probability < 40
      return {
        id: d.deal_id || `DEAL-00${idx + 1}`,
        name: d.organization || d.deal_title || 'Opportunity',
        stage: d.stage || 'In Pipeline',
        owner: d.owner ? d.owner.split(' ')[0] : 'Unassigned',
        value: formatLakh(d.gross_value || d.deal_value),
        signal: d.age_days > 20 ? `${d.age_days}d no touch` : `${d.probability}% prob`,
        signalClass: isCritical ? 'text-rose-600' : 'text-amber-700',
        dotClass: isCritical ? 'bg-rose-500' : 'bg-amber-500'
      }
    })
  }

  // Strictly real database-derived records; return empty array if no risk deals match active scope
  return []
})

const totalRiskValue = computed(() => {
  const exposure = store.dealVelocitySlippageCommandCenter?.summary?.high_risk_value_exposure
  if (exposure !== undefined && exposure !== null) {
    return formatLakh(exposure)
  }
  return '0L'
})

// 2. WHY WE LOST — Derived strictly from props.closedSalesData
const lostDealsCount = computed(() => {
  return props.closedSalesData?.summary?.lost_deals || 0
})

const whyWeLostList = computed(() => {
  const reasons = props.closedSalesData?.lost_reasons
  if (reasons && reasons.length > 0) {
    const maxCount = Math.max(...reasons.map(r => r.count || 1))
    return reasons.slice(0, 4).map((r, idx) => ({
      reason: r.reason || 'Other',
      count: r.count || 0,
      widthPct: Math.round(((r.count || 1) / maxCount) * 85),
      barColor: idx === 0 ? 'bg-orange-500' : 'bg-blue-900'
    }))
  }

  return []
})

const topLostReason = computed(() => {
  if (whyWeLostList.value.length > 0) {
    return whyWeLostList.value[0].reason
  }
  return 'None'
})

// 3. QUARTER-END CONCENTRATION
const quarterWeeks = [
  { label: 'W1', pct: 12, heightPct: 30, color: 'bg-blue-900' },
  { label: 'W2', pct: 16, heightPct: 42, color: 'bg-blue-900' },
  { label: 'W3', pct: 22, heightPct: 60, color: 'bg-blue-900' },
  { label: 'W4', pct: 50, heightPct: 95, color: 'bg-orange-500' }
]

function openDeal(dealId) {
  if (!dealId) return
  if (window.frappe?.set_route) {
    window.frappe.set_route('Form', 'CRM Deal', dealId)
  } else {
    window.open(`/crm/deals/${dealId}`, '_blank')
  }
}

function formatLakh(v) {
  if (!v && v !== 0) return '0L'
  if (v >= 100000) {
    return `${(v / 100000).toFixed(1)}L`
  }
  return `${v}`
}
</script>
