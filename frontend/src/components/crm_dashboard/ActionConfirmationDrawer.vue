<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden bg-gray-900/40 backdrop-blur-xs flex justify-end transition-opacity">
    <div class="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto transform transition-transform">
      <!-- Header -->
      <div>
        <div class="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h2 class="text-base font-bold text-gray-900">CRM Action Confirmation</h2>
          </div>
          <button @click="closeDrawer" type="button" class="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
        </div>

        <!-- Target Summary Context Card -->
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-3.5 mb-5 space-y-1.5 text-xs">
          <div class="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Target Record</div>
          <div class="font-bold text-gray-900 text-sm">{{ targetDoctype }}: {{ targetId }}</div>
          
          <div v-if="extraContext" class="text-gray-600 font-medium pt-1.5 border-t border-gray-200/60 mt-1">
            {{ extraContext }}
          </div>

          <!-- WHY THIS IS BEING FLAGGED -->
          <div v-if="whyFlagged" class="bg-amber-50 border border-amber-200 text-amber-800 rounded p-2 text-[11px] font-semibold flex items-start gap-1.5 mt-2">
            <svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div>
              <span class="font-bold uppercase text-[9px] block text-amber-900 tracking-wider">Why Flagged</span>
              <span>{{ whyFlagged }}</span>
            </div>
          </div>
        </div>

        <!-- Form Inputs -->
        <form @submit.prevent="handleConfirm" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">Action Type</label>
            <input type="text" readonly :value="actionLabel" class="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 font-semibold text-gray-700 cursor-not-allowed">
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">Subject <span class="text-red-500">*</span></label>
            <input v-model="form.subject" type="text" required placeholder="e.g. Schedule follow-up discussion" class="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none">
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">Due Date <span class="text-red-500">*</span></label>
            <input v-model="form.due_date" type="date" required class="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none">
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">Notes / Description</label>
            <textarea v-model="form.description" rows="3" placeholder="Add specific execution notes for team visibility..." class="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea>
          </div>
        </form>

        <!-- Status Messaging -->
        <div v-if="errorMessage" class="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="mt-4 p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700 font-bold">
          {{ successMessage }}
        </div>
      </div>

      <!-- Footer Action Buttons -->
      <div class="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
        <button
          @click="closeDrawer"
          type="button"
          :disabled="submitting"
          class="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          @click="handleConfirm"
          type="button"
          :disabled="submitting || !form.subject || !form.due_date"
          class="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <svg v-if="submitting" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span>{{ submitting ? 'Submitting...' : 'Confirm Action' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useCrmDashboardStore } from '../../stores/crmDashboardStore'
import { ACTION_REGISTRY } from '../../services/actionRegistry'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  actionType: { type: String, default: 'CREATE_FOLLOWUP_ACTIVITY' },
  targetDoctype: { type: String, required: true },
  targetId: { type: String, required: true },
  extraContext: { type: String, default: '' },
  whyFlagged: { type: String, default: '' }
})

const emit = defineEmits(['close', 'success'])
const store = useCrmDashboardStore()

const submitting = ref(false)
const errorMessage = ref(null)
const successMessage = ref(null)

const form = ref({
  subject: '',
  due_date: new Date().toISOString().substr(0, 10),
  description: ''
})

const actionLabel = computed(() => {
  const reg = ACTION_REGISTRY[props.actionType]
  return reg ? reg.label : props.actionType
})

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    errorMessage.value = null
    successMessage.value = null
    const reg = ACTION_REGISTRY[props.actionType]
    if (reg && reg.defaultSubject) {
      form.value.subject = reg.defaultSubject(props.targetDoctype, props.targetId)
    } else {
      form.value.subject = `Action regarding ${props.targetDoctype} ${props.targetId}`
    }
    form.value.due_date = new Date().toISOString().substr(0, 10)
    form.value.description = ''
  }
})

function closeDrawer() {
  emit('close')
}

async function handleConfirm() {
  submitting.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const res = await store.executeAction({
      action_type: props.actionType,
      target_doctype: props.targetDoctype,
      target_id: props.targetId,
      payload: {
        subject: form.value.subject,
        due_date: form.value.due_date,
        description: form.value.description
      }
    })

    successMessage.value = res.message || 'Action completed successfully.'
    setTimeout(() => {
      emit('success', res)
      emit('close')
    }, 1000)
  } catch (err) {
    errorMessage.value = err.message || 'Failed to execute action.'
  } finally {
    submitting.value = false
  }
}
</script>
