/**
 * Nexapp CRM Dashboard — Frontend API Service (Phase 1)
 * ======================================================
 *
 * PURPOSE:
 *   Thin service layer that calls Nexapp backend APIs for CRM dashboard
 *   filter options, scope validation, and (later) KPI data.
 *
 * SECURITY NOTE:
 *   All security enforcement happens on the backend. This service simply
 *   forwards the user's filter selections to the server. The backend
 *   validates every parameter against the caller's CRM Sales Hierarchy
 *   position before returning data.
 *
 * API CONVENTION:
 *   Follows the existing Nexapp pattern from services/api.js — uses
 *   callFrappeApi() which posts to /api/method/<dotted_path>.
 */

import { callFrappeApi } from './api'

/**
 * Fetch the permitted filter options for the current logged-in user.
 *
 * Called once on dashboard mount. Returns teams, users, period options,
 * and default selections — all pre-filtered by the user's hierarchy scope.
 *
 * @returns {Promise<Object>} { teams, users, default_team, default_user,
 *                              period_options, is_unrestricted, hierarchy_enabled }
 */
export async function getPermittedFilterOptions() {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_permitted_filter_options')
}

/**
 * Fetch the user list for a specific team selection (cascading filter).
 *
 * Called when the user changes the Team dropdown. The backend validates
 * the team selection and returns only permitted users for that team.
 *
 * @param {string} teamNodeName - CRM Sales Hierarchy node name, or "ALL"
 * @returns {Promise<Array>} [{value, label}] for the user dropdown
 */
export async function getUsersForTeam(teamNodeName) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_users_for_team', {
    team_node_name: teamNodeName
  })
}

/**
 * Validate the complete filter selection and get the effective query scope.
 *
 * Called before fetching KPI data. Returns the validated date range and
 * effective user list. Phase 2+ KPI endpoints will use this same scope
 * structure.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { from_date, to_date, effective_users, team_filter,
 *                              user_filter, user, is_unrestricted }
 */
export async function validateAndGetScope(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.validate_and_get_scope', params)
}

/**
 * Fetch Executive Overview KPI data for the active filter selection.
 *
 * Calls Phase 2B get_executive_kpis endpoint on the backend.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, kpis, meta }
 */
export async function getExecutiveKpis(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_executive_kpis', params)
}

/**
 * Fetch Phase 2C Current Lead Funnel & Period Activity data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, funnel, period_activity, meta }
 */
export async function getLeadFunnel(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_lead_funnel', params)
}

/**
 * Fetch Phase 2C Lead Source Analytics data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, sources, meta }
 */
export async function getLeadSources(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_lead_sources', params)
}

/**
 * Fetch Phase 2D Pipeline Health data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, stages, meta }
 */
export async function getPipelineHealth(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_pipeline_health', params)
}

/**
 * Fetch Phase 2E Closed Sales & Win/Loss Performance data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, lost_reasons, meta }
 */
export async function getClosedSalesAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_closed_sales_analytics', params)
}

/**
 * Fetch Phase 2F Sales Cycle & Deal Velocity data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, age_distribution, meta }
 */
export async function getSalesVelocityAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_sales_velocity_analytics', params)
}

/**
 * Fetch Phase 2G Sales Activity & Follow-Up Execution data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, activity_breakdown, meta }
 */
export async function getActivityExecutionAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_activity_execution_analytics', params)
}

/**
 * Fetch Phase 2H Sales Rep & Team Leaderboard Analytics data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, leaderboard, meta }
 */
export async function getRepLeaderboardAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_rep_leaderboard_analytics', params)
}

/**
 * Fetch Phase 2I Industry & Vertical Market Intelligence data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, industries, meta }
 */
export async function getIndustryAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_industry_analytics', params)
}

/**
 * Fetch Phase 2J Key Account & Organization Revenue Concentration Analytics data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, organizations, meta }
 */
export async function getOrganizationAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_organization_analytics', params)
}

