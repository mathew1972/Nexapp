/**
 * Nexapp CRM Dashboard — Pinia Store (Phase 1)
 * ==============================================
 *
 * PURPOSE:
 *   Centralized reactive state for the CRM Management Dashboard.
 *   All filter selections, scope data, and loading states live here.
 *   Phase 2+ widget components will consume this same store to ensure
 *   consistent filtering across the entire dashboard.
 *
 * ARCHITECTURE:
 *   - On mount: fetchFilterOptions() is called to populate dropdowns
 *   - On filter change: the store updates and calls validateScope()
 *   - Widgets (Phase 2) will watch `effectiveScope` and re-fetch data
 *
 * FILTER MODEL:
 *   Every user sees the same three filters: Period, Team, User.
 *   The AVAILABLE OPTIONS are hierarchy-restricted by the backend.
 *   "ALL" always means "all within my permitted scope", never global.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getPermittedFilterOptions,
  getUsersForTeam,
  validateAndGetScope,
  getSalesTargetAnalytics,
  getSalesTargetRootCauseAnalytics,
  getDealExecutionAnalytics,
  getDealVelocitySlippageCommandCenter,
  getStageTransitionBottleneckAnalytics,
  getLossOutcomeCorrelationAnalytics,
  getUnconvertedLeadAnalytics,
  getExecutiveKpiComparisonAnalytics,
  getKeyAccountIntelligence,
  getExecutiveTrendAnalytics,
  getCollectionsAnalytics,
  executeDashboardAction
} from '../services/crm_dashboard'

export const useCrmDashboardStore = defineStore('crmDashboard', () => {
  // -----------------------------------------------------------------------
  // STATE: Filter options (populated from backend on mount)
  // -----------------------------------------------------------------------

  /** Available team options [{value, label}] — hierarchy-restricted */
  const teamOptions = ref([])

  /** Available user options [{value, label}] — hierarchy-restricted, cascades with team */
  const userOptions = ref([])

  /** Available period options [{value, label}] — standard date ranges */
  const periodOptions = ref([])

  /** Whether the current user has unrestricted (global) access */
  const isUnrestricted = ref(false)

  /** Current logged in user role & full name for header pill */
  const currentUserRole = ref('')
  const currentUserFullname = ref('')

  /** Whether CRM Sales Hierarchy is enabled in FCRM Settings */
  const hierarchyEnabled = ref(false)

  // -----------------------------------------------------------------------
  // STATE: Current filter selections
  // -----------------------------------------------------------------------

  /** Currently selected period key (e.g. "this_month") */
  const selectedPeriod = ref('this_month')

  /** Currently selected team node name (or "ALL") */
  const selectedTeam = ref('ALL')

  /** Currently selected user email (or "ALL") */
  const selectedUser = ref('ALL')

  /** Custom date range (used when selectedPeriod === "custom") */
  const customFromDate = ref(null)
  const customToDate = ref(null)

  // -----------------------------------------------------------------------
  // STATE: Resolved scope (populated after filter validation)
  // -----------------------------------------------------------------------

  /** The validated effective scope from the backend */
  const effectiveScope = ref(null)

  // -----------------------------------------------------------------------
  // STATE: Sales Target Analytics (V10)
  // -----------------------------------------------------------------------

  /** Sales Target Data: { scope, summary, by_user, by_team, meta } */
  const salesTarget = ref(null)
  const salesTargetRootCause = ref(null)
  const dealExecutionHealth = ref(null)
  const dealExecutionAnalytics = ref(null)
  const dealVelocitySlippageCommandCenter = ref(null)
  const stageTransitionBottleneckAnalytics = ref(null)
  const lossOutcomeCorrelationAnalytics = ref(null)
  const unconvertedLeadAnalytics = ref(null)

  // -----------------------------------------------------------------------
  // STATE: Loading and error tracking
  // -----------------------------------------------------------------------

  const loadingFilters = ref(false)
  const loadingScope = ref(false)
  const loadingSalesTarget = ref(false)
  const loadingSalesTargetRootCause = ref(false)
  const loadingDealExecutionHealth = ref(false)
  const loadingDealExecutionAnalytics = ref(false)
  const loadingDealVelocitySlippageCommandCenter = ref(false)
  const loadingStageTransitionBottleneckAnalytics = ref(false)
  const loadingLossOutcomeCorrelationAnalytics = ref(false)
  const loadingUnconvertedLeadAnalytics = ref(false)
  const filterError = ref(null)
  const scopeError = ref(null)
  const salesTargetError = ref(null)
  const salesTargetRootCauseError = ref(null)
  const dealExecutionHealthError = ref(null)
  const dealExecutionAnalyticsError = ref(null)
  const dealVelocitySlippageCommandCenterError = ref(null)
  const stageTransitionBottleneckAnalyticsError = ref(null)
  const lossOutcomeCorrelationAnalyticsError = ref(null)
  const unconvertedLeadAnalyticsError = ref(null)

  // -----------------------------------------------------------------------
  // COMPUTED
  // -----------------------------------------------------------------------

  /** Whether any loading operation is in progress */
  const isLoading = computed(() => loadingFilters.value || loadingScope.value || loadingSalesTarget.value || loadingSalesTargetRootCause.value || loadingDealExecutionHealth.value || loadingDealExecutionAnalytics.value || loadingDealVelocitySlippageCommandCenter.value || loadingStageTransitionBottleneckAnalytics.value || loadingLossOutcomeCorrelationAnalytics.value || loadingUnconvertedLeadAnalytics.value)

  /** Whether filters have been loaded at least once */
  const filtersReady = computed(() => teamOptions.value.length > 0 || userOptions.value.length > 0)

  // -----------------------------------------------------------------------
  // ACTIONS
  // -----------------------------------------------------------------------

  /**
   * Fetch permitted filter options from the backend.
   *
   * Called once when the dashboard mounts. Populates team, user, and
   * period dropdowns with hierarchy-restricted values.
   */
  async function fetchFilterOptions() {
    loadingFilters.value = true
    filterError.value = null
    try {
      const data = await getPermittedFilterOptions()
      teamOptions.value = data.teams || []
      userOptions.value = data.users || []
      periodOptions.value = data.period_options || []
      isUnrestricted.value = data.is_unrestricted || false
      hierarchyEnabled.value = data.hierarchy_enabled || false
      currentUserRole.value = data.user_role || ''
      currentUserFullname.value = data.user_fullname || ''
      if (data.default_team) selectedTeam.value = data.default_team
      if (data.default_user) selectedUser.value = data.default_user
    } catch (err) {
      filterError.value = err.message || 'Failed to load filter options'
    } finally {
      loadingFilters.value = false
    }
  }

  /**
   * Handle team filter change — cascades the user dropdown.
   *
   * When the team selection changes, the user dropdown must update
   * to show only users belonging to the selected team. This calls
   * the backend to get the team-specific user list.
   *
   * @param {string} teamValue - The selected team node name or "ALL"
   */
  async function onTeamChange(teamValue) {
    selectedTeam.value = teamValue
    selectedUser.value = 'ALL'
    filterError.value = null

    try {
      const users = await getUsersForTeam(teamValue)
      userOptions.value = users || []
    } catch (err) {
      filterError.value = err.message || 'Failed to load team members'
    }
  }

  /**
   * Handle user filter change.
   *
   * @param {string} userValue - The selected user email or "ALL"
   */
  function onUserChange(userValue) {
    selectedUser.value = userValue
  }

  /**
   * Handle period filter change.
   *
   * @param {string} periodValue - The selected period key
   */
  function onPeriodChange(periodValue) {
    selectedPeriod.value = periodValue
    if (periodValue !== 'custom') {
      customFromDate.value = null
      customToDate.value = null
    }
  }

  // -----------------------------------------------------------------------
  // STATE: Scope-Aware Analytics Cache
  // -----------------------------------------------------------------------
  const cacheMap = new Map()

  function getCacheKey(endpointName) {
    if (!effectiveScopeParams.value) return null
    const p = effectiveScopeParams.value
    return `${endpointName}:${p.period}:${p.team_filter}:${p.user_filter}:${p.custom_from || ''}:${p.custom_to || ''}`
  }

  function getCachedData(endpointName) {
    const key = getCacheKey(endpointName)
    if (!key) return null
    return cacheMap.get(key) || null
  }

  function setCachedData(endpointName, data) {
    const key = getCacheKey(endpointName)
    if (key && data !== null && data !== undefined) {
      cacheMap.set(key, data)
    }
  }

  function clearAnalyticsCache() {
    cacheMap.clear()
  }

  /**
   * Fetch Sales Target Analytics for the current active scope filters.
   */
  async function fetchSalesTargetAnalytics(forceRefresh = false) {
    const cached = getCachedData('sales_target')
    if (!forceRefresh && cached) {
      salesTarget.value = cached
      return cached
    }
    loadingSalesTarget.value = true
    salesTargetError.value = null
    try {
      const result = await getSalesTargetAnalytics(effectiveScopeParams.value)
      salesTarget.value = result
      setCachedData('sales_target', result)
      return result
    } catch (err) {
      salesTargetError.value = err.message || 'Failed to load Sales Target analytics'
      salesTarget.value = null
    } finally {
      loadingSalesTarget.value = false
    }
  }

  async function fetchSalesTargetRootCauseAnalytics(forceRefresh = false) {
    const cached = getCachedData('sales_target_root_cause')
    if (!forceRefresh && cached) {
      salesTargetRootCause.value = cached
      return cached
    }
    loadingSalesTargetRootCause.value = true
    salesTargetRootCauseError.value = null
    try {
      const result = await getSalesTargetRootCauseAnalytics(effectiveScopeParams.value)
      salesTargetRootCause.value = result
      setCachedData('sales_target_root_cause', result)
      return result
    } catch (err) {
      salesTargetRootCauseError.value = err.message || 'Failed to load Sales Target Root-Cause analytics'
      salesTargetRootCause.value = null
    } finally {
      loadingSalesTargetRootCause.value = false
    }
  }

  /**
   * Fetch Deal Execution Health Analytics (V11-A).
   */
  async function fetchDealExecutionHealthAnalytics(forceRefresh = false) {
    const cached = getCachedData('deal_execution_health')
    if (!forceRefresh && cached) {
      dealExecutionHealth.value = cached
      return cached
    }
    loadingDealExecutionHealth.value = true
    dealExecutionHealthError.value = null
    try {
      const result = await getDealExecutionHealthAnalytics(effectiveScopeParams.value)
      dealExecutionHealth.value = result
      setCachedData('deal_execution_health', result)
      return result
    } catch (err) {
      dealExecutionHealthError.value = err.message || 'Failed to load Deal Execution Health analytics'
      dealExecutionHealth.value = null
    } finally {
      loadingDealExecutionHealth.value = false
    }
  }

  async function fetchDealExecutionAnalyticsData(forceRefresh = false) {
    const cached = getCachedData('deal_execution_analytics')
    if (!forceRefresh && cached) {
      dealExecutionAnalytics.value = cached
      return cached
    }
    loadingDealExecutionAnalytics.value = true
    dealExecutionAnalyticsError.value = null
    try {
      const result = await getDealExecutionAnalytics(effectiveScopeParams.value)
      dealExecutionAnalytics.value = result
      setCachedData('deal_execution_analytics', result)
      return result
    } catch (err) {
      dealExecutionAnalyticsError.value = err.message || 'Failed to load Historical Deal Execution analytics'
      dealExecutionAnalytics.value = null
    } finally {
      loadingDealExecutionAnalytics.value = false
    }
  }

  async function fetchDealVelocitySlippageCommandCenterData(forceRefresh = false) {
    const cached = getCachedData('deal_velocity_slippage')
    if (!forceRefresh && cached) {
      dealVelocitySlippageCommandCenter.value = cached
      return cached
    }
    loadingDealVelocitySlippageCommandCenter.value = true
    dealVelocitySlippageCommandCenterError.value = null
    try {
      const result = await getDealVelocitySlippageCommandCenter(effectiveScopeParams.value)
      dealVelocitySlippageCommandCenter.value = result
      setCachedData('deal_velocity_slippage', result)
      return result
    } catch (err) {
      dealVelocitySlippageCommandCenterError.value = err.message || 'Failed to load Deal Velocity & Slippage Command Center analytics'
      dealVelocitySlippageCommandCenter.value = null
    } finally {
      loadingDealVelocitySlippageCommandCenter.value = false
    }
  }

  /**
   * Fetch Stage Transition & Bottleneck Analytics (V12 Step 1).
   */
  async function fetchStageTransitionBottleneckAnalyticsData(forceRefresh = false) {
    const cached = getCachedData('stage_transition_bottlenecks')
    if (!forceRefresh && cached) {
      stageTransitionBottleneckAnalytics.value = cached
      return cached
    }
    loadingStageTransitionBottleneckAnalytics.value = true
    stageTransitionBottleneckAnalyticsError.value = null
    try {
      const result = await getStageTransitionBottleneckAnalytics(effectiveScopeParams.value)
      stageTransitionBottleneckAnalytics.value = result
      setCachedData('stage_transition_bottlenecks', result)
      return result
    } catch (err) {
      stageTransitionBottleneckAnalyticsError.value = err.message || 'Failed to load Stage Transition & Bottleneck analytics'
      stageTransitionBottleneckAnalytics.value = null
    } finally {
      loadingStageTransitionBottleneckAnalytics.value = false
    }
  }

  /**
   * Fetch Loss Outcome Correlation Analytics (V12 Step 2).
   */
  async function fetchLossOutcomeCorrelationAnalyticsData(forceRefresh = false) {
    const cached = getCachedData('loss_outcome_correlations')
    if (!forceRefresh && cached) {
      lossOutcomeCorrelationAnalytics.value = cached
      return cached
    }
    loadingLossOutcomeCorrelationAnalytics.value = true
    lossOutcomeCorrelationAnalyticsError.value = null
    try {
      const result = await getLossOutcomeCorrelationAnalytics(effectiveScopeParams.value)
      lossOutcomeCorrelationAnalytics.value = result
      setCachedData('loss_outcome_correlations', result)
      return result
    } catch (err) {
      lossOutcomeCorrelationAnalyticsError.value = err.message || 'Failed to load Loss Outcome Correlation analytics'
      lossOutcomeCorrelationAnalytics.value = null
    } finally {
      loadingLossOutcomeCorrelationAnalytics.value = false
    }
  }

  const collectionsSummary = ref(null)
  const loadingCollections = ref(false)
  const collectionsError = ref(null)

  /**
   * Fetch Collections & Receivables Analytics.
   */
  async function fetchCollectionsData(forceRefresh = false) {
    const cached = getCachedData('collections')
    if (!forceRefresh && cached) {
      collectionsSummary.value = cached?.collections
      return cached
    }
    loadingCollections.value = true
    collectionsError.value = null
    try {
      const result = await getCollectionsAnalytics(effectiveScopeParams.value)
      collectionsSummary.value = result?.collections
      setCachedData('collections', result)
      return result
    } catch (err) {
      collectionsError.value = err.message || 'Failed to load Collections analytics'
      collectionsSummary.value = null
    } finally {
      loadingCollections.value = false
    }
  }

  /**
   * Fetch Unconverted Lead Analytics.
   */
  async function fetchUnconvertedLeadAnalyticsData(forceRefresh = false) {
    const cached = getCachedData('unconverted_leads')
    if (!forceRefresh && cached) {
      unconvertedLeadAnalytics.value = cached
      return cached
    }
    loadingUnconvertedLeadAnalytics.value = true
    unconvertedLeadAnalyticsError.value = null
    try {
      const result = await getUnconvertedLeadAnalytics(effectiveScopeParams.value)
      unconvertedLeadAnalytics.value = result
      setCachedData('unconverted_leads', result)
      return result
    } catch (err) {
      unconvertedLeadAnalyticsError.value = err.message || 'Failed to load Unconverted Lead analytics'
      unconvertedLeadAnalytics.value = null
    } finally {
      loadingUnconvertedLeadAnalytics.value = false
    }
  }

  /**
   * Validate the current filter selections and resolve the effective scope.
   */
  async function validateScope() {
    loadingScope.value = true
    scopeError.value = null
    try {
      const result = await validateAndGetScope({
        period: selectedPeriod.value,
        team_filter: selectedTeam.value,
        user_filter: selectedUser.value,
        custom_from: customFromDate.value,
        custom_to: customToDate.value,
      })
      effectiveScope.value = result
      // Note: Secondary workspace analytics are no longer eagerly loaded here!
      // They will be loaded on demand per active tab in NexappCRMDashboard.
    } catch (err) {
      scopeError.value = err.message || 'Scope validation failed'
      effectiveScope.value = null
      salesTarget.value = null
      salesTargetRootCause.value = null
      dealExecutionHealth.value = null
      dealExecutionAnalytics.value = null
      dealVelocitySlippageCommandCenter.value = null
      stageTransitionBottleneckAnalytics.value = null
      lossOutcomeCorrelationAnalytics.value = null
      clearAnalyticsCache()
    } finally {
      loadingScope.value = false
    }
  }

  /**
   * Refresh the entire dashboard — re-fetches filter options and
   * re-validates the current scope.
   */
  async function refresh() {
    await fetchFilterOptions()
    await validateScope()
  }

  /** Scope params for API calls, derived from current filter selections */
  const effectiveScopeParams = computed(() => {
    if (!effectiveScope.value) return null
    return {
      period: selectedPeriod.value,
      team_filter: selectedTeam.value,
      user_filter: selectedUser.value,
      custom_from: customFromDate.value,
      custom_to: customToDate.value,
    }
  })

  /** The resolved scope from backend */
  const currentScope = computed(() => effectiveScope.value)

  /** Human-readable scope description */
  const scopeDescription = computed(() => {
    if (currentUserRole.value && currentUserFullname.value) {
      return `${currentUserRole.value} - ${currentUserFullname.value}`
    }
    if (currentUserRole.value) {
      return currentUserRole.value
    }
    if (isUnrestricted.value) return 'Full Organization Access'
    if (selectedTeam.value !== 'ALL') {
      const team = teamOptions.value.find(t => t.value === selectedTeam.value)
      return team ? `${team.label} Scope` : 'Team Scope'
    }
    return 'My Scope'
  })

  /** Alias for teamOptions used by DashboardHeader */
  const salesTeamOptions = computed(() => teamOptions.value)

  /** Alias for userOptions used by DashboardHeader */
  const salesUserOptions = computed(() => userOptions.value)

  /** Selected team alias */
  const selectedSalesTeam = computed({
    get: () => selectedTeam.value,
    set: (v) => { onTeamChange(v) }
  })

  /** Selected user alias */
  const selectedSalesUser = computed({
    get: () => selectedUser.value,
    set: (v) => { onUserChange(v) }
  })

  /** Action aliases */
  function setPeriod(v) { onPeriodChange(v); validateScope() }
  function setSalesTeam(v) { onTeamChange(v).then(() => validateScope()) }
  function setSalesUser(v) { onUserChange(v); validateScope() }
  function applyCustomDates(from, to) {
    customFromDate.value = from
    customToDate.value = to
    validateScope()
  }

  const exportingReport = ref(false)
  const exportError = ref(null)

  async function exportReport(format = 'xlsx') {
    exportingReport.value = true
    exportError.value = null
    try {
      const params = {
        period: selectedPeriod.value,
        team_filter: selectedTeam.value,
        user_filter: selectedUser.value,
        custom_from: customFromDate.value,
        custom_to: customToDate.value,
        export_format: format,
      }
      const queryStr = new URLSearchParams(params).toString()
      window.open(`/api/method/nexapp.api.crm_dashboard.get_crm_dashboard_export?${queryStr}`, '_blank')
    } catch (err) {
      exportError.value = err.message || 'Failed to export report'
    } finally {
      exportingReport.value = false
    }
  }


  // -----------------------------------------------------------------------
  // STATE: Action Framework (V15.1)
  // -----------------------------------------------------------------------
  const actionExecuting = ref(false)
  const actionError = ref(null)
  const actionResult = ref(null)

  async function executeAction(actionParams) {
    actionExecuting.value = true
    actionError.value = null
    actionResult.value = null
    try {
      const res = await executeDashboardAction(actionParams)
      actionResult.value = res
      return res
    } catch (err) {
      actionError.value = err.message || 'Action failed'
      throw err
    } finally {
      actionExecuting.value = false
    }
  }

  const executiveKpiComparison = ref(null)
  const loadingExecutiveKpiComparison = ref(false)
  const executiveKpiComparisonError = ref(null)

  async function fetchExecutiveKpiComparisonAnalyticsData(forceRefresh = false) {
    const cached = getCachedData('executive_kpi_comparison')
    if (!forceRefresh && cached) {
      executiveKpiComparison.value = cached
      return cached
    }
    loadingExecutiveKpiComparison.value = true
    executiveKpiComparisonError.value = null
    try {
      const result = await getExecutiveKpiComparisonAnalytics(effectiveScopeParams.value)
      executiveKpiComparison.value = result
      setCachedData('executive_kpi_comparison', result)
      return result
    } catch (err) {
      executiveKpiComparisonError.value = err.message || 'Failed to load Comparison analytics'
      executiveKpiComparison.value = null
    } finally {
      loadingExecutiveKpiComparison.value = false
    }
  }

  const executiveTrend = ref(null)
  const loadingExecutiveTrend = ref(false)
  const executiveTrendError = ref(null)

  async function fetchExecutiveTrendData(forceRefresh = false) {
    const cached = getCachedData('executive_trend')
    if (!forceRefresh && cached) {
      executiveTrend.value = cached
      return cached
    }
    loadingExecutiveTrend.value = true
    executiveTrendError.value = null
    try {
      const result = await getExecutiveTrendAnalytics(effectiveScopeParams.value)
      executiveTrend.value = result
      setCachedData('executive_trend', result)
      return result
    } catch (err) {
      executiveTrendError.value = err.message || 'Failed to load Executive Trend analytics'
      executiveTrend.value = null
    } finally {
      loadingExecutiveTrend.value = false
    }
  }

  const keyAccountIntelligence = ref(null)
  const loadingKeyAccountIntelligence = ref(false)
  const keyAccountIntelligenceError = ref(null)


  async function fetchKeyAccountIntelligenceData(forceRefresh = false) {
    const cached = getCachedData('key_account_intelligence')
    if (!forceRefresh && cached) {
      keyAccountIntelligence.value = cached
      return cached
    }
    loadingKeyAccountIntelligence.value = true
    keyAccountIntelligenceError.value = null
    try {
      const result = await getKeyAccountIntelligence(effectiveScopeParams.value)
      keyAccountIntelligence.value = result
      setCachedData('key_account_intelligence', result)
      return result
    } catch (err) {
      keyAccountIntelligenceError.value = err.message || 'Failed to load Key Account Intelligence'
      keyAccountIntelligence.value = null
    } finally {
      loadingKeyAccountIntelligence.value = false
    }
  }

  return {
    // State
    teamOptions,
    userOptions,
    periodOptions,
    isUnrestricted,
    hierarchyEnabled,
    selectedPeriod,
    selectedTeam,
    selectedUser,
    customFromDate,
    customToDate,
    effectiveScope,
    salesTarget,
    salesTargetRootCause,
    dealExecutionHealth,
    dealExecutionAnalytics,
    executiveKpiComparison,
    executiveTrend,
    keyAccountIntelligence,
    loadingFilters,
    loadingScope,
    loadingSalesTarget,
    loadingSalesTargetRootCause,
    loadingDealExecutionHealth,
    loadingDealExecutionAnalytics,
    loadingStageTransitionBottleneckAnalytics,
    loadingLossOutcomeCorrelationAnalytics,
    loadingUnconvertedLeadAnalytics,
    loadingExecutiveKpiComparison,
    loadingExecutiveTrend,
    loadingKeyAccountIntelligence,
    filterError,
    scopeError,
    salesTargetError,
    salesTargetRootCauseError,
    dealExecutionHealthError,
    dealExecutionAnalyticsError,
    stageTransitionBottleneckAnalyticsError,
    lossOutcomeCorrelationAnalyticsError,
    unconvertedLeadAnalyticsError,
    executiveKpiComparisonError,
    executiveTrendError,
    keyAccountIntelligenceError,
    actionExecuting,
    actionError,
    actionResult,
    // Computed
    isLoading,
    filtersReady,
    effectiveScopeParams,
    currentScope,
    scopeDescription,
    salesTeamOptions,
    salesUserOptions,
    selectedSalesTeam,
    selectedSalesUser,
    // Actions
    fetchFilterOptions,
    onTeamChange,
    onUserChange,
    onPeriodChange,
    fetchSalesTargetAnalytics,
    fetchSalesTargetRootCauseAnalytics,
    fetchDealExecutionHealthAnalytics,
    fetchDealExecutionAnalyticsData,
    fetchDealVelocitySlippageCommandCenterData,
    fetchStageTransitionBottleneckAnalyticsData,
    fetchLossOutcomeCorrelationAnalyticsData,
    fetchUnconvertedLeadAnalyticsData,
    fetchExecutiveKpiComparisonAnalyticsData,
    fetchExecutiveTrendData,
    fetchKeyAccountIntelligenceData,
    executeAction,
    validateScope,
    refresh,
    setPeriod,
    setSalesTeam,
    setSalesUser,
    applyCustomDates,
    exportingReport,
    exportError,
    exportReport,
    collectionsSummary,
    loadingCollections,
    collectionsError,
    fetchCollectionsData,
  }
}
)


