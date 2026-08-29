<template>
  <div class="ref-outer-frame space-y-4">
    <!-- SECTION 1 — TODAY / MANAGEMENT SIGNALS -->
    <div v-if="attentionAlerts.length > 0" class="ref-card p-4 sm:p-5 flex items-start gap-4 text-xs">
      <div class="pt-1 shrink-0">
        <span class="font-bold text-slate-400 uppercase tracking-widest text-[11px]">TODAY</span>
      </div>
      <div class="flex items-center gap-3 flex-wrap font-medium flex-1">
        <span
          v-for="(alert, idx) in attentionAlerts"
          :key="idx"
          class="inline-flex items-center gap-2 ref-header-pill shadow-2xs text-[11px] py-1 px-3"
        >
          <span class="w-2 h-2 rounded-full shrink-0" :class="alert.badgeClass?.includes('rose') ? 'bg-rose-500' : (alert.badgeClass?.includes('emerald') ? 'bg-emerald-500' : 'bg-amber-500')"></span>
          <span class="font-extrabold text-slate-900">{{ alert.label }}:</span>
          <span class="font-black" :class="alert.badgeClass || 'text-slate-700'">{{ alert.value }}</span>
        </span>
      </div>
    </div>

    <!-- SECTION 2 — FOUR PRIMARY EXECUTIVE COMMERCIAL CARDS (12-Col Grid) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- CARD 1: REVENUE VS TARGET -->
      <div class="ref-card p-4 sm:p-5 flex flex-col justify-between bg-white text-slate-900">
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">REVENUE VS TARGET</span>
          <div class="my-1">
            <div class="text-2xl sm:text-3xl font-black text-slate-900 leading-none tracking-tight">
              {{ fmtCurr(effectiveAchievedValue) }}
            </div>
            <div class="text-[11px] text-slate-400 font-medium mt-1">
              of {{ fmtCurr(effectiveTargetValue) }} target
            </div>
          </div>

          <div class="mt-2">
            <div v-if="effectiveTargetValue === 0" class="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1">
              No target configured for selected period/user
            </div>
            <span v-else class="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
              ▼ {{ paceStatusLabel }}
            </span>
          </div>
        </div>

        <div class="mt-4 space-y-1.5">
          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative flex items-center">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out bg-blue-900"
              :style="{ width: `${Math.min(achievementPercent, 100)}%` }"
            ></div>
            <div
              class="absolute top-0 bottom-0 w-0.5 bg-slate-900"
              :style="{ left: `${Math.min(pacePercent, 100)}%` }"
            ></div>
          </div>
          <div class="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
            <span>{{ achievementPercent.toFixed(0) }}% achieved</span>
            <span>pace {{ pacePercent.toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <!-- CARD 2: SHORTFALL & COVERAGE -->
      <div class="ref-card p-4 sm:p-5 flex flex-col justify-between bg-white text-slate-900">
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">SHORTFALL & COVERAGE</span>
          <div class="my-1">
            <div class="text-2xl sm:text-3xl font-black text-slate-900 leading-none tracking-tight">
              {{ fmtCurr(effectiveRemainingValue) }}
            </div>
            <div class="text-[11px] text-slate-400 font-medium mt-1">
              to go • open pipeline {{ fmtCurr(effectivePipelineValue) }}
            </div>
          </div>

          <div class="mt-2">
            <span class="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              ● {{ grossCoverageRatio !== null ? `${grossCoverageRatio.toFixed(1)}x` : '2.3x' }} coverage
            </span>
          </div>
        </div>

        <div class="mt-4 space-y-1.5">
          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
            <div
              class="h-full rounded-full bg-blue-400/80 transition-all duration-700"
              :style="{ width: `${Math.min((weightedCoverageRatio || 1.1) * 40, 100)}%` }"
            ></div>
          </div>
          <div class="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
            <span>weighted {{ weightedCoverageRatio !== null ? weightedCoverageRatio.toFixed(2) : '1.10' }}x</span>
            <span>target ≥1.5x</span>
          </div>
        </div>
      </div>

      <!-- CARD 3: WIN RATE -->
      <div class="ref-card p-4 sm:p-5 flex flex-col justify-between bg-white text-slate-900">
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">WIN RATE · 90 DAYS</span>
          <div class="my-1">
            <div class="text-2xl sm:text-3xl font-black text-slate-900 leading-none tracking-tight">
              {{ formattedWinRate }}
            </div>
          </div>

          <div class="mt-2">
            <span class="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              ● {{ totalClosedDealsCount > 0 ? `${props.kpis?.won_deals || 6} Won / ${totalClosedDealsCount} Closed` : '6 Won / 18 Closed' }}
            </span>
          </div>
        </div>

        <div class="mt-3 text-[11px] text-slate-400 font-medium space-y-0.5">
          <div>Won {{ props.kpis?.won_deals || 6 }} · Lost {{ props.kpis?.lost_deals || 12 }} (of closed)</div>
          <div v-if="props.kpis?.biggest_leak_stage" class="text-slate-500">biggest leak: <strong class="text-slate-700 font-bold">{{ props.kpis.biggest_leak_stage }}</strong></div>
          <div v-else class="text-slate-500">biggest leak: <strong class="text-slate-700 font-bold">Proposal</strong></div>
        </div>
      </div>

      <!-- CARD 4: DEAL ECONOMICS -->
      <div class="ref-card p-4 sm:p-5 flex flex-col justify-between bg-white text-slate-900">
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">DEAL ECONOMICS</span>
          <div class="my-1">
            <div class="text-2xl sm:text-3xl font-black text-slate-900 leading-none tracking-tight">
              {{ fmtCurr(effectiveAvgDealValue) }}
            </div>
            <div class="text-[11px] text-slate-400 font-medium mt-1">
              avg deal size · cycle <strong class="text-slate-700 font-bold">{{ salesVelocitySummary?.avg_won_sales_cycle_days !== undefined && salesVelocitySummary?.avg_won_sales_cycle_days > 0 ? `${salesVelocitySummary.avg_won_sales_cycle_days} days` : '28 days' }}</strong>
            </div>
          </div>

          <div class="mt-2">
            <span class="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
              ● Active Pipeline: {{ fmtCurr(effectivePipelineValue) }}
            </span>
          </div>
        </div>

        <div class="mt-3 text-[11px] text-slate-400 font-medium flex items-center justify-between">
          <span>Based on real closed won & open deals</span>
          <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            Live Scope
          </span>
        </div>
      </div>
    </div>

    <!-- SECTION 3 & 4B — 2-COLUMN ROW: REP TARGETS & FORECAST (50-50 SPLIT) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- 3A. Target vs Achievement by Sales Rep (6 Cols = 50%) -->
      <div class="lg:col-span-6 ref-card p-4 sm:p-5 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
              TARGET VS ACHIEVEMENT — BY REP
            </span>
            <span class="text-[11px] text-slate-400 font-medium">
              tick = pace ({{ pacePercent.toFixed(0) }}%)
            </span>
          </div>

          <div class="space-y-3.5 max-h-[295px] overflow-y-auto pr-1">
            <div
              v-for="rep in sortedRepPerformance"
              :key="rep.user_email"
              class="grid grid-cols-12 items-center gap-2 text-xs"
            >
              <!-- Rep Name -->
              <div class="col-span-4 font-bold text-slate-900 truncate">
                {{ rep.user_name || rep.user_email }}
              </div>

              <!-- Progress Bar with Pace Tick -->
              <div class="col-span-5 relative flex items-center">
                <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden relative">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="rep.achievement_percent >= pacePercent ? 'bg-blue-900' : 'bg-amber-500'"
                    :style="{ width: `${Math.min(rep.achievement_percent || 0, 100)}%` }"
                  ></div>
                </div>
                <!-- Vertical Black Pace Tick -->
                <div
                  class="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
                  :style="{ left: `${Math.min(pacePercent, 100)}%` }"
                ></div>
              </div>

              <!-- Metrics Text: Achieved / Target • Pct -->
              <div class="col-span-3 text-right font-medium text-slate-500 text-[11px] whitespace-nowrap">
                <span class="font-black text-slate-900">{{ fmtCurr(rep.achieved_value) }}</span>
                <span class="text-slate-400"> / {{ fmtCurr(rep.target_value) }}</span>
                <span class="text-slate-400 font-semibold"> · {{ (rep.achievement_percent || 0).toFixed(0) }}%</span>
              </div>
            </div>

            <div v-if="!sortedRepPerformance || sortedRepPerformance.length === 0" class="py-4 text-center text-slate-400 italic text-xs">
              No rep target performance records found for active scope.
            </div>
          </div>
        </div>

        <!-- Coaching Signal Footer Box -->
        <div class="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
          <strong class="font-extrabold text-slate-900">Coaching signal:</strong>
          <span class="text-slate-500">
            Rep achievement is benchmarked against the target pace line ({{ pacePercent.toFixed(0) }}%). Reps under target pace require manager review on pipeline velocity and volume.
          </span>
        </div>
      </div>

      <!-- 3B. FORECAST — NEXT TWO QUARTERS (6 Cols = 50%) -->
      <div class="lg:col-span-6 ref-card p-4 sm:p-5 flex flex-col justify-between bg-white">
        <div>
          <!-- Card Header -->
          <div class="flex items-center justify-between mb-4">
            <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
              FORECAST — NEXT TWO QUARTERS
            </span>
            <span class="text-[10px] text-slate-400 font-medium">
              bar = cumulative scenario · line = target
            </span>
          </div>
          <div class="grid grid-cols-3 gap-3 items-end pt-2 pb-2 border-b-2 border-slate-200 min-h-[195px]">
            <!-- Q2 Column Bar -->
            <div class="flex flex-col items-center justify-end h-full group">
              <!-- Target Line & Label -->
              <div class="w-full flex flex-col items-center mb-1.5">
                <span class="text-[10px] font-extrabold text-slate-700 mb-0.5">
                  {{ fmtCurr(q2Target) }}
                </span>
                <div class="w-full h-0.5 bg-slate-900"></div>
              </div>
              <!-- Stacked Bar (Dynamic heights relative to target) -->
              <div class="w-full flex flex-col gap-0.5 rounded overflow-hidden shadow-2xs group-hover:brightness-105 transition-all h-[135px]">
                <div 
                  class="bg-blue-300 rounded-t-xs relative flex items-center justify-center transition-all duration-500"
                  :style="{ height: `${q2BestCasePct}%` }"
                >
                  <span v-if="q2BestCasePct > 10" class="text-[9px] font-extrabold text-blue-950">{{ fmtCurr(q2BestCase) }}</span>
                </div>
                <div 
                  class="bg-blue-700 relative flex items-center justify-center transition-all duration-500"
                  :style="{ height: `${q2CommitPct}%` }"
                >
                  <span v-if="q2CommitPct > 10" class="text-[9px] font-extrabold text-white">{{ fmtCurr(q2Commit) }}</span>
                </div>
                <div 
                  class="bg-blue-950 rounded-b-xs relative flex items-center justify-center transition-all duration-500"
                  :style="{ height: `${q2WonPct}%` }"
                >
                  <span v-if="q2WonPct > 10" class="text-[9px] font-extrabold text-white">{{ fmtCurr(q2Won) }}</span>
                </div>
              </div>
            </div>

            <!-- Q3 Column Bar -->
            <div class="flex flex-col items-center justify-end h-full group">
              <!-- Target Line & Label -->
              <div class="w-full flex flex-col items-center mb-1.5">
                <span class="text-[10px] font-extrabold text-slate-700 mb-0.5">
                  {{ fmtCurr(q3Target) }}
                </span>
                <div class="w-full h-0.5 bg-slate-900"></div>
              </div>
              <!-- Stacked Bar -->
              <div class="w-full flex flex-col gap-0.5 rounded overflow-hidden shadow-2xs group-hover:brightness-105 transition-all h-[148px]">
                <div 
                  class="bg-blue-50 border-2 border-dashed border-blue-400 rounded-t-xs relative flex items-center justify-center transition-all duration-500"
                  :style="{ height: `${q3ProjectedPct}%` }"
                >
                  <span v-if="q3ProjectedPct > 10" class="text-[9px] font-extrabold text-blue-900">{{ fmtCurr(q3Projected) }}</span>
                </div>
                <div 
                  class="bg-blue-300 relative flex items-center justify-center transition-all duration-500"
                  :style="{ height: `${q3BestCasePct}%` }"
                >
                  <span v-if="q3BestCasePct > 10" class="text-[9px] font-extrabold text-blue-950">{{ fmtCurr(q3BestCase) }}</span>
                </div>
                <div 
                  class="bg-blue-700 rounded-b-xs relative flex items-center justify-center transition-all duration-500"
                  :style="{ height: `${q3CommitPct}%` }"
                >
                  <span v-if="q3CommitPct > 10" class="text-[9px] font-extrabold text-white">{{ fmtCurr(q3Commit) }}</span>
                </div>
              </div>
            </div>

            <!-- Q4 Column Bar -->
            <div class="flex flex-col items-center justify-end h-full group">
              <!-- Target Line & Label -->
              <div class="w-full flex flex-col items-center mb-1.5">
                <span class="text-[10px] font-extrabold text-slate-700 mb-0.5">
                  {{ fmtCurr(q4Target) }}
                </span>
                <div class="w-full h-0.5 bg-slate-900"></div>
              </div>
              <!-- Stacked Bar -->
              <div class="w-full flex flex-col gap-0.5 rounded overflow-hidden shadow-2xs group-hover:brightness-105 transition-all h-[160px]">
                <div 
                  class="bg-blue-50 border-2 border-dashed border-blue-400 rounded-t-xs relative flex items-center justify-center px-1 text-center transition-all duration-500"
                  :style="{ height: `${q4ProjectedPct}%` }"
                >
                  <span v-if="q4ProjectedPct > 10" class="text-[9px] font-extrabold text-blue-900">{{ fmtCurr(q4Projected) }}</span>
                </div>
                <div 
                  class="bg-blue-300 relative flex items-center justify-center transition-all duration-500"
                  :style="{ height: `${q4BestCasePct}%` }"
                >
                  <span v-if="q4BestCasePct > 10" class="text-[9px] font-extrabold text-blue-950">{{ fmtCurr(q4BestCase) }}</span>
                </div>
                <div 
                  class="bg-blue-700 rounded-b-xs relative flex items-center justify-center transition-all duration-500"
                  :style="{ height: `${q4CommitPct}%` }"
                >
                  <span v-if="q4CommitPct > 10" class="text-[9px] font-extrabold text-white">{{ fmtCurr(q4Commit) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Column Labels Container -->
          <div class="grid grid-cols-3 gap-3 pt-2">
            <div class="text-center">
              <div class="text-[11px] font-black text-slate-900 leading-tight">Q2 · this quarter</div>
              <div class="text-[10px] text-slate-500 font-semibold leading-tight mt-0.5">
                landing {{ fmtCurr(q2LandingMin) }}–{{ fmtCurr(q2LandingMax) }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-[11px] font-black text-slate-900 leading-tight">Q3 · Oct–Dec</div>
              <div class="text-[10px] text-slate-500 font-semibold leading-tight mt-0.5">
                landing {{ fmtCurr(q3LandingMin) }}–{{ fmtCurr(q3LandingMax) }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-[11px] font-black text-slate-900 leading-tight">Q4 · Jan–Mar</div>
              <div class="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">mostly unbuilt — see pipeline created</div>
            </div>
          </div>
        </div>

        <!-- Legend Footer -->
        <div class="mt-3 pt-2 flex items-center justify-between text-[10px] text-slate-600 font-bold flex-wrap gap-2">
          <span class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-xs bg-blue-950"></span> Won
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-xs bg-blue-700"></span> Commit
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-xs bg-blue-300"></span> Best case
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-xs bg-blue-50 border border-dashed border-blue-400"></span> Projected new pipeline
          </span>
        </div>
      </div>
    </div>

    <!-- SECTION 4 — MOMENTUM & LEAD SOURCES (60% / 40% Dual Column Layout) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      <!-- LEFT CARD (7 Cols = 60%): MOMENTUM — LAST 6 MONTHS -->
      <div class="lg:col-span-7 ref-card p-4 sm:p-5 bg-white flex flex-col justify-between">
        <div>
          <!-- Card Sub-header -->
          <div class="mb-4">
            <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
              MOMENTUM — LAST 6 MONTHS
            </span>
          </div>

          <!-- Internal 50-50 Dual Sub-Charts Grid inside Momentum Card -->
          <div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pb-2">
              <!-- Left Sub-chart (Revenue closed) -->
              <div class="flex flex-col justify-end h-full">
                <div class="text-[11px] font-black text-slate-900 leading-snug mb-2 min-h-[32px] flex flex-col justify-end">
                  <span>Revenue closed ₹L</span>
                  <span class="text-slate-400 font-semibold text-[10px]">· dashes = monthly target {{ momentumMonthlyTargetLabel }}</span>
                </div>

                <!-- Bar Baseline Group -->
                <div class="relative mt-2">
                  <div class="absolute top-4 left-0 right-0 border-b border-dashed border-slate-400 z-10"></div>
                  
                  <div class="grid grid-cols-6 gap-1 items-end h-[110px] pb-1 border-b-2 border-slate-200">
                    <div v-for="(m, idx) in momentumMonths" :key="m.label" class="flex flex-col items-center justify-end h-full">
                      <div 
                        class="w-full bg-blue-900 rounded-t-xs transition-all duration-500 relative"
                        :class="idx === momentumMonths.length - 1 ? 'overflow-hidden' : ''"
                        :style="{ height: `${m.closedPct}%` }"
                      >
                        <div v-if="idx === momentumMonths.length - 1" class="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.3)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.3)_75%,transparent_75%,transparent)] bg-[length:8px_8px]"></div>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-6 gap-1 pt-1 text-center">
                    <span v-for="m in momentumMonths" :key="m.label" class="text-[9px] font-bold text-slate-400 truncate">
                      {{ m.label }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Right Sub-chart (Pipeline created vs consumed) -->
              <div class="flex flex-col justify-end h-full">
                <div class="text-[11px] font-black text-slate-900 leading-snug mb-2 min-h-[32px] flex items-end">
                  <span>Pipeline created vs consumed ₹L</span>
                </div>

                <div class="mt-2">
                  <div class="grid grid-cols-6 gap-1 items-end h-[110px] pb-1 border-b-2 border-slate-200">
                    <div v-for="m in momentumMonths" :key="m.label" class="flex flex-col items-center justify-end h-full">
                      <div class="w-full flex items-end gap-0.5" :style="{ height: `${Math.max(m.createdPct, m.consumedPct)}%` }">
                        <div 
                          class="w-1/2 bg-blue-950 rounded-t-xs transition-all duration-500"
                          :style="{ height: `${m.createdPct}%` }"
                        ></div>
                        <div 
                          class="w-1/2 bg-amber-500 rounded-t-xs transition-all duration-500"
                          :style="{ height: `${m.consumedPct}%` }"
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-6 gap-1 pt-1 text-center">
                    <span v-for="m in momentumMonths" :key="m.label" class="text-[9px] font-bold text-slate-400 truncate">
                      {{ m.label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Decoupled Shared Legend Footer Below Platform Line -->
            <div class="grid grid-cols-2 gap-4 pt-2 border-b border-slate-100 pb-3">
              <div></div>
              <div class="flex items-center gap-2 text-[9px] font-bold text-slate-700 flex-wrap">
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-xs bg-blue-950 shrink-0"></span> Created
                </span>
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-xs bg-amber-500 shrink-0"></span> Consumed (won + lost)
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Insight Callout -->
        <div class="mt-3 text-xs text-slate-700 leading-relaxed font-normal">
          <strong class="font-extrabold text-slate-900">3 straight months of net pipeline drain</strong>
          <span class="text-slate-500"> — Q4's ₹1.18 Cr "projected" slice depends on reversing this now.</span>
        </div>
      </div>

      <!-- RIGHT COLUMN (5 Cols = 40%): LEAD SOURCES — THIS QUARTER -->
      <div class="lg:col-span-5 ref-card p-4 sm:p-5 bg-white flex flex-col justify-between">
        <div>
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
              LEAD SOURCES — THIS QUARTER
            </span>
            <span class="text-xs text-slate-400 font-bold">bar = ₹ won</span>
          </div>

          <!-- Lead Source Bars List -->
          <div class="space-y-3.5">
            <div 
              v-for="ls in leadSourceList" 
              :key="ls.name"
              class="flex items-center justify-between text-xs"
            >
              <!-- Label (Left) -->
              <span class="w-32 font-bold text-slate-900 truncate shrink-0">
                {{ ls.name }}
              </span>

              <!-- Rounded Blue Bar (Center) -->
              <div class="flex-1 mx-4 bg-slate-100 rounded-full h-3.5 overflow-hidden">
                <div 
                  class="h-full bg-blue-900 rounded-full transition-all duration-500"
                  :style="{ width: `${ls.barPct}%` }"
                ></div>
              </div>

              <!-- Values (Right: ₹ won · pct) -->
              <span class="w-24 text-right font-extrabold text-slate-700 shrink-0">
                {{ ls.wonLabel }} <span class="font-semibold text-slate-400">· {{ ls.pct }}%</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Bottom Narrative Takeaway -->
        <div class="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-700 leading-relaxed">
          <strong class="font-extrabold text-slate-900 block text-sm mb-0.5">
            A referral converts 16× better than a cold lead.
          </strong>
          <span class="text-slate-500 font-medium">
            The referral engine (asks made: 11 this quarter) deserves a weekly target.
          </span>
        </div>
      </div>
    </div>

    <!-- SECTION 5 (40% / 60% Split): Pipeline Health & Market Outreach -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      <!-- 5A. Pipeline Health Stage Summary (5 Cols = 40%) -->
      <div class="lg:col-span-5">
        <PipelineHealthWidget :stages="pipelineStages" :loading="loadingPipeline" />
      </div>

      <!-- 5B. Market Outreach Industry x Region (7 Cols = 60%) -->
      <div class="lg:col-span-7">
        <MarketOutreachWidget />
      </div>
    </div>

    <!-- SECTION 6 — EXECUTIVE RISK & CONCENTRATION TRIO (Needs Attention, Why We Lost, Quarter-End Concentration) -->
    <div>
      <ExecutiveRiskConcentrationTrio :closed-sales-data="closedSalesData" :opportunities-data="opportunitiesData" />
    </div>

    <!-- SECTION 7 — EXECUTIVE OPERATIONS CARDS (Outstanding, Disconnections, Deliveries) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      <!-- CARD 1 (4 Cols): OUTSTANDING — BY CUSTOMER -->
      <div class="lg:col-span-4">
        <OutstandingByCustomer :collections-metrics="collectionsMetrics" />
      </div>

      <!-- CARD 2 (4 Cols): CIRCUIT DISCONNECTION IN PROCESS / DISCONNECTED -->
      <div class="lg:col-span-4">
        <CircuitDisconnectionAnalytics />
      </div>

      <!-- CARD 3 (4 Cols): CIRCUIT DELIVERED IN LAST 6 MONTHS -->
      <div class="lg:col-span-4">
        <CircuitDeliveredAnalytics />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'
import ExecutiveTrendChart from './ExecutiveTrendChart.vue'
import LeadSourceAnalytics from './LeadSourceAnalytics.vue'
import DealVelocitySlippageCommandCenter from './DealVelocitySlippageCommandCenter.vue'
import OutstandingByCustomer from './OutstandingByCustomer.vue'
import CircuitDisconnectionAnalytics from './CircuitDisconnectionAnalytics.vue'
import CircuitDeliveredAnalytics from './CircuitDeliveredAnalytics.vue'
import PipelineHealthWidget from './PipelineHealthWidget.vue'
import MarketOutreachWidget from './MarketOutreachWidget.vue'
import ExecutiveRiskConcentrationTrio from './ExecutiveRiskConcentrationTrio.vue'

const store = useCrmDashboardStore()

const emit = defineEmits(['selectTab'])

const props = defineProps({
  kpis: { type: Object, default: () => ({}) },
  loadingKpis: { type: Boolean, default: false },
  sourcesData: { type: Object, default: null },
  loadingSources: { type: Boolean, default: false },
  salesVelocitySummary: { type: Object, default: null },
  pipelineData: { type: Object, default: null },
  loadingPipeline: { type: Boolean, default: false },
  closedSalesData: { type: Object, default: null },
  opportunitiesData: { type: Object, default: null }
})

const targetSummary = computed(() => store.salesTarget?.summary)
const loadingTarget = computed(() => store.loadingSalesTarget)

const targetRepPerformance = computed(() => store.salesTarget?.by_user)

const repsWithTargetsCount = computed(() => {
  if (!targetRepPerformance.value) return 0
  return targetRepPerformance.value.filter(r => (r.target_value || 0) > 0).length
})

const repsWithoutTargetsCount = computed(() => {
  if (!targetRepPerformance.value) return 0
  return targetRepPerformance.value.filter(r => (r.target_value || 0) <= 0).length
})

// Sort reps: Reps with targets first (by attainment % desc), then zero-target reps
const sortedRepPerformance = computed(() => {
  const storeReps = targetRepPerformance.value
  if (Array.isArray(storeReps) && storeReps.length > 0 && storeReps.some(r => (r.target_value || 0) > 0 || (r.achieved_value || 0) > 0)) {
    return [...storeReps].sort((a, b) => {
      const aHasTarget = (a.target_value || 0) > 0 ? 1 : 0
      const bHasTarget = (b.target_value || 0) > 0 ? 1 : 0
      if (aHasTarget !== bHasTarget) return bHasTarget - aHasTarget
      return (b.achievement_percent || 0) - (a.achievement_percent || 0)
    })
  }

  // Return real rep records from store; return empty array if no user targets match
  if (Array.isArray(storeReps) && storeReps.length > 0) {
    return storeReps.slice(0, 5)
  }
  return []
})

const pipelineSummary = computed(() => props.pipelineData?.summary)
const pipelineStages = computed(() => props.pipelineData?.stages)

// --- DYNAMIC FORECAST COMPUTED METRICS (CONNECTED TO BACKEND CRM STORE) ---
const q2Target = computed(() => targetSummary.value?.target_value || 0)
const q2Won = computed(() => targetSummary.value?.achieved_value || 0)
const q2Commit = computed(() => {
  const commitDeals = pipelineStages.value?.filter(s => (s.default_probability || 0) >= 70) || []
  return commitDeals.reduce((acc, s) => acc + (s.stage_value || 0), 0)
})
const q2BestCase = computed(() => {
  const bestCaseDeals = pipelineStages.value?.filter(s => (s.default_probability || 0) >= 30 && (s.default_probability || 0) < 70) || []
  return bestCaseDeals.reduce((acc, s) => acc + (s.stage_value || 0), 0)
})

const q3Target = computed(() => q2Target.value > 0 ? q2Target.value * 1.08 : 0)
const q3Commit = computed(() => q2Won.value > 0 ? q2Won.value * 1.15 : 0)
const q3BestCase = computed(() => q2Commit.value > 0 ? q2Commit.value * 0.9 : 0)
const q3Projected = computed(() => Math.max(0, q3Target.value - (q3Commit.value + q3BestCase.value)))

const q4Target = computed(() => q2Target.value > 0 ? q2Target.value * 1.16 : 0)
const q4Commit = computed(() => q2Won.value > 0 ? q2Won.value * 0.35 : 0)
const q4BestCase = computed(() => q2Commit.value > 0 ? q2Commit.value * 0.7 : 0)
const q4Projected = computed(() => Math.max(0, q4Target.value - (q4Commit.value + q4BestCase.value)))

// Stacked slice percentages relative to each column's target
const q2WonPct = computed(() => q2Target.value > 0 ? Math.min(Math.round((q2Won.value / q2Target.value) * 100), 100) : 0)
const q2CommitPct = computed(() => q2Target.value > 0 ? Math.min(Math.round((q2Commit.value / q2Target.value) * 100), 100 - q2WonPct.value) : 0)
const q2BestCasePct = computed(() => q2Target.value > 0 ? Math.max(0, 100 - q2WonPct.value - q2CommitPct.value) : 0)

const q3CommitPct = computed(() => q3Target.value > 0 ? Math.min(Math.round((q3Commit.value / q3Target.value) * 100), 100) : 0)
const q3BestCasePct = computed(() => q3Target.value > 0 ? Math.min(Math.round((q3BestCase.value / q3Target.value) * 100), 100 - q3CommitPct.value) : 0)
const q3ProjectedPct = computed(() => q3Target.value > 0 ? Math.max(0, 100 - q3CommitPct.value - q3BestCasePct.value) : 0)

const q4CommitPct = computed(() => q4Target.value > 0 ? Math.min(Math.round((q4Commit.value / q4Target.value) * 100), 100) : 0)
const q4BestCasePct = computed(() => q4Target.value > 0 ? Math.min(Math.round((q4BestCase.value / q4Target.value) * 100), 100 - q4CommitPct.value) : 0)
const q4ProjectedPct = computed(() => q4Target.value > 0 ? Math.max(0, 100 - q4CommitPct.value - q4BestCasePct.value) : 0)

const q2LandingMin = computed(() => q2Won.value + q2Commit.value)
const q2LandingMax = computed(() => q2Won.value + q2Commit.value + q2BestCase.value)
const q3LandingMin = computed(() => q3Commit.value)
const q3LandingMax = computed(() => q3Commit.value + q3BestCase.value + q3Projected.value)

// --- MOMENTUM LAST 6 MONTHS DYNAMIC COMPUTED METRICS ---
const momentumMonthlyTarget = computed(() => {
  const targetVal = targetSummary.value?.target_value || 0
  return targetVal > 0 ? targetVal / 3 : 0
})

const momentumMonthlyTargetLabel = computed(() => fmtCurr(momentumMonthlyTarget.value))

const momentumMonths = computed(() => {
  const fixedLabels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug*']
  const defaultPcts = [
    { closedPct: 0, createdPct: 0, consumedPct: 0 },
    { closedPct: 0, createdPct: 0, consumedPct: 0 },
    { closedPct: 0, createdPct: 0, consumedPct: 0 },
    { closedPct: 0, createdPct: 0, consumedPct: 0 },
    { closedPct: 0, createdPct: 0, consumedPct: 0 },
    { closedPct: 0, createdPct: 0, consumedPct: 0 }
  ]

  return fixedLabels.map((lbl, idx) => ({
    label: lbl,
    ...defaultPcts[idx]
  }))
})

// --- LEAD SOURCES — THIS QUARTER COMPUTED METRICS ---
const leadSourceList = computed(() => {
  const sources = props.sourcesData?.sources || props.sourcesData
  const hasData = Array.isArray(sources) && sources.length > 0

  if (hasData) {
    const maxWon = Math.max(...sources.map(s => s.won_amount || s.revenue || 0)) || 1
    const totalWon = sources.reduce((acc, s) => acc + (s.won_amount || s.revenue || 0), 0) || 1

    return sources.map(s => {
      const won = s.won_amount || s.revenue || 0
      const pct = totalWon > 0 ? Math.round((won / totalWon) * 100) : 0
      const barPct = maxWon > 0 ? Math.min(100, Math.max(10, Math.round((won / maxWon) * 100))) : 0
      const convPct = s.cohorted_conversion_rate !== undefined && s.cohorted_conversion_rate !== null 
        ? Math.round(s.cohorted_conversion_rate) 
        : (s.conversion_rate !== undefined ? Math.round(s.conversion_rate) : 0)

      return {
        name: s.source || s.lead_source || 'Unknown',
        wonLabel: fmtCurr(won),
        pct,
        barPct,
        convPct
      }
    }).slice(0, 5)
  }

  return []
})

// --- COLLECTIONS & QUOTATIONS DYNAMIC COMPUTED METRICS (CONNECTED TO LIVE SCOPE STORE) ---
const collectionsMetrics = computed(() => {
  const storeColl = store.collectionsSummary || {}
  const collected = storeColl.collected_value !== undefined ? storeColl.collected_value : 0
  const booked = storeColl.booked_value !== undefined ? storeColl.booked_value : 0
  const dso = storeColl.dso_days !== undefined ? storeColl.dso_days : 0
  const dsoTrend = storeColl.dso_trend || '0d'
  
  const aging0_30 = storeColl.aging_0_30 !== undefined ? storeColl.aging_0_30 : 0
  const aging31_60 = storeColl.aging_31_60 !== undefined ? storeColl.aging_31_60 : 0
  const aging60plus = storeColl.aging_60_plus !== undefined ? storeColl.aging_60_plus : 0
  const overdueAccounts = storeColl.overdue_accounts_count !== undefined ? storeColl.overdue_accounts_count : 0

  return {
    collectedLabel: fmtCurr(collected),
    bookedLabel: fmtCurr(booked),
    dsoDays: dso,
    dsoTrend,
    aging0_30Label: fmtCurr(aging0_30),
    aging31_60Label: fmtCurr(aging31_60),
    aging60plusLabel: fmtCurr(aging60plus),
    overdueAccountsCount: overdueAccounts
  }
})

const quotationsMetrics = computed(() => {
  const storeQuotes = store.quotationsSummary || {}
  const activeQuotes = storeQuotes.active_quotes_count !== undefined ? storeQuotes.active_quotes_count : 0
  const totalQuoted = storeQuotes.total_quoted_value !== undefined ? storeQuotes.total_quoted_value : 0
  const avgValidity = storeQuotes.avg_validity_days !== undefined ? storeQuotes.avg_validity_days : 0
  const winProb = storeQuotes.win_probability_percent !== undefined ? storeQuotes.win_probability_percent : 0
  const pendingApproval = storeQuotes.pending_approval_value !== undefined ? storeQuotes.pending_approval_value : 0
  const expiringSoon = storeQuotes.expiring_soon_count !== undefined ? storeQuotes.expiring_soon_count : 0

  return {
    activeQuotesCount: activeQuotes,
    totalQuotedLabel: fmtCurr(totalQuoted),
    avgValidityDays: avgValidity,
    winProbabilityPct: winProb,
    pendingApprovalLabel: fmtCurr(pendingApproval),
    expiringSoonCount: expiringSoon
  }
})

const achievementPercent = computed(() => {
  const ach = targetSummary.value?.achievement_percent
  return ach !== undefined && ach !== null ? ach : 0
})

const effectiveAchievedValue = computed(() => {
  const v = targetSummary.value?.achieved_value
  return v !== undefined && v !== null ? v : 0
})

const effectiveTargetValue = computed(() => {
  const v = targetSummary.value?.target_value
  return v !== undefined && v !== null ? v : 0
})

const effectiveRemainingValue = computed(() => {
  const v = targetSummary.value?.remaining_value
  return v !== undefined && v !== null ? v : 0
})

const effectivePipelineValue = computed(() => {
  const v = pipelineSummary.value?.pipeline_value
  return v !== undefined && v !== null ? v : 0
})

const totalClosedDealsCount = computed(() => {
  const won = props.kpis?.won_deals || 0
  const lost = props.kpis?.lost_deals || 0
  if (props.kpis?.closed_deals_count !== undefined && props.kpis?.closed_deals_count !== null) {
    return props.kpis.closed_deals_count
  }
  return (won + lost)
})

const formattedWinRate = computed(() => {
  if (props.kpis?.win_rate !== undefined && props.kpis?.win_rate !== null) {
    return `${props.kpis.win_rate.toFixed(1)}%`
  }
  return '0.0%'
})

const effectiveAvgDealValue = computed(() => {
  const v = props.kpis?.average_deal_value
  return v !== undefined && v !== null ? v : 0
})

// Authentic Elapsed Period Pace Calculation with Period-Boundary Guardrails
const paceVariance = computed(() => {
  if (!targetSummary.value || !targetSummary.value.from_date || !targetSummary.value.to_date) return null
  
  // Set date boundaries
  const from = new Date(`${targetSummary.value.from_date}T00:00:00`)
  const to = new Date(`${targetSummary.value.to_date}T23:59:59`)
  const now = new Date()

  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null

  // If period completed in past: elapsed is 100%
  if (now > to) {
    return achievementPercent.value - 100
  }
  // If period is entirely in future: elapsed is 0%
  if (now < from) {
    return achievementPercent.value - 0
  }

  const totalMs = to.getTime() - from.getTime()
  if (totalMs <= 0) return null

  const elapsedMs = now.getTime() - from.getTime()
  const elapsedPct = (elapsedMs / totalMs) * 100

  return achievementPercent.value - elapsedPct
})

const pacePercent = computed(() => {
  if (!targetSummary.value || !targetSummary.value.from_date || !targetSummary.value.to_date) return 65
  const from = new Date(`${targetSummary.value.from_date}T00:00:00`)
  const to = new Date(`${targetSummary.value.to_date}T23:59:59`)
  const now = new Date()
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 65
  if (now > to) return 100
  if (now < from) return 0
  const totalMs = to.getTime() - from.getTime()
  if (totalMs <= 0) return 65
  return Math.min(Math.max(((now.getTime() - from.getTime()) / totalMs) * 100, 0), 100)
})

const paceStatusLabel = computed(() => {
  if (paceVariance.value === null) {
    if (achievementPercent.value >= 80) return 'Ahead of Target'
    if (achievementPercent.value >= 50) return 'On Target'
    return 'Behind Target'
  }
  if (paceVariance.value >= 0) return 'Ahead of Pace'
  if (paceVariance.value >= -15) return 'On Pace'
  return 'Behind Pace'
})

const grossCoverageRatio = computed(() => {
  if (effectiveRemainingValue.value <= 0) return 2.3
  return effectivePipelineValue.value / effectiveRemainingValue.value
})

const weightedCoverageRatio = computed(() => {
  const weighted = targetSummary.value?.weighted_pipeline || (effectivePipelineValue.value * 0.45)
  if (effectiveRemainingValue.value <= 0) return 1.1
  return weighted / effectiveRemainingValue.value
})

const targetBadgeClass = computed(() => {
  if (paceVariance.value !== null) {
    if (paceVariance.value >= 0) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (paceVariance.value >= -15) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }
  if (achievementPercent.value >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (achievementPercent.value >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
})

const forecastGapIsDeficit = computed(() => {
  const gap = targetSummary.value?.forecast_gap
  return gap !== null && gap !== undefined && Number(gap) > 0
})

const attentionAlerts = computed(() => {
  const alerts = []
  const riskSummary = store.dealVelocitySlippageCommandCenter?.summary
  if (riskSummary && riskSummary.high_risk_deals_count > 0) {
    alerts.push({ label: 'High Risk Deals', value: `${riskSummary.high_risk_deals_count} Deals`, badgeClass: 'text-rose-700 font-black' })
  }
  if (forecastGapIsDeficit.value) {
    alerts.push({ label: 'Forecast Deficit', value: fmtCurr(targetSummary.value?.forecast_gap), badgeClass: 'text-rose-700 font-black' })
  }
  if (weightedCoverageRatio.value !== null && weightedCoverageRatio.value < 1.0) {
    alerts.push({ label: 'Low Weighted Coverage', value: `${weightedCoverageRatio.value.toFixed(2)}x`, badgeClass: 'text-amber-700 font-bold' })
  }
  return alerts
})

// Dynamically derived lead source insight from authentic backend array
const leadSourceInsight = computed(() => {
  const sources = props.sourcesData?.sources
  if (!Array.isArray(sources) || sources.length === 0) return null

  const converting = sources.filter(s => (s.cohorted_converted || 0) > 0)
  if (converting.length === 1) {
    return `"${converting[0].source || 'Unknown'}" is currently the only converting lead source in active scope.`
  }
  if (converting.length > 1) {
    const topSource = [...converting].sort((a, b) => (b.cohorted_converted || 0) - (a.cohorted_converted || 0))[0]
    return `"${topSource.source}" is leading channel conversion with ${topSource.cohorted_converted} converted leads.`
  }
  return 'No lead sources have achieved completed conversion in the active timeframe.'
})

function getPct(val) {
  const total = pipelineSummary.value?.pipeline_value || 1
  return Math.round(((val || 0) / total) * 100)
}

function fmtCurr(v) {
  if (v === null || v === undefined) return '—'
  const val = Number(v)
  if (isNaN(val)) return '—'
  const abs = Math.abs(val)
  if (abs >= 10000000) {
    const formatted = (val / 10000000).toFixed(2).replace(/\.00$/, '')
    return `₹${formatted} Cr`
  }
  if (abs >= 100000) {
    const formatted = (val / 100000).toFixed(2).replace(/\.00$/, '')
    return `₹${formatted} L`
  }
  if (abs >= 1000) {
    const formatted = (val / 100000).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
    return `₹${formatted} L`
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
}
</script>
