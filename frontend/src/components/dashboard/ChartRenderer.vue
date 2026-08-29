<template>
  <div ref="chartContainer" class="w-full h-full min-h-[300px]"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer
])

const props = defineProps({
  data: { type: Object, required: true },
  config: { type: Object, default: () => ({}) },
  type: { type: String, required: true }
})

const chartContainer = ref(null)
let chartInstance = null
let resizeObserver = null

const renderChart = () => {
  if (!chartContainer.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartContainer.value)
  }

  const { rows, columns, aggregations } = props.data || {}
  if (!rows || rows.length === 0) {
    chartInstance.clear()
    chartInstance.showLoading({ text: 'No data to display', showSpinner: false })
    return
  }

  // Derive dimensions and measures
  const dimensions = props.config.dimensions || columns.filter(c => !aggregations?.find(a => a.alias === c))
  const measures = props.config.measures || (aggregations?.map(a => a.alias) || [])

  if (dimensions.length === 0 && measures.length === 0) {
    chartInstance.clear()
    chartInstance.showLoading({ text: 'Unable to render visualization: invalid chart configuration.', showSpinner: false })
    return
  }

  const xAxisData = rows.map(r => dimensions.map(d => r[d] || 'Unknown').join(' - '))

  const series = measures.map(m => {
    return {
      name: m,
      type: getChartType(),
      data: rows.map(r => r[m] || 0)
    }
  })

  let option = {}
  
  if (props.type === 'Pie Chart' || props.type === 'Donut Chart') {
    option = {
      tooltip: { trigger: 'item' },
      legend: { top: '5%', left: 'center' },
      series: [
        {
          name: measures[0] || 'Value',
          type: 'pie',
          radius: props.type === 'Donut Chart' ? ['40%', '70%'] : '50%',
          data: rows.map(r => ({
            name: dimensions.map(d => r[d] || 'Unknown').join(' - '),
            value: r[measures[0]] || 0
          })),
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' }
          }
        }
      ]
    }
  } else {
    option = {
      tooltip: { trigger: 'axis' },
      legend: { data: measures },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: xAxisData },
      yAxis: { type: 'value' },
      series: series
    }
    // Swap axes for Horizontal Bar Chart if needed later, but standard Bar Chart is vertical.
  }

  chartInstance.hideLoading()
  chartInstance.setOption(option, true)
}

const getChartType = () => {
  switch (props.type) {
    case 'Bar Chart': return 'bar'
    case 'Line Chart': return 'line'
    case 'Area Chart': return 'line'
    default: return 'bar'
  }
}

onMounted(() => {
  renderChart()
  resizeObserver = new ResizeObserver(() => {
    if (chartInstance) chartInstance.resize()
  })
  resizeObserver.observe(chartContainer.value)
})

onUnmounted(() => {
  if (resizeObserver && chartContainer.value) {
    resizeObserver.unobserve(chartContainer.value)
  }
  if (chartInstance) {
    chartInstance.dispose()
  }
})

watch(() => props.data, () => {
  renderChart()
}, { deep: true })

watch(() => props.type, () => {
  renderChart()
})

watch(() => props.config, () => {
  renderChart()
}, { deep: true })

</script>
