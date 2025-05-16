import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import ThreatChart from '../components/ThreatChart'
import { 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaSpinner, 
  FaGlobe, 
  FaSearch, 
  FaRegFilePdf, 
  FaCrosshairs,
  FaClipboardCheck,
  FaFingerprint,
  FaExclamationCircle,
  FaFlag,
  FaUserShield,
  FaDatabase,
  FaHistory
} from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'

const Dashboard = ({ apiStatus, addToHistory }) => {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [threatStats, setThreatStats] = useState({
    totalAnalyzed: 12587,
    threatsDetected: 3429,
    highSeverity: 876,
    averageConfidence: 92.7,
    recentChange: 12.4,
    lastUpdated: '2 minutes ago'
  })
  const [threatCategories, setThreatCategories] = useState([
    { category: 'Hate Speech/Extremism', count: 1245, trend: 'up', percentage: 36.3 },
    { category: 'Direct Violence Threats', count: 834, trend: 'up', percentage: 24.3 },
    { category: 'Harassment and Intimidation', count: 647, trend: 'down', percentage: 18.9 },
    { category: 'Criminal Activity', count: 412, trend: 'neutral', percentage: 12.0 },
    { category: 'Child Safety Threats', count: 291, trend: 'down', percentage: 8.5 }
  ])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!text.trim()) {
      toast.error('Please enter some text to analyze')
      return
    }
    
    if (apiStatus !== 'online') {
      toast.error('API is not available. Please check the connection.')
      return
    }
    
    setLoading(true)
    setResult(null)
    
    try {
      const response = await axios.post('/api/predict', { text })
      setResult(response.data)
      addToHistory(response.data)
      toast.success('Analysis complete')
    } catch (error) {
      console.error('Prediction error:', error)
      toast.error(error.response?.data?.detail || 'Failed to analyze text')
    } finally {
      setLoading(false)
    }
  }
  
  const getThreatSeverity = (threatClass, confidence) => {
    // Determine severity based on class and confidence
    if (!threatClass || threatClass === 'Non-threat/Neutral') return 'none';
    
    const highRiskClasses = ['Direct Violence Threats', 'Child Safety Threats'];
    const confidence100 = confidence * 100;
    
    if (highRiskClasses.includes(threatClass) && confidence100 > 85) return 'critical';
    if (confidence100 > 90) return 'high';
    if (confidence100 > 75) return 'medium';
    return 'low';
  }
  
  const getThreatLevelClass = (threatClass, confidence) => {
    const severity = getThreatSeverity(threatClass, confidence);
    
    switch(severity) {
      case 'critical':
        return 'bg-gradient-to-r from-red-600 to-red-500 text-white font-bold shadow-lg shadow-red-500/30'
      case 'high':
        return 'bg-gradient-to-r from-orange-600 to-red-400 text-white shadow-lg shadow-orange-500/30'
      case 'medium':
        return 'bg-gradient-to-r from-amber-500 to-orange-400 text-white shadow shadow-amber-500/30'
      case 'low':
        return 'bg-gradient-to-r from-yellow-500 to-amber-400 text-white shadow shadow-yellow-500/20'
      case 'none':
        return 'bg-gradient-to-r from-emerald-500 to-green-400 text-white shadow shadow-emerald-500/20'
      default:
        return 'bg-gradient-to-r from-slate-600 to-slate-500 text-white'
    }
  }
  
  const getThreatLevelIcon = (threatClass, confidence) => {
    const severity = getThreatSeverity(threatClass, confidence);
    
    switch(severity) {
      case 'critical':
        return <FaExclamationCircle size={24} className="animate-pulse" />
      case 'high':
        return <FaExclamationTriangle size={24} />
      case 'medium':
        return <FaFlag size={24} />
      case 'low':
        return <FaUserShield size={24} />
      case 'none':
        return <FaShieldAlt size={24} />
      default:
        return <FaShieldAlt size={24} />
    }
  }
  
  const getSeverityLabel = (threatClass, confidence) => {
    const severity = getThreatSeverity(threatClass, confidence);
    
    switch(severity) {
      case 'critical':
        return 'CRITICAL SEVERITY'
      case 'high':
        return 'HIGH SEVERITY'
      case 'medium':
        return 'MEDIUM SEVERITY'
      case 'low':
        return 'LOW SEVERITY'
      case 'none':
        return 'NO THREAT DETECTED'
      default:
        return 'UNKNOWN'
    }
  }
  
  const getRecommendedActions = (threatClass, confidence) => {
    const severity = getThreatSeverity(threatClass, confidence);
    
    switch(severity) {
      case 'critical':
        return [
          'Immediate escalation to senior officer',
          'Create high-priority case file',
          'Identify source and location',
          'Prepare intervention protocol'
        ]
      case 'high':
        return [
          'Escalate to threat management team',
          'Create case file for tracking',
          'Monitor for additional related threats'
        ]
      case 'medium':
        return [
          'Add to monitoring watchlist',
          'Document in threat database',
          'Flag for follow-up review'
        ]
      case 'low':
        return [
          'Record in monitoring system',
          'No immediate action required'
        ]
      default:
        return [
          'No action required',
          'Archive for reference'
        ]
    }
  }

  // Animations
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }
  
  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Dashboard Header with Stats */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-wrap items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white mb-1">Threat Intelligence Dashboard</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-400">Last updated: {threatStats.lastUpdated}</span>
            <button className="btn btn-sm btn-primary">
              <FaDatabase className="mr-1.5" /> Export Data
            </button>
            <button className="btn btn-sm btn-secondary">
              <FaRegFilePdf className="mr-1.5" /> Generate Report
            </button>
          </div>
        </div>
        <p className="text-slate-400 max-w-3xl">
          Monitor and analyze potential threats in real-time. The advanced AI-powered system detects and classifies threats with high precision, providing actionable intelligence for law enforcement.
        </p>
      </motion.div>
      
      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item} className="card bg-gradient-to-br from-slate-800 to-slate-900 border-t border-slate-700 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Analyzed</p>
              <h3 className="text-2xl font-bold mt-1 text-white">{threatStats.totalAnalyzed.toLocaleString()}</h3>
            </div>
            <div className="p-2 rounded-md bg-blue-500/20 text-blue-400">
              <FaDatabase size={18} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <span className="text-green-400">+{threatStats.recentChange}%</span> from last week
          </div>
        </motion.div>
        
        <motion.div variants={item} className="card bg-gradient-to-br from-slate-800 to-slate-900 border-t border-slate-700 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Threats Detected</p>
              <h3 className="text-2xl font-bold mt-1 text-white">{threatStats.threatsDetected.toLocaleString()}</h3>
            </div>
            <div className="p-2 rounded-md bg-red-500/20 text-red-400">
              <FaExclamationTriangle size={18} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <span className="text-red-400">{Math.round(threatStats.threatsDetected/threatStats.totalAnalyzed*100)}%</span> of total content
          </div>
        </motion.div>
        
        <motion.div variants={item} className="card bg-gradient-to-br from-slate-800 to-slate-900 border-t border-slate-700 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">High Severity</p>
              <h3 className="text-2xl font-bold mt-1 text-white">{threatStats.highSeverity.toLocaleString()}</h3>
            </div>
            <div className="p-2 rounded-md bg-amber-500/20 text-amber-400">
              <FaExclamationCircle size={18} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <span className="text-amber-400">{Math.round(threatStats.highSeverity/threatStats.threatsDetected*100)}%</span> of threats
          </div>
        </motion.div>
        
        <motion.div variants={item} className="card bg-gradient-to-br from-slate-800 to-slate-900 border-t border-slate-700 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Avg Confidence</p>
              <h3 className="text-2xl font-bold mt-1 text-white">{threatStats.averageConfidence}%</h3>
            </div>
            <div className="p-2 rounded-md bg-emerald-500/20 text-emerald-400">
              <FaClipboardCheck size={18} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <span className="text-emerald-400">High precision</span> detection
          </div>
        </motion.div>
      </motion.div>
      
      {/* Threat Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mb-8"
      >
        <h2 className="text-xl font-bold mb-4 text-white">Threat Categories Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {threatCategories.map((category, index) => (
            <div key={index} className="card bg-slate-800 shadow">
              <h3 className="font-medium text-white mb-2">{category.category}</h3>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-white">{category.count}</div>
                <div className={`text-sm font-medium ${category.trend === 'up' ? 'text-red-400' : category.trend === 'down' ? 'text-green-400' : 'text-slate-400'}`}>
                  {category.percentage}%
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    index === 0 ? 'bg-purple-500' : 
                    index === 1 ? 'bg-red-500' : 
                    index === 2 ? 'bg-orange-500' : 
                    index === 3 ? 'bg-amber-500' : 
                    'bg-rose-700'
                  }`}
                  style={{ width: `${category.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      
      {/* Content Analysis Form */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {/* Input form */}
        <div className="lg:col-span-3">
          <div className="card mb-4 bg-slate-800 shadow-lg border-t border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Threat Analysis</h2>
              <div className="badge badge-primary">AI-Powered</div>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="text" className="block mb-2 font-medium text-slate-300">
                  Text Content for Analysis
                </label>
                <div className="relative">
                  <textarea
                    id="text"
                    className="textarea w-full bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring focus:ring-blue-500/20"
                    rows={8}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text content to analyze for potential threats..."
                    disabled={loading}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                    {text.length} characters
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  type="submit"
                  className="btn btn-primary rounded-md flex items-center"
                  disabled={loading || apiStatus !== 'online'}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FaSearch className="mr-2" />
                      Analyze Content
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  className="btn btn-secondary rounded-md"
                  onClick={() => setText('')}
                  disabled={loading || !text}
                >
                  Clear
                </button>
                
                <div className="flex-grow"></div>
                
                <div className="badge badge-slate">
                  <FaFingerprint className="mr-1.5" /> Secure Analysis
                </div>
              </div>
            </form>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="card bg-slate-800 shadow border-t border-slate-700">
              <h3 className="text-lg font-medium text-white mb-2">Quick Access</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn btn-sm btn-secondary">
                  <FaHistory className="mr-1.5" /> Past Analyses
                </button>
                <button className="btn btn-sm btn-secondary">
                  <FaDatabase className="mr-1.5" /> Saved Cases
                </button>
                <button className="btn btn-sm btn-secondary">
                  <FaGlobe className="mr-1.5" /> Threat Maps
                </button>
                <button className="btn btn-sm btn-secondary">
                  <FaCrosshairs className="mr-1.5" /> Analytics
                </button>
              </div>
            </div>
            <div className="card bg-slate-800 shadow border-t border-slate-700">
              <h3 className="text-lg font-medium text-white mb-3">Analysis Mode</h3>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center">
                  <input type="radio" id="standard" name="mode" className="mr-2" defaultChecked />
                  <label htmlFor="standard" className="text-slate-300">Standard Analysis</label>
                </div>
                <div className="flex items-center">
                  <input type="radio" id="deep" name="mode" className="mr-2" />
                  <label htmlFor="deep" className="text-slate-300">Deep Analysis</label>
                </div>
                <div className="flex items-center">
                  <input type="radio" id="forensic" name="mode" className="mr-2" />
                  <label htmlFor="forensic" className="text-slate-300">Forensic Mode</label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Results panel */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="card bg-slate-800 shadow-lg border-t border-slate-700 h-full"
              >
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-white">Analysis Results</h2>
                  <div className="text-xs text-slate-400">
                    ID: <span className="font-mono">THP-{Math.floor(Math.random() * 100000)}</span>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className={`rounded-lg px-4 py-3 flex items-center space-x-3 ${getThreatLevelClass(result.predicted_class, result.confidence)}`}>
                    {getThreatLevelIcon(result.predicted_class, result.confidence)}
                    <div>
                      <div className="text-xs font-bold tracking-wider">{getSeverityLabel(result.predicted_class, result.confidence)}</div>
                      <div className="text-lg font-semibold">{result.predicted_class}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-900 rounded-md p-3">
                      <div className="text-slate-400 mb-1">Confidence</div>
                      <div className="font-semibold text-white">{(result.confidence * 100).toFixed(2)}%</div>
                    </div>
                    
                    <div className="bg-slate-900 rounded-md p-3">
                      <div className="text-slate-400 mb-1">Classification</div>
                      <div className="font-semibold text-white">{result.threat ? 'Threat' : 'Non-Threat'}</div>
                    </div>
                    
                    {result.threat_confidence && (
                      <div className="bg-slate-900 rounded-md p-3">
                        <div className="text-slate-400 mb-1">Threat Confidence</div>
                        <div className="font-semibold text-white">{(result.threat_confidence * 100).toFixed(2)}%</div>
                      </div>
                    )}
                    
                    <div className="bg-slate-900 rounded-md p-3">
                      <div className="text-slate-400 mb-1">Response Time</div>
                      <div className="font-semibold text-white">{result.response_time_ms} ms</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Classification Breakdown</h3>
                  <ThreatChart probabilities={result.probabilities} visualizationData={result.visualization_data} />
                </div>
                
                {result.threat && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-white mb-3">Recommended Actions</h3>
                    <ul className="space-y-2">
                      {getRecommendedActions(result.predicted_class, result.confidence).map((action, index) => (
                        <li key={index} className="flex items-center text-slate-300">
                          <div className="w-6 h-6 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center mr-2 text-xs">
                            {index + 1}
                          </div>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="flex justify-between mt-6 pt-4 border-t border-slate-700">
                  <button className="btn btn-sm btn-primary">
                    <FaClipboardCheck className="mr-1.5" /> Create Case
                  </button>
                  <button className="btn btn-sm btn-secondary">
                    <FaRegFilePdf className="mr-1.5" /> Export Report
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card bg-slate-800 shadow-lg border-t border-slate-700 h-full flex flex-col items-center justify-center text-center p-8"
              >
                <div className="w-20 h-20 rounded-full bg-slate-700 mb-6 flex items-center justify-center">
                  <FaSearch className="text-slate-500" size={30} />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">No Analysis Results</h3>
                <p className="text-slate-400 mb-6">Enter text content and click "Analyze Content" to perform threat analysis.</p>
                <div className="text-xs text-slate-500 max-w-xs">
                  The AI will analyze the content for potential threats across multiple categories and provide detailed classification results.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default Dashboard 