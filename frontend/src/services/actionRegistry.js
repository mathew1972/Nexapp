/**
 * Nexapp CRM Dashboard — Action Registry (V15.2 Action Intelligence)
 * ===================================================================
 *
 * Centralized, type-safe registry mapping signals and objects to allowable,
 * low-risk CRM management actions.
 */

export const ACTION_TYPES = {
  CREATE_FOLLOWUP_ACTIVITY: 'CREATE_FOLLOWUP_ACTIVITY',
  CREATE_REVIEW_TASK: 'CREATE_REVIEW_TASK',
  CREATE_NEXT_STEP_TASK: 'CREATE_NEXT_STEP_TASK',
  OPEN_RECORD: 'OPEN_RECORD'
}

export const ACTION_REGISTRY = {
  [ACTION_TYPES.CREATE_FOLLOWUP_ACTIVITY]: {
    type: ACTION_TYPES.CREATE_FOLLOWUP_ACTIVITY,
    label: 'Create Follow-up Activity / Task',
    targetDoctypes: ['CRM Deal', 'CRM Lead'],
    requiresConfirmation: true,
    riskLevel: 'LOW',
    defaultSubject: (doctype, id) => `Follow up regarding ${doctype} ${id}`
  },
  [ACTION_TYPES.CREATE_REVIEW_TASK]: {
    type: ACTION_TYPES.CREATE_REVIEW_TASK,
    label: 'Create Management Review Task',
    targetDoctypes: ['CRM Deal', 'CRM Lead'],
    requiresConfirmation: true,
    riskLevel: 'LOW',
    defaultSubject: (doctype, id) => `Executive Review requested for ${doctype} ${id}`
  },
  [ACTION_TYPES.CREATE_NEXT_STEP_TASK]: {
    type: ACTION_TYPES.CREATE_NEXT_STEP_TASK,
    label: 'Create Next Step Execution Task',
    targetDoctypes: ['CRM Deal', 'CRM Lead'],
    requiresConfirmation: true,
    riskLevel: 'LOW',
    defaultSubject: (doctype, id) => `Next sales execution step for ${doctype} ${id}`
  },
  [ACTION_TYPES.OPEN_RECORD]: {
    type: ACTION_TYPES.OPEN_RECORD,
    label: 'Open Record Form',
    targetDoctypes: ['CRM Deal', 'CRM Lead'],
    requiresConfirmation: false,
    riskLevel: 'NONE'
  }
}