/**
 * Fetch Phase 2K Lead-to-Deal Conversion Efficiency & Sourcing Velocity data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, source_breakdown, meta }
 */
export async function getLeadConversionAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_lead_conversion_analytics', params)
}

/**
 * Fetch Phase 2L Unconverted Lead Stage & Aging Bottleneck Analytics data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, stages, age_distribution, meta }
 */
export async function getUnconvertedLeadAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_unconverted_lead_analytics', params)
}

/**
 * Fetch Phase 2M Deal Stage Progression & Dwell Time Analytics data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, transitions, stages, loss_breakdown, meta }
 */
export async function getDealProgressionAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_deal_progression_analytics', params)
}

/**
 * Fetch Phase 2N Pipeline Probability Distribution & Forecast Calibration data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, probability_tiers, calibration_risks, meta }
 */
export async function getPipelineProbabilityAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_pipeline_probability_analytics', params)
}

/**
 * Fetch Top Open Opportunities for Executive Command Center.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to, limit }
 * @returns {Promise<Object>} { scope, opportunities, meta }
 */
export async function getTopOpportunities(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_top_opportunities', params)
}

/**
 * Trigger backend export for the current scope (CSV or XLSX).
 *
 * @param {Object} params - Scope parameters + export_format
 */
export async function getCrmDashboardExport(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_crm_dashboard_export', params)
}

/**
 * Fetch Sales Target Analytics for Executive Command Center (V10).
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, by_user, by_team, meta }
 */
export async function getSalesTargetAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_sales_target_analytics', params)
}

/**
 * Fetch Sales Target Root-Cause Diagnostics & Actionability Analytics (V10.5).
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, diagnostics, meta }
 */
export async function getSalesTargetRootCauseAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_sales_target_root_cause_analytics', params)
}

/**
 * Fetch Deal Execution Health & Management Attention Analytics (V11-A).
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, deals, meta }
 */
/**
 * Fetch Historical CRM Deal Execution Analytics (V11-B).
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, details, meta }
 */
export async function getDealExecutionAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_deal_execution_analytics', params)
}

export async function getDealStageVelocityAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_deal_stage_velocity_analytics', params)
}

export async function getDealSlippageAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_deal_slippage_analytics', params)
}

export async function getProbabilityMovementAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_probability_movement_analytics', params)
}

export async function getDealValueMovementAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_deal_value_movement_analytics', params)
}

/**
 * Fetch Deal Velocity & Slippage Command Center Analytics (V11-B Step 6).
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, deal_matrix, meta }
 */
export async function getDealVelocitySlippageCommandCenter(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_deal_velocity_slippage_command_center', params)
}

/**
 * Fetch Stage Transition & Bottleneck Analytics (V12 Step 1).
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, stage_velocity, transition_matrix, bottlenecks, meta }
 */
export async function getStageTransitionBottleneckAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_stage_transition_bottleneck_analytics', params)
}

/**
 * Fetch Loss Outcome Correlation Analytics (V12 Step 2).
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, correlations, meta }
 */
export async function getLossOutcomeCorrelationAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_loss_outcome_correlation_analytics', params)
}

export async function executeDashboardAction(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.execute_dashboard_action', params)
}

export async function getExecutiveKpiComparisonAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_executive_kpi_comparison_analytics', params)
}

/**
 * Fetch V15.4 Key Account Intelligence data.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, summary, accounts, meta }
 */
export async function getKeyAccountIntelligence(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_key_account_intelligence', params)
}

/**
 * Fetch Executive Time-Series Trend Analytics (Chat 3).
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, points, meta }
 */
export async function getExecutiveTrendAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_executive_trend_analytics', params)
}

/**
 * Fetch Collections & Receivables Analytics.
 *
 * @param {Object} params - { period, team_filter, user_filter, custom_from, custom_to }
 * @returns {Promise<Object>} { scope, collections, meta }
 */
export async function getCollectionsAnalytics(params) {
  return await callFrappeApi('nexapp.api.crm_dashboard.get_collections_analytics', params)
}


