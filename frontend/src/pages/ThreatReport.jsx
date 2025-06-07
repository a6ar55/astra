import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { motion } from 'framer-motion'
import { 
  FaFileAlt, 
  FaDownload, 
  FaSyncAlt, 
  FaSpinner, 
  FaExclamationTriangle,
  FaShieldAlt,
  FaCrosshairs,
  FaClock,
  FaPrint,
  FaSearch,
  FaFilter,
  FaEye
} from 'react-icons/fa'
import { generateThreatReport } from '../utils/reportUtils'

const ThreatReport = () => {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState(null)
  const [historyData, setHistoryData] = useState([])
  const [expandedIncident, setExpandedIncident] = useState(null)

  useEffect(() => {
    loadReportData()
  }, [user])

  const loadReportData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Load existing report
      const reportResponse = await axios.get('/api/user/reports/threat', {
        headers: { 'user_id': user.id }
      })
      
      if (reportResponse.data?.report) {
        setReport(reportResponse.data.report)
      }

      // Load history data for report generation
      const historyResponse = await axios.get('/api/user/history', {
        headers: { 'user_id': user.id }
      })
      
      if (historyResponse.data && Array.isArray(historyResponse.data)) {
        setHistoryData(historyResponse.data)
      }

    } catch (error) {
      console.error('Error loading report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const generateNewReport = async () => {
    if (!historyData || historyData.length === 0) {
      toast.error('Unable to generate report: no analysis data available')
      return
    }

    setGenerating(true)
    try {
      const userInfo = {
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'System User',
        email: user?.emailAddresses?.[0]?.emailAddress || 'N/A'
      }

      // Generate report data object
      const reportData = generateThreatReport(historyData, userInfo, true)
      
      // Save to database
      await axios.post('/api/user/reports/threat', reportData, {
        headers: { 'user_id': user.id }
      })

      setReport(reportData)
      toast.success('Threat analysis report generated successfully!')

    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const downloadReport = () => {
    if (!report || !historyData || historyData.length === 0) {
      toast.error('No report data available for download')
      return
    }

    const userInfo = {
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'System User',
      email: user?.emailAddresses?.[0]?.emailAddress || 'N/A'
    }

    // Generate PDF download
    generateThreatReport(historyData, userInfo, false)
    toast.success('Report downloaded successfully!')
  }

  const printReport = () => {
    window.print()
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 text-white'
      case 'HIGH': return 'bg-red-500 text-white'
      case 'MEDIUM': return 'bg-yellow-500 text-black'
      case 'LOW': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getRiskColor = (risk) => {
    if (risk.includes('IMMEDIATE')) return 'bg-red-600 text-white'
    if (risk.includes('PRIORITY')) return 'bg-red-500 text-white'
    if (risk.includes('MONITOR')) return 'bg-yellow-500 text-black'
    return 'bg-blue-500 text-white'
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center h-64">
          <FaSpinner className="animate-spin text-4xl text-blue-500" />
          <span className="ml-3 text-lg">Loading report data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-wrap items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <FaCrosshairs className="mr-3 text-red-500" />
              Threat Analysis Report
            </h1>
            <p className="text-slate-400">
              Detailed incident analysis and threat intelligence report
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              className="btn btn-sm btn-outline"
              onClick={loadReportData}
              disabled={loading}
            >
              <FaSyncAlt className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button 
              className="btn btn-sm btn-secondary"
              onClick={generateNewReport}
              disabled={generating || !historyData.length}
            >
              {generating ? (
                <>
                  <FaSpinner className="mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FaCrosshairs className="mr-2" />
                  Generate New Report
                </>
              )}
            </button>
            
            {report && (
              <>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={downloadReport}
                >
                  <FaDownload className="mr-2" />
                  Download PDF
                </button>
                
                <button 
                  className="btn btn-sm btn-ghost"
                  onClick={printReport}
                >
                  <FaPrint className="mr-2" />
                  Print
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Report Content */}
      {!report ? (
        <motion.div 
          className="bg-navy-800 border border-gray-700 rounded-lg p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <FaCrosshairs className="text-6xl text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Threat Report Available</h3>
          <p className="text-gray-400 mb-6">
            Generate your first detailed threat analysis report to view incident details and recommendations
          </p>
          <button 
            className="btn btn-primary"
            onClick={generateNewReport}
            disabled={generating || !historyData.length}
          >
            {generating ? (
              <>
                <FaSpinner className="mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FaCrosshairs className="mr-2" />
                Generate Threat Analysis Report
              </>
            )}
          </button>
        </motion.div>
      ) : (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Classification Header */}
          <div className="bg-red-600 text-white text-center py-2 font-bold text-sm rounded">
            {report.classification_level || 'OFFICIAL USE ONLY'}
          </div>

          {/* Report Header */}
          <div className="bg-navy-800 border border-gray-700 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-4">ASTRA INTELLIGENCE DIVISION</h2>
                <h3 className="text-lg font-semibold text-red-400 mb-4">{report.report_type}</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-400">Report ID:</span> <span className="text-white font-mono">{report.report_id}</span></div>
                  <div><span className="text-gray-400">Generated:</span> <span className="text-white">{new Date(report.generation_date).toLocaleString()}</span></div>
                  <div><span className="text-gray-400">Analyst:</span> <span className="text-white">{report.analyst}</span></div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm space-y-2">
                  <div><span className="text-gray-400">Contact:</span> <span className="text-white">{report.analyst_email}</span></div>
                  <div><span className="text-gray-400">Analysis Period:</span> <span className="text-white">{report.report_period?.start_date} to {report.report_period?.end_date}</span></div>
                  <div><span className="text-gray-400">Page:</span> <span className="text-white">1 of 1</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-navy-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <FaShieldAlt className="mr-2 text-blue-500" />
              EXECUTIVE SUMMARY
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-navy-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{report.executive_summary?.total_items_analyzed}</div>
                <div className="text-sm text-gray-400">Total Items Analyzed</div>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{report.executive_summary?.threats_detected}</div>
                <div className="text-sm text-gray-400">Threats Detected</div>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{report.executive_summary?.threat_detection_rate}</div>
                <div className="text-sm text-gray-400">Detection Rate</div>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-400">{report.executive_summary?.critical_threats}</div>
                <div className="text-sm text-gray-400">Critical Incidents</div>
              </div>
            </div>

            {report.executive_summary?.high_priority_categories && report.executive_summary.high_priority_categories.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-white mb-3">Primary Threat Categories:</h4>
                <div className="space-y-2">
                  {report.executive_summary.high_priority_categories.map((category, index) => (
                    <div key={index} className="flex justify-between items-center bg-navy-700 rounded px-3 py-2">
                      <span className="text-white">{category.category}</span>
                      <span className="text-red-400 font-semibold">{category.count} incidents</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Threat Breakdown */}
          <div className="bg-navy-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <FaExclamationTriangle className="mr-2 text-yellow-500" />
              THREAT ANALYSIS
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Category */}
              <div>
                <h4 className="text-md font-semibold text-white mb-3">Threats by Category:</h4>
                <div className="space-y-2">
                  {Object.entries(report.threat_breakdown?.by_category || {}).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center bg-navy-700 rounded px-3 py-2">
                      <span className="text-white text-sm">{category}</span>
                      <span className="text-yellow-400 font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Severity */}
              <div>
                <h4 className="text-md font-semibold text-white mb-3">Threats by Severity:</h4>
                <div className="space-y-2">
                  {Object.entries(report.threat_breakdown?.by_severity || {}).map(([severity, count]) => (
                    <div key={severity} className="flex justify-between items-center bg-navy-700 rounded px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(severity)}`}>
                        {severity}
                      </span>
                      <span className="text-white font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Incidents */}
          <div className="bg-navy-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <FaClock className="mr-2 text-red-500" />
              DETAILED INCIDENT ANALYSIS
            </h3>
            
            <div className="space-y-4">
              {report.detailed_incidents?.slice(0, 10).map((incident, index) => (
                <div key={index} className="bg-navy-700 border border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-gray-400 text-sm font-mono">{incident.incident_id}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(incident.severity_level)}`}>
                          {incident.severity_level}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(incident.risk_assessment)}`}>
                          {incident.risk_assessment}
                        </span>
                      </div>
                      <div className="text-white font-semibold">{incident.classification}</div>
                      <div className="text-gray-400 text-sm">{incident.timestamp}</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-white font-semibold">{incident.confidence}</div>
                      <div className="text-gray-400 text-sm">Confidence</div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-gray-300 text-sm bg-navy-900 rounded p-3">
                      {expandedIncident === index ? 
                        incident.content : 
                        incident.content.length > 200 ? 
                          incident.content.substring(0, 200) + '...' : 
                          incident.content
                      }
                    </div>
                    
                    {incident.content.length > 200 && (
                      <button 
                        className="text-blue-400 text-sm mt-2 hover:text-blue-300"
                        onClick={() => setExpandedIncident(expandedIncident === index ? null : index)}
                      >
                        <FaEye className="mr-1" />
                        {expandedIncident === index ? 'Show Less' : 'Show Full Content'}
                      </button>
                    )}
                  </div>

                  {incident.metadata && (
                    <div className="text-xs text-gray-400 border-t border-gray-600 pt-2">
                      <strong>Source:</strong> {incident.metadata.username ? `Twitter (@${incident.metadata.username})` : 'Direct Input'}
                    </div>
                  )}
                </div>
              ))}
              
              {report.detailed_incidents?.length > 10 && (
                <div className="text-center text-gray-400 text-sm py-4">
                  Showing first 10 incidents. Download PDF for complete report.
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-navy-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <FaCrosshairs className="mr-2 text-green-500" />
              RECOMMENDATIONS
            </h3>
            
            <ul className="space-y-3">
              {report.recommendations?.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1 text-lg">•</span>
                  <span className="text-white">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Methodology */}
          <div className="bg-navy-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">METHODOLOGY & APPENDICES</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="text-md font-semibold text-white mb-2">Analysis Method:</h4>
                <p className="text-gray-300">{report.appendices?.methodology}</p>
              </div>
              
              <div>
                <h4 className="text-md font-semibold text-white mb-2">Confidence Thresholds:</h4>
                <p className="text-gray-300">{report.appendices?.confidence_thresholds}</p>
              </div>
              
              <div>
                <h4 className="text-md font-semibold text-white mb-2">Data Sources:</h4>
                <p className="text-gray-300">{report.appendices?.data_sources}</p>
              </div>
            </div>
          </div>

          {/* Classification Footer */}
          <div className="bg-red-600 text-white text-center py-2 font-bold text-sm rounded">
            {report.classification_level || 'OFFICIAL USE ONLY'}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default ThreatReport 