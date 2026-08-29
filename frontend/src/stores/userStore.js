import { defineStore } from 'pinia'
import { getUserCapabilities } from '../services/reporting'

export const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: null,
    capabilities: null,
    loading: false,
    error: null
  }),
  
  actions: {
    async fetchCapabilities() {
      this.loading = true
      this.error = null
      try {
        const data = await getUserCapabilities()
        this.currentUser = data.user
        this.capabilities = data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    }
  }
})
