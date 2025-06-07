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
  FaChartBar,
  FaClock,
  FaPrint,
  FaExternalLinkAlt
} from 'react-icons/fa'
import { generateSummaryReport } from '../utils/reportUtils'

const SummaryReport = () => {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState(null)
  const [userStats, setUserStats] = useState(null)
  const [userCategories, setUserCategories] = useState(null)

  useEffect(() => {
    loadReportData()
  }, [user])

  const loadReportData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Load existing report
      const reportResponse = await axios.get('/api/user/reports/summary', {
        headers: { 'user_id': user.id }
      })
      
      if (reportResponse.data?.report) {
        setReport(reportResponse.data.report)
      }

      // Load stats and categories for report generation
      const statsResponse = await axios.get('/api/user/stats', {
        headers: { 'user_id': user.id }
      })
      
      if (statsResponse.data) {
        setUserStats(statsResponse.data.stats)
        setUserCategories(statsResponse.data.categories)
      }

    } catch (error) {
      console.error('Error loading report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const generateNewReport = async () => {
    if (!userStats || !userCategories) {
      toast.error('Unable to generate report: stats data not available')
      return
    }

    setGenerating(true)
    try {
      const userInfo = {
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'System User',
        email: user?.emailAddresses?.[0]?.emailAddress || 'N/A'
      }

      // Generate report data object
      const reportData = generateSummaryReport(userStats, userCategories, userInfo, true)
      
      // Save to database
      await axios.post('/api/user/reports/summary', reportData, {
        headers: { 'user_id': user.id }
      })

      setReport(reportData)
      toast.success('Intelligence summary report generated successfully!')

    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const downloadReport = () => {
    if (!report || !userStats || !userCategories) {
      toast.error('No report data available for download')
      return
    }

    const userInfo = {
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'System User',
      email: user?.emailAddresses?.[0]?.emailAddress || 'N/A'
    }

    // Generate PDF download
    generateSummaryReport(userStats, userCategories, userInfo, false)
    toast.success('Report downloaded successfully!')
  }

  const printReport = () => {
    window.print()
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
              <FaFileAlt className="mr-3 text-blue-500" />
              Intelligence Summary Report
            </h1>
            <p className="text-slate-400">
              Comprehensive threat landscape overview and analysis summary
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
              disabled={generating || !userStats}
            >
              {generating ? (
                <>
                  <FaSpinner className="mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FaChartBar className="mr-2" />
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
          <FaFileAlt className="text-6xl text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Summary Report Available</h3>
          <p className="text-gray-400 mb-6">
            Generate your first intelligence summary report to view threat landscape analysis
          </p>
          <button 
            className="btn btn-primary"
            onClick={generateNewReport}
            disabled={generating || !userStats}
          >
            {generating ? (
              <>
                <FaSpinner className="mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FaChartBar className="mr-2" />
                Generate Intelligence Summary
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
                <h3 className="text-lg font-semibold text-blue-400 mb-4">{report.report_type}</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-400">Report ID:</span> <span className="text-white font-mono">{report.report_id}</span></div>
                  <div><span className="text-gray-400">Generated:</span> <span className="text-white">{new Date(report.generation_date).toLocaleString()}</span></div>
                  <div><span className="text-gray-400">Analyst:</span> <span className="text-white">{report.analyst}</span></div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm space-y-2">
                  <div><span className="text-gray-400">Contact:</span> <span className="text-white">{report.analyst_email}</span></div>
                  <div><span className="text-gray-400">Assessment Period:</span> <span className="text-white">{report.assessment_period}</span></div>
                  <div><span className="text-gray-400">Next Assessment:</span> <span className="text-white">{report.next_assessment}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Threat Landscape Overview */}
          <div className="bg-navy-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <FaShieldAlt className="mr-2 text-blue-500" />
              THREAT LANDSCAPE OVERVIEW
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-navy-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{report.threat_landscape_overview?.overall_risk_level}</div>
                <div className="text-sm text-gray-400">Overall Risk Level</div>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{report.threat_landscape_overview?.total_assessments_conducted}</div>
                <div className="text-sm text-gray-400">Total Assessments</div>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{report.threat_landscape_overview?.confirmed_threats}</div>
                <div className="text-sm text-gray-400">Confirmed Threats</div>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{report.threat_landscape_overview?.threat_detection_rate}</div>
                <div className="text-sm text-gray-400">Detection Rate</div>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{report.threat_landscape_overview?.high_severity_incidents}</div>
                <div className="text-sm text-gray-400">High Severity</div>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{report.threat_landscape_overview?.trend_indicator}</div>
                <div className="text-sm text-gray-400">Trend Indicator</div>
              </div>
            </div>
          </div>

          {/* Category Analysis */}
          <div className="bg-navy-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <FaChartBar className="mr-2 text-green-500" />
              CATEGORY ANALYSIS
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-3 px-4 text-gray-300">Threat Type</th>
                    <th className="text-center py-3 px-4 text-gray-300">Count</th>
                    <th className="text-center py-3 px-4 text-gray-300">Percentage</th>
                    <th className="text-center py-3 px-4 text-gray-300">Trend</th>
                    <th className="text-center py-3 px-4 text-gray-300">Risk Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {report.category_analysis?.map((category, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-navy-700">
                      <td className="py-3 px-4 text-white">{category.threat_type}</td>
                      <td className="py-3 px-4 text-center text-white">{category.incident_count}</td>
                      <td className="py-3 px-4 text-center text-white">{category.percentage_of_total}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          category.trend === 'INCREASING' ? 'bg-red-500 text-white' :
                          category.trend === 'DECREASING' ? 'bg-green-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {category.trend}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          category.risk_assessment.includes('HIGH') ? 'bg-red-500 text-white' :
                          category.risk_assessment.includes('MODERATE') ? 'bg-yellow-500 text-black' :
                          'bg-green-500 text-white'
                        }`}>
                          {category.risk_assessment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Findings */}
          <div className="bg-navy-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <FaExclamationTriangle className="mr-2 text-yellow-500" />
              KEY FINDINGS
            </h3>
            
            <ul className="space-y-2">
              {report.key_findings?.map((finding, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-yellow-500 mr-2 mt-1">•</span>
                  <span className="text-white">{finding}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Immediate Actions Required */}
          <div className="bg-navy-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <FaClock className="mr-2 text-red-500" />
              IMMEDIATE ACTIONS REQUIRED
            </h3>
            
            <ul className="space-y-2">
              {report.immediate_actions_required?.map((action, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-red-500 mr-2 mt-1">•</span>
                  <span className="text-white">{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Intelligence Gaps */}
          <div className="bg-navy-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">INTELLIGENCE GAPS</h3>
            
            <ul className="space-y-2">
              {report.intelligence_gaps?.map((gap, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-gray-400 mr-2 mt-1">•</span>
                  <span className="text-white">{gap}</span>
                </li>
              ))}
            </ul>
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

export default SummaryReport 