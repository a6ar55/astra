import { useState, useEffect } from 'react'
import { FaTrash, FaExclamationTriangle, FaShieldAlt, FaSearch, FaDownload, FaSync, FaBalanceScale } from 'react-icons/fa'
import ThreatChart from '../components/ThreatChart'
import { exportAsCSV, prepareThreatDataForExport, exportAsJson } from '../utils/exportUtils'
import { toast } from 'react-toastify'
import axios from 'axios'
import apiService from '../services/apiService'

const History = ({ history: propHistory, clearHistory }) => {
  // Use internal state to manage history data
  const [historyData, setHistoryData] = useState(propHistory || [])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResult, setSelectedResult] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [analyzingLegalIds, setAnalyzingLegalIds] = useState(new Set())
  
  // Sync with prop history when it changes
  useEffect(() => {
    if (propHistory && propHistory.length > 0) {
      console.log(`Received ${propHistory.length} history items from props`)
      setHistoryData(propHistory)
    }
  }, [propHistory])
  
  // Fetch history directly from API if needed
  const refreshHistory = async () => {
    try {
      setLoading(true)
      // Get user ID from axios defaults
      const userId = axios.defaults.headers.common['user_id']
      
      if (!userId) {
        toast.error('No user ID available for fetching history')
        setLoading(false)
        return
      }
      
      console.log("Refreshing history data from API")
      const response = await axios.get('/api/user/history', {
        headers: { 'user_id': userId }
      })
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`Fetched ${response.data.length} history items from API`)
        setHistoryData(response.data)
        
        // Also update global data for other components
        if (window.refreshHistory && typeof window.refreshHistory === 'function') {
          window.refreshHistory(response.data)
        }
        
        toast.success(`Loaded ${response.data.length} history items`)
      } else {
        console.warn("API returned invalid history data", response.data)
        toast.warning("Received invalid history data from server")
      }
    } catch (error) {
      console.error("Error refreshing history:", error)
      toast.error("Failed to refresh history data")
    } finally {
      setLoading(false)
    }
  }
  
  // Filter history based on search term and filter type
  const filteredHistory = historyData.filter(item => {
    const matchesSearch = item && item.text && 
                         item.text.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'threat' && item.threat) ||
      (filterType === 'safe' && !item.threat)
    
    return matchesSearch && matchesFilter
  })
  
  const formatDate = (dateString) => {
    if (!dateString) return 'No date'
    
    try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
    } catch (error) {
      console.warn("Invalid date format:", dateString)
      return 'Invalid Date'
    }
  }
  
  const getThreatLevelClass = (threatClass) => {
    if (!threatClass) return 'bg-gray-500 text-white'
    
    switch(threatClass) {
      case 'Direct Violence Threats':
        return 'bg-red-500 text-white'
      case 'Criminal Activity':
        return 'bg-amber-500 text-white'
      case 'Harassment and Intimidation':
        return 'bg-orange-500 text-white'
      case 'Hate Speech/Extremism':
        return 'bg-purple-500 text-white'
      case 'Child Safety Threats':
        return 'bg-rose-700 text-white'
      case 'Non-threat/Neutral':
        return 'bg-green-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }
  
  const getThreatLevelIcon = (threatClass) => {
    if (!threatClass || threatClass === 'Non-threat/Neutral') {
      return <FaShieldAlt size={16} />
    }
    return <FaExclamationTriangle size={16} />
  }

  // Function to export the history
  const exportHistory = () => {
    if (!historyData || historyData.length === 0) {
      toast.info('No history data available to export')
      return
    }
    
    // Show a modal or dropdown for export options
    const exportType = window.confirm('Choose export format:\nOK for CSV, Cancel for JSON') ? 'csv' : 'json'
    
    if (exportType === 'csv') {
      const exportData = prepareThreatDataForExport(historyData)
      exportAsCSV(exportData, 'astra-history')
      toast.success('History exported as CSV successfully')
    } else {
      exportAsJson(historyData, 'astra-history')
      toast.success('History exported as JSON successfully')
    }
  }

  // Function to analyze legal implications
  const analyzeLegalImplications = async (content, threatClass, itemId) => {
    if (!content || !threatClass) {
      toast.error('Content and threat class are required for legal analysis')
      return
    }

    try {
      setAnalyzingLegalIds(prev => new Set([...prev, itemId]))
      toast.info('Analyzing legal implications...')
      
      // Log the request details
      console.log('🔍 Legal Analysis Request:', {
        content: content,
        threat_class: threatClass,
        itemId: itemId,
        timestamp: new Date().toISOString()
      })
      
      const result = await apiService.analyzeLegalImplications(content, threatClass)
      
      // Log the response details
      console.log('📋 Legal Analysis Response:', {
        status: result.status,
        legal_analysis: result.legal_analysis,
        threat_class: result.threat_class,
        legal_label: result.legal_label,
        timestamp: result.timestamp,
        full_response: result
      })
      
      if (result.status === 'success') {
        toast.success('Legal analysis completed! Check the Legal Analysis section in the sidebar.')
        // Optionally navigate to legal analysis page
        // window.location.href = '/legal-analysis'
      } else {
        toast.error('Legal analysis failed')
      }
    } catch (error) {
      console.error('❌ Error analyzing legal implications:', {
        error: error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        itemId: itemId,
        content: content,
        threatClass: threatClass
      })
      toast.error('Failed to analyze legal implications')
    } finally {
      setAnalyzingLegalIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Analysis History</h1>
        <div className="flex space-x-2">
          <button 
            className={`btn btn-sm ${loading ? 'btn-disabled' : 'btn-secondary'}`}
            onClick={refreshHistory}
            disabled={loading}
          >
            <FaSync className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => exportHistory()}
          >
            <FaDownload className="mr-1.5" /> Export
          </button>
          <button 
            className="btn btn-sm btn-outline"
            onClick={clearHistory}
          >
            <FaTrash className="mr-1.5" /> Clear History
          </button>
        </div>
      </div>
      
      <div className="mb-8">
        <p className="text-gray-400">
          View your past threat detection analyses. Click on an item to view detailed results.
        </p>
      </div>
      
      {/* Search and actions */}
      <div className="card mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              className="input pl-10 w-full"
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <button
              className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`btn btn-sm ${filterType === 'threat' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilterType('threat')}
            >
              Threats
            </button>
          <button
              className={`btn btn-sm ${filterType === 'safe' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilterType('safe')}
          >
              Safe
          </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* History list */}
        <div className="card lg:w-1/2 h-[600px] flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
          
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <FaSync className="animate-spin text-2xl mr-2 text-blue-500" />
              <span>Loading history data...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              {searchTerm ? 'No matching results found' : 'No prediction history yet'}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredHistory.map((item, index) => (
                item && (
                <div
                    key={item.id || index}
                  className={`
                    p-4 border-b border-gray-700 cursor-pointer hover:bg-secondary
                    ${selectedResult === item ? 'bg-secondary' : ''}
                  `}
                  onClick={() => setSelectedResult(item)}
                >
                  <div className="flex justify-between items-start mb-2">
                      <div className={`rounded px-2 py-1 flex items-center space-x-1 ${getThreatLevelClass(item.predicted_class || item.threat_class)}`}>
                        {getThreatLevelIcon(item.predicted_class || item.threat_class)}
                        <span>{item.predicted_class || item.threat_class || 'Unknown'}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.timestamp && formatDate(item.timestamp)}
                    </div>
                  </div>
                  
                  <div className="text-sm line-clamp-2 text-gray-300">
                      {item.text || item.threat_content || 'No text content'}
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      Confidence: {((item.confidence || item.threat_confidence/100 || 0) * 100).toFixed(2)}%
                    </div>
                    
                    {/* Legal Analysis Button - only show for threats */}
                    {(item.predicted_class && item.predicted_class !== 'Non-threat/Neutral' && 
                      item.predicted_class !== 'Not a Threat') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          analyzeLegalImplications(
                            item.text || item.threat_content,
                            item.predicted_class || item.threat_class,
                            item.id || `item-${index}`
                          )
                        }}
                        disabled={analyzingLegalIds.has(item.id || `item-${index}`)}
                        className="btn btn-xs btn-warning"
                        title="Analyze Legal Implications"
                      >
                        <FaBalanceScale className={`mr-1 ${analyzingLegalIds.has(item.id || `item-${index}`) ? 'animate-spin' : ''}`} />
                        {analyzingLegalIds.has(item.id || `item-${index}`) ? 'Analyzing...' : 'Legal'}
                      </button>
                    )}
                  </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
        
        {/* Detail view */}
        <div className="card lg:w-1/2 h-[600px] flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Detailed View</h2>
          
          {!selectedResult ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select an item from history to view details
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className={`rounded-lg px-3 py-1 flex items-center space-x-2 ${getThreatLevelClass(selectedResult.predicted_class || selectedResult.threat_class)}`}>
                    {getThreatLevelIcon(selectedResult.predicted_class || selectedResult.threat_class)}
                    <span className="font-medium">
                      {selectedResult.predicted_class || selectedResult.threat_class || 'Unknown'}
                    </span>
                  </div>
                  <div className="ml-4">
                    <span className="text-gray-400 mr-2">Confidence:</span>
                    <span className="font-medium">
                      {((selectedResult.confidence || selectedResult.threat_confidence/100 || 0) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
                
                <div className="bg-secondary rounded-lg p-4 text-sm">
                  <div className="font-medium mb-1 text-gray-400">Analyzed Text:</div>
                  <div className="whitespace-pre-wrap">
                    {selectedResult.text || selectedResult.threat_content || 'No text content'}
                  </div>
                </div>
                
                {selectedResult.timestamp && (
                  <div className="mt-3 text-sm text-gray-400">
                    Analysis performed on {formatDate(selectedResult.timestamp)}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Classification Breakdown</h3>
                {selectedResult.probabilities ? (
                  <ThreatChart 
                    probabilities={selectedResult.probabilities} 
                    visualizationData={selectedResult.visualization_data || {}}
                  />
                ) : (
                  <div className="text-gray-400 text-center p-4">
                    No probability data available for visualization
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default History 