import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import ThreatChart from '../components/ThreatChart'
import { useUser } from '@clerk/clerk-react'
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
  const { user } = useUser()
  const userId = user?.id || 'anonymous'
  
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // Initialize with empty values for a new user
  const [threatStats, setThreatStats] = useState({
    totalAnalyzed: 0,
    threatsDetected: 0,
    highSeverity: 0,
    averageConfidence: 0,
    recentChange: 0,
    lastUpdated: 'Never'
  })
  
  const [threatCategories, setThreatCategories] = useState([
    { category: 'Hate Speech/Extremism', count: 0, trend: 'neutral', percentage: 0 },
    { category: 'Direct Violence Threats', count: 0, trend: 'neutral', percentage: 0 },
    { category: 'Harassment and Intimidation', count: 0, trend: 'neutral', percentage: 0 },
    { category: 'Criminal Activity', count: 0, trend: 'neutral', percentage: 0 },
    { category: 'Child Safety Threats', count: 0, trend: 'neutral', percentage: 0 }
  ])
  
  // Load user-specific stats from localStorage on component mount
  useEffect(() => {
    if (!userId) return;
    
    const savedStats = localStorage.getItem(`threat-stats-${userId}`);
    const savedCategories = localStorage.getItem(`threat-categories-${userId}`);
    
    if (savedStats) {
      try {
        setThreatStats(JSON.parse(savedStats));
      } catch (error) {
        console.error('Failed to parse saved stats:', error);
      }
    }
    
    if (savedCategories) {
      try {
        setThreatCategories(JSON.parse(savedCategories));
      } catch (error) {
        console.error('Failed to parse saved categories:', error);
      }
    }
  }, [userId]);

  // Save stats to localStorage whenever they change
  useEffect(() => {
    if (!userId) return;
    
    localStorage.setItem(`threat-stats-${userId}`, JSON.stringify(threatStats));
  }, [threatStats, userId]);
  
  useEffect(() => {
    if (!userId) return;
    
    localStorage.setItem(`threat-categories-${userId}`, JSON.stringify(threatCategories));
  }, [threatCategories, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text || loading || apiStatus !== 'online') return

    setLoading(true)
    try {
      const response = await axios.post('/api/predict', { text })
      
      if (response.data) {
        const result = {
          text,
          result: response.data,
          timestamp: new Date().toISOString()
        }
        
        setResult(result)
        
        // Add to history
        addToHistory(result)
        
        // Update user stats
        const newStats = { ...threatStats }
        newStats.totalAnalyzed += 1
        
        if (response.data.threat) {
          newStats.threatsDetected += 1
          
          if (getThreatSeverity(response.data.predicted_class, response.data.confidence) === 'high' || 
              getThreatSeverity(response.data.predicted_class, response.data.confidence) === 'critical') {
            newStats.highSeverity += 1
          }
          
          // Update average confidence
          newStats.averageConfidence = ((newStats.averageConfidence * (newStats.threatsDetected - 1)) + 
                                       (response.data.confidence * 100)) / newStats.threatsDetected
          
          // Round to 1 decimal place
          newStats.averageConfidence = Math.round(newStats.averageConfidence * 10) / 10
        }
        
        // Update last updated
        newStats.lastUpdated = 'Just now'
        
        // Update recent change (simulate some activity)
        newStats.recentChange = Math.round((Math.random() * 5 + 1) * 10) / 10
        
        setThreatStats(newStats)
        
        // Update categories
        if (response.data.threat && response.data.predicted_class) {
          const newCategories = [...threatCategories]
          const categoryIndex = newCategories.findIndex(c => 
            c.category.toLowerCase().includes(response.data.predicted_class.toLowerCase()) ||
            response.data.predicted_class.toLowerCase().includes(c.category.toLowerCase())
          )
          
          if (categoryIndex !== -1) {
            newCategories[categoryIndex].count += 1
            
            // Recalculate percentages
            const totalThreats = newCategories.reduce((acc, curr) => acc + curr.count, 0)
            
            newCategories.forEach((cat, i) => {
              cat.percentage = totalThreats > 0 ? Math.round(cat.count / totalThreats * 1000) / 10 : 0
              
              // Randomly set trend for demonstration
              cat.trend = i === categoryIndex ? 'up' : Math.random() > 0.5 ? 'neutral' : 'down'
            })
            
            setThreatCategories(newCategories)
          }
        }
        
        toast.success('Analysis completed successfully')
      }
    } catch (error) {
      console.error('Analysis error:', error)
      toast.error(error.response?.data?.error || 'Failed to analyze text')
    } finally {
      setLoading(false)
    }
  }
  
  const getThreatSeverity = (threatClass, confidence) => {
    if (!threatClass) return 'none'
    
    // Convert confidence to percentage for comparison
    const confidencePercent = confidence * 100;
    
    // Combined logic based on threat class and confidence
    if (confidencePercent >= 90) {
      if (threatClass.includes('Violence') || threatClass.includes('Child')) {
        return 'critical'
      } else {
        return 'high'
      }
    } else if (confidencePercent >= 70) {
      if (threatClass.includes('Violence') || threatClass.includes('Child')) {
        return 'high'
      } else {
        return 'medium'
      }
    } else {
      return 'low'
    }
  }
  
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return 'bg-red-600'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-green-500'
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

  // Get welcome message based on user
  const getWelcomeMessage = () => {
    if (!user) return "Monitor and analyze potential threats in real-time.";
    
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    
    if (firstName) {
      return `Welcome, ${firstName}! Your personal threat intelligence dashboard.`;
    } else {
      return "Welcome to your personal threat intelligence dashboard.";
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
          {getWelcomeMessage()} The advanced AI-powered system detects and classifies threats with high precision, providing actionable intelligence.
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
            {threatStats.recentChange > 0 ? (
              <span className="text-green-400">+{threatStats.recentChange}%</span>
            ) : (
              <span>No recent activity</span>
            )}
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
            {threatStats.totalAnalyzed > 0 ? (
              <span className="text-red-400">{Math.round(threatStats.threatsDetected/threatStats.totalAnalyzed*100)}%</span>
            ) : (
              <span>0%</span>
            )} of total content
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
            {threatStats.threatsDetected > 0 ? (
              <span className="text-amber-400">{Math.round(threatStats.highSeverity/threatStats.threatsDetected*100)}%</span>
            ) : (
              <span>0%</span>
            )} of threats
          </div>
        </motion.div>
        
        <motion.div variants={item} className="card bg-gradient-to-br from-slate-800 to-slate-900 border-t border-slate-700 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Avg Confidence</p>
              <h3 className="text-2xl font-bold mt-1 text-white">{threatStats.averageConfidence > 0 ? `${threatStats.averageConfidence.toFixed(1)}%` : "N/A"}</h3>
            </div>
            <div className="p-2 rounded-md bg-emerald-500/20 text-emerald-400">
              <FaClipboardCheck size={18} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {threatStats.averageConfidence > 0 ? (
              <span className="text-emerald-400">High precision</span>
            ) : (
              <span>No data yet</span>
            )}
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
        <div className="lg:col-span-2">
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
          
          {/* Recent activity - could be implemented instead of the placeholder */}
          {threatStats.totalAnalyzed === 0 && (
            <div className="card bg-slate-800 shadow-lg border-t border-slate-700 p-4">
              <div className="flex items-center text-slate-400 mb-3">
                <FaHistory className="mr-2" />
                <h3 className="text-lg font-medium text-white">Getting Started</h3>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                Welcome to Astra! Your personal threat analytics dashboard is ready.
              </p>
              <ul className="text-xs text-slate-400 space-y-2">
                <li className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></div>
                  Enter text in the analysis box to begin detecting threats
                </li>
                <li className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></div>
                  Your results and stats will be saved to your profile
                </li>
                <li className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></div>
                  Use batch analysis for processing multiple entries at once
                </li>
              </ul>
            </div>
          )}
        </div>
        
        {/* Results panel */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="card bg-slate-800 shadow-lg border-t border-slate-700 h-full overflow-y-auto"
                style={{ minHeight: '700px' }}
              >
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-white">Analysis Results</h2>
                  <div className="text-xs text-slate-400">
                    ID: <span className="font-mono">THP-{Math.floor(Math.random() * 100000)}</span>
                  </div>
                </div>
                
                <div className="flex items-center mb-6">
                  <div className={`h-4 w-4 rounded-full mr-3 ${result.result.threat ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <span className={`font-semibold text-lg ${result.result.threat ? 'text-red-400' : 'text-green-400'}`}>
                    {result.result.threat ? 'Threat Detected' : 'No Threat Detected'}
                  </span>
                </div>
                
                {result.result.threat && (
                  <>
                    <div className="mb-4">
                      <div className="text-sm text-slate-400 mb-1">Threat Classification</div>
                      <div className="font-medium text-white">{result.result.predicted_class}</div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-sm text-slate-400 mb-1">Confidence Score</div>
                      <div className="flex items-center">
                        <div className="flex-grow h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              result.result.confidence * 100 > 90 ? 'bg-red-500' : 
                              result.result.confidence * 100 > 70 ? 'bg-orange-500' : 
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${result.result.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-white font-medium ml-2">{(result.result.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    {/* Threat Classification Chart */}
                    <div className="mb-4">
                      <div className="text-sm text-slate-400 mb-2">Threat Classification Analysis</div>
                      <div className="mt-2" style={{ minHeight: '350px' }}>
                        <ThreatChart 
                          probabilities={result.result.probabilities} 
                          visualizationData={result.result.visualization_data}
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-sm text-slate-400 mb-1">Severity</div>
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-opacity-20" 
                        style={{ backgroundColor: `${getSeverityColor(getThreatSeverity(result.result.predicted_class, result.result.confidence))}40` }}>
                        <span className={getSeverityColor(getThreatSeverity(result.result.predicted_class, result.result.confidence)).replace('bg-', 'text-')}>
                          {getThreatSeverity(result.result.predicted_class, result.result.confidence).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-slate-400 mb-2">Recommended Actions</div>
                      <ul className="space-y-1">
                        {getRecommendedActions(result.result.predicted_class, result.result.confidence).map((action, i) => (
                          <li key={i} className="flex items-center text-xs text-slate-300">
                            <FaFlag className="text-amber-500 mr-2" size={10} />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                
                {!result.result.threat && (
                  <div className="text-slate-300">
                    The content was analyzed and no threats were detected.
                  </div>
                )}
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