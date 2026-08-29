/**
 * CRM Dashboard Navigation Utility
 * Encapsulates safe, filter-preserving routing to Frappe CRM records and views.
 * 
 * Security Rule:
 * Navigation functions build context parameters for Frappe CRM routes.
 * Backend security and role-based permissions remain authoritative upon target view load.
 */

export function openDeal(dealId) {
  if (!dealId) return
  if (window.frappe?.set_route) {
    window.frappe.set_route('Form', 'CRM Deal', dealId)
  } else {
    window.open(`/crm/deals/${dealId}`, '_blank')
  }
}

export function openDealList(filters = {}) {
  // Frappe CRM native router path for Deal list
  const baseUrl = '/crm/deals'
  const params = new URLSearchParams()

  if (filters.stage) {
    params.append('status', filters.stage)
  }
  if (filters.user && filters.user !== 'ALL') {
    params.append('deal_owner', filters.user)
  }
  if (filters.status_type) {
    params.append('type', filters.status_type)
  }

  const queryString = params.toString()
  const targetUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl

  if (window.frappe?.set_route) {
    window.frappe.set_route('List', 'CRM Deal', filters)
  } else {
    window.open(targetUrl, '_blank')
  }
}

export function openDealsByStage(stage, scopeParams = {}) {
  if (!stage) return
  openDealList({
    stage: stage,
    user: scopeParams.user_filter,
    team: scopeParams.team_filter,
    period: scopeParams.period
  })
}

export function openDealsByUser(salesUser, scopeParams = {}) {
  if (!salesUser || salesUser === 'Unassigned') return
  openDealList({
    user: salesUser,
    team: scopeParams.team_filter,
    period: scopeParams.period
  })
}

export function openWonDeals(scopeParams = {}) {
  openDealList({
    status_type: 'Won',
    user: scopeParams.user_filter,
    team: scopeParams.team_filter,
    period: scopeParams.period
  })
}

export function openLostDeals(scopeParams = {}) {
  openDealList({
    status_type: 'Lost',
    user: scopeParams.user_filter,
    team: scopeParams.team_filter,
    period: scopeParams.period
  })
}

export function openClosedDeals(scopeParams = {}) {
  openDealList({
    status_type: 'Closed',
    user: scopeParams.user_filter,
    team: scopeParams.team_filter,
    period: scopeParams.period
  })
}
