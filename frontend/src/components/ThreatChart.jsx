import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement
} from 'chart.js'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaChartBar, FaChartPie, FaProjectDiagram, FaRadiation } from 'react-icons/fa'

// Register the chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement
)

const ThreatChart = ({ probabilities, visualizationData }) => {
  const [chartData, setChartData] = useState(null)
  const [showStage2, setShowStage2] = useState(false)
  const [viewMode, setViewMode] = useState('bar') // 'bar', 'radar', 'pie', 'flow'
  
  // Generate color based on threat level
  const getThreatColor = (label, alpha = 1) => {
    switch(label) {
      case 'Direct Violence Threats':
        return `rgba(239, 68, 68, ${alpha})` // red
      case 'Criminal Activity':
        return `rgba(245, 158, 11, ${alpha})` // amber
      case 'Harassment and Intimidation':
        return `rgba(249, 115, 22, ${alpha})` // orange
      case 'Hate Speech/Extremism':
        return `rgba(217, 70, 239, ${alpha})` // purple
      case 'Child Safety Threats':
        return `rgba(190, 18, 60, ${alpha})` // rose
      case 'Non-threat/Neutral':
        return `rgba(16, 185, 129, ${alpha})` // green
      case 'Threat':
        return `rgba(244, 63, 94, ${alpha})` // rose-500
      default:
        return `rgba(107, 114, 128, ${alpha})` // gray
    }
  }
  
  useEffect(() => {
    if (!probabilities || Object.keys(probabilities).length === 0) return
    
    // Sort probabilities from highest to lowest
    const sortedEntries = Object.entries(probabilities).sort((a, b) => b[1] - a[1])
    
    // Create chart data based on view mode
    if (viewMode === 'bar') {
      const data = {
        labels: sortedEntries.map(([label]) => label),
        datasets: [
          {
            label: 'Confidence Score',
            data: sortedEntries.map(([, value]) => (value * 100).toFixed(1)), // Convert to percentage
            backgroundColor: sortedEntries.map(([label]) => getThreatColor(label, 0.7)),
            borderColor: sortedEntries.map(([label]) => getThreatColor(label)),
            borderWidth: 1,
          },
        ],
      }
      setChartData(data)
    } else if (viewMode === 'radar') {
      const data = {
        labels: sortedEntries.map(([label]) => label),
        datasets: [
          {
            label: 'Threat Confidence',
            data: sortedEntries.map(([, value]) => (value * 100).toFixed(1)),
            backgroundColor: 'rgba(244, 63, 94, 0.2)',
            borderColor: 'rgba(244, 63, 94, 1)',
            pointBackgroundColor: sortedEntries.map(([label]) => getThreatColor(label)),
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(244, 63, 94, 1)',
            borderWidth: 2,
          },
        ],
      }
      setChartData(data)
    } else if (viewMode === 'pie') {
      // Only include values above a threshold to keep pie chart readable
      const filteredEntries = sortedEntries.filter(([, value]) => value > 0.05)
      
      const data = {
        labels: filteredEntries.map(([label]) => label),
        datasets: [
          {
            data: filteredEntries.map(([, value]) => (value * 100).toFixed(1)),
            backgroundColor: filteredEntries.map(([label]) => getThreatColor(label, 0.7)),
            borderColor: filteredEntries.map(([label]) => getThreatColor(label)),
            borderWidth: 1,
          },
        ],
      }
      setChartData(data)
    }
    
    // If there's a Threat class, show Stage 2 by default
    const threatIndex = sortedEntries.findIndex(([label]) => label === 'Threat')
    if (threatIndex !== -1 && sortedEntries[threatIndex][1] > 0.5) {
      setShowStage2(true)
    }
  }, [probabilities, viewMode])
  
  // Chart options
  const getChartOptions = () => {
    if (viewMode === 'bar') {
      return {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => `Confidence: ${context.raw}%`,
            },
            titleFont: {
              weight: 'bold',
            },
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: 'rgba(51, 65, 85, 1)',
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            boxPadding: 4,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Confidence (%)',
              color: '#F8FAFC',
              font: {
                weight: 'bold',
              },
            },
            ticks: {
              color: '#CBD5E1',
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
            },
          },
          y: {
            ticks: {
              color: '#CBD5E1',
              font: {
                weight: 'bold',
              },
            },
            grid: {
              display: false,
            },
          },
        },
        animation: {
          duration: 1000,
        },
      }
    } else if (viewMode === 'radar') {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => `Confidence: ${context.raw}%`,
            },
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: 'rgba(51, 65, 85, 1)',
            borderWidth: 1,
          },
        },
        scales: {
          r: {
            beginAtZero: true,
            suggestedMax: 100,
            ticks: {
              color: '#CBD5E1',
              backdropColor: 'transparent',
              stepSize: 20,
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
            },
            angleLines: {
              color: 'rgba(148, 163, 184, 0.1)',
            },
            pointLabels: {
              color: '#CBD5E1',
              font: {
                size: 10,
              },
            },
          },
        },
        animation: {
          duration: 1000,
        },
      }
    } else if (viewMode === 'pie') {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#CBD5E1',
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: 11,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.raw}%`,
            },
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: 'rgba(51, 65, 85, 1)',
            borderWidth: 1,
          },
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
        },
      }
    }
  }

  // Render the hierarchical classification diagram if visualization data is available
  const renderHierarchicalDiagram = () => {
    if (!visualizationData?.hierarchical) return null;
    
    const { stage1, stage2 } = visualizationData.hierarchical;
    
    return (
      <motion.div 
        className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <h4 className="text-sm font-medium text-slate-300 mb-4">Classification Flow Analysis</h4>
        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0">
          {/* Stage 1 */}
          <div className="flex flex-col items-center">
            <div className="text-center mb-2 text-xs text-slate-400 uppercase tracking-wider">Stage 1: Threat Detection</div>
            <motion.div 
              className={`rounded-lg px-4 py-3 flex items-center justify-center ${getThreatLevelClass(stage1.class)}`} 
              style={{minWidth: '130px'}}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className="text-center">
                <div className="font-medium">{stage1.class}</div>
                <div className="text-xs opacity-80 mt-1">{(stage1.confidence * 100).toFixed(1)}% confidence</div>
              </div>
            </motion.div>
          </div>
          
          {/* Arrow */}
          {stage1.leads_to_stage2 && (
            <div className="mx-4 text-slate-400 flex flex-col items-center">
              <div className="hidden md:block">
                <motion.svg 
                  width="80" height="24" 
                  viewBox="0 0 80 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  initial={{ width: 0 }}
                  animate={{ width: 80 }}
                  transition={{ duration: 0.5 }}
                >
                  <path d="M79.0607 13.0607C79.6464 12.4749 79.6464 11.5251 79.0607 10.9393L69.5147 1.3934C68.9289 0.807612 67.9792 0.807612 67.3934 1.3934C66.8076 1.97918 66.8076 2.92893 67.3934 3.51472L75.8787 12L67.3934 20.4853C66.8076 21.0711 66.8076 22.0208 67.3934 22.6066C67.9792 23.1924 68.9289 23.1924 69.5147 22.6066L79.0607 13.0607ZM0 13.5H78V10.5H0V13.5Z" fill="currentColor"/>
                </motion.svg>
              </div>
              
              <div className="md:hidden flex items-center justify-center">
                <motion.svg 
                  width="24" height="60" 
                  viewBox="0 0 24 60" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  initial={{ height: 0 }}
                  animate={{ height: 60 }}
                  transition={{ duration: 0.5 }}
                >
                  <path d="M13.0607 59.0607C12.4749 59.6464 11.5251 59.6464 10.9393 59.0607L1.3934 49.5147C0.807612 48.9289 0.807612 47.9792 1.3934 47.3934C1.97918 46.8076 2.92893 46.8076 3.51472 47.3934L12 55.8787L20.4853 47.3934C21.0711 46.8076 22.0208 46.8076 22.6066 47.3934C23.1924 47.9792 23.1924 48.9289 22.6066 49.5147L13.0607 59.0607ZM13.5 0V58H10.5V0H13.5Z" fill="currentColor"/>
                </motion.svg>
              </div>
            </div>
          )}
          
          {/* Stage 2 */}
          {stage1.leads_to_stage2 && (
            <div className="flex flex-col items-center">
              <div className="text-center mb-2 text-xs text-slate-400 uppercase tracking-wider">Stage 2: Threat Classification</div>
              <motion.div 
                className={`rounded-lg px-4 py-3 flex items-center justify-center ${getThreatLevelClass(stage2.class)}`} 
                style={{minWidth: '150px'}}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 20 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-center">
                  <div className="font-medium">{stage2.class}</div>
                  <div className="text-xs opacity-80 mt-1">{(stage2.confidence * 100).toFixed(1)}% confidence</div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // Helper function for diagram
  const getThreatLevelClass = (threatClass) => {
    switch(threatClass) {
      case 'Direct Violence Threats':
        return 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-500/20'
      case 'Criminal Activity':
        return 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md shadow-amber-500/20'
      case 'Harassment and Intimidation':
        return 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-500/20'
      case 'Hate Speech/Extremism':
        return 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20'
      case 'Child Safety Threats':
        return 'bg-gradient-to-r from-rose-700 to-rose-600 text-white shadow-md shadow-rose-500/20'
      case 'Non-threat/Neutral':
        return 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/20'
      case 'Threat':
        return 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md shadow-rose-500/20'
      default:
        return 'bg-gradient-to-r from-slate-600 to-slate-500 text-white shadow-md'
    }
  }
  
  if (!chartData) {
    return <div className="h-64 flex items-center justify-center text-slate-400">No data to display</div>
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Chart view selector */}
      <div className="flex justify-center mb-4 bg-slate-900 rounded-lg p-1 border border-slate-700">
        <button
          onClick={() => setViewMode('bar')}
          className={`flex items-center px-3 py-1.5 rounded-md text-xs font-medium mr-1 ${viewMode === 'bar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <FaChartBar className="mr-1.5" /> Bar Chart
        </button>
        <button
          onClick={() => setViewMode('radar')}
          className={`flex items-center px-3 py-1.5 rounded-md text-xs font-medium mr-1 ${viewMode === 'radar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <FaRadiation className="mr-1.5" /> Radar 
        </button>
        <button
          onClick={() => setViewMode('pie')}
          className={`flex items-center px-3 py-1.5 rounded-md text-xs font-medium mr-1 ${viewMode === 'pie' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <FaChartPie className="mr-1.5" /> Pie Chart
        </button>
        <button
          onClick={() => setViewMode('flow')}
          className={`flex items-center px-3 py-1.5 rounded-md text-xs font-medium ${viewMode === 'flow' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <FaProjectDiagram className="mr-1.5" /> Flow Analysis
        </button>
      </div>
      
      {/* Chart container */}
      <div className="w-full h-72 rounded-lg p-4 bg-slate-900 border border-slate-700 shadow-inner">
        <AnimatePresence mode="wait">
          {viewMode === 'flow' ? (
            <motion.div
              key="flow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center"
            >
              {visualizationData ? (
                renderHierarchicalDiagram()
              ) : (
                <div className="text-slate-400">Flow analysis not available</div>
              )}
            </motion.div>
          ) : viewMode === 'radar' ? (
            <motion.div
              key="radar"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <div className="chart-container" style={{ position: 'relative', height: '100%', width: '100%' }}>
                <RadarChart data={chartData} options={getChartOptions()} />
              </div>
            </motion.div>
          ) : viewMode === 'pie' ? (
            <motion.div
              key="pie"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <div className="chart-container" style={{ position: 'relative', height: '100%', width: '100%' }}>
                <DoughnutChart data={chartData} options={getChartOptions()} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="bar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <Bar data={chartData} options={getChartOptions()} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Hierarchical flow diagram (if not already shown) */}
      {viewMode !== 'flow' && visualizationData && renderHierarchicalDiagram()}
    </motion.div>
  )
}

// Additional chart types
const RadarChart = ({ data, options }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Radar data={data} options={options} />
    </motion.div>
  )
}

const DoughnutChart = ({ data, options }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Doughnut data={data} options={options} />
    </motion.div>
  )
}

// Import these from react-chartjs-2
import { Radar, Doughnut } from 'react-chartjs-2'
import { AnimatePresence } from 'framer-motion'

export default ThreatChart 