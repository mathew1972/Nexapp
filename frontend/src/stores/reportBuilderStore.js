import { defineStore } from 'pinia'
import { getAvailableReportSources, getReportMetadata, previewReport } from '../services/reporting'
import { ref, reactive, watch } from 'vue'

export const useReportBuilderStore = defineStore('reportBuilder', () => {
  const dataSources = ref([])
  const currentSource = ref('')
  
  const metadata = ref(null)
  const availableFields = ref([])
  
  const config = reactive({
    data_source: '',
    fields: [],
    filters: [],
    group_by: [],
    aggregations: [],
    sort_by: { field: '', order: 'asc' },
    limit: 50,
    start: 0
  })

  const previewData = ref(null)
  const loadingPreview = ref(false)
  const previewError = ref(null)
  
  const loadingSources = ref(false)
  const loadingMetadata = ref(false)
  const metadataCache = {}

  let debounceTimer = null

  async function fetchSources() {
    loadingSources.value = true
    try {
      dataSources.value = await getAvailableReportSources()
    } catch(e) {
      console.error(e)
    } finally {
      loadingSources.value = false
    }
  }

  async function setDataSource(source) {
    if (source === currentSource.value) return
    
    currentSource.value = source
    config.data_source = source
    config.fields = []
    config.filters = []
    config.group_by = []
    config.aggregations = []
    config.sort_by = { field: '', order: 'asc' }
    config.start = 0
    previewData.value = null
    
    if (!source) {
      metadata.value = null
      availableFields.value = []
      return
    }

    loadingMetadata.value = true
    try {
      if (metadataCache[source]) {
        metadata.value = metadataCache[source]
      } else {
        const meta = await getReportMetadata(source)
        metadataCache[source] = meta
        metadata.value = meta
      }
      availableFields.value = metadata.value.fields || []
    } catch (e) {
      console.error(e)
    } finally {
      loadingMetadata.value = false
    }
  }

  function addField(fieldname) {
    if (!config.fields.includes(fieldname)) {
      config.fields.push(fieldname)
      triggerPreview()
    }
  }

  function removeField(fieldname) {
    config.fields = config.fields.filter(f => f !== fieldname)
    triggerPreview()
  }

  function reorderField(fromIndex, toIndex) {
    if (fromIndex === toIndex) return
    const field = config.fields.splice(fromIndex, 1)[0]
    config.fields.splice(toIndex, 0, field)
    triggerPreview()
  }

  function addFilter(filter) {
    config.filters.push(filter)
    config.start = 0
    triggerPreview()
  }

  function removeFilter(index) {
    config.filters.splice(index, 1)
    config.start = 0
    triggerPreview()
  }

  function updateFilter(index, newFilter) {
    config.filters[index] = newFilter
    config.start = 0
    triggerPreview()
  }

  function addGroupField(fieldname) {
    if (!config.group_by.includes(fieldname)) {
      config.group_by.push(fieldname)
      config.start = 0
      triggerPreview()
    }
  }

  function removeGroupField(fieldname) {
    config.group_by = config.group_by.filter(f => f !== fieldname)
    config.start = 0
    triggerPreview()
  }

  function addAggregation(agg) {
    config.aggregations.push(agg)
    config.start = 0
    triggerPreview()
  }

  function removeAggregation(index) {
    config.aggregations.splice(index, 1)
    config.start = 0
    triggerPreview()
  }

  function updateAggregation(index, agg) {
    config.aggregations[index] = agg
    config.start = 0
    triggerPreview()
  }

  function setSort(field, order) {
    config.sort_by = { field, order }
    config.start = 0
    triggerPreview()
  }

  function setPage(start) {
    config.start = start
    triggerPreview()
  }

  function triggerPreview() {
    if (!config.data_source || config.fields.length === 0) {
      previewData.value = null
      return
    }

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      loadingPreview.value = true
      previewError.value = null
      try {
        previewData.value = await previewReport(config)
      } catch (e) {
        previewError.value = e.message
        previewData.value = null
      } finally {
        loadingPreview.value = false
      }
    }, 400)
  }

  return {
    dataSources,
    currentSource,
    metadata,
    availableFields,
    config,
    previewData,
    loadingPreview,
    previewError,
    loadingSources,
    loadingMetadata,
    fetchSources,
    setDataSource,
    addField,
    removeField,
    reorderField,
    addFilter,
    removeFilter,
    updateFilter,
    addGroupField,
    removeGroupField,
    addAggregation,
    removeAggregation,
    updateAggregation,
    setSort,
    setPage,
    triggerPreview
  }
})
