import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import ThreatChart from '../components/ThreatChart'
import ThreatClassificationView from '../components/ThreatClassificationView'
import { useUser } from '@clerk/clerk-react'
import { exportAsCSV, prepareThreatDataForExport, exportAsJson } from '../utils/exportUtils'
import { generateThreatReport, generateSummaryReport } from '../utils/reportUtils'
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

const Dashboard = ({ apiStatus, addToHistory, userStats, userCategories }) => {
  const { user, isLoaded: userLoaded, isSignedIn } = useUser()
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  
  // Use userStats from props if available, otherwise use local state as fallback
  const [threatStats, setThreatStats] = useState({
    totalAnalyzed: 0,
    threatsDetected: 0,
    highSeverity: 0,
    averageConfidence: 0,
    recentChange: 0,
    lastUpdated: 'Never'
  })
  
  // Use userCategories from props if available, otherwise use local state as fallback
  const [threatCategories, setThreatCategories] = useState([
    { category: 'Hate Speech/Extremism', count: 0, trend: 'neutral', percentage: 0 },
    { category: 'Direct Violence Threats', count: 0, trend: 'neutral', percentage: 0 },
    { category: 'Harassment and Intimidation', count: 0, trend: 'neutral', percentage: 0 },
    { category: 'Criminal Activity', count: 0, trend: 'neutral', percentage: 0 },
    { category: 'Child Safety Threats', count: 0, trend: 'neutral', percentage: 0 }
  ])
  
  const [history, setHistory] = useState([])
  const [summaryReport, setSummaryReport] = useState(null)
  const [threatReport, setThreatReport] = useState(null)
  
  // Add this effect to set the user ID when the user is loaded
  useEffect(() => {
    if (userLoaded && isSignedIn && user) {
      setUserId(user.id)
      // Set user ID in axios headers for all requests
      axios.defaults.headers.common['user_id'] = user.id
    }
  }, [userLoaded, isSignedIn, user])

  // Update the useEffect that handles props to ensure it waits for data
  useEffect(() => {
    if (userStats) {
      console.log("Using provided user stats:", userStats)
      setThreatStats(userStats)
      setDataLoading(false)
    }
    
    if (userCategories) {
      console.log("Using provided user categories:", userCategories)
      setThreatCategories(userCategories)
    }
  }, [userStats, userCategories])

  // Load user-specific stats from localStorage on component mount as fallback
  useEffect(() => {
    // Only use localStorage if we don't have API data
    if (!userStats && !userCategories) {
      if (!userId) return;
      
      console.log("No API data, falling back to localStorage");
      
      const savedStats = localStorage.getItem(`threat-stats-${userId}`);
      const savedCategories = localStorage.getItem(`threat-categories-${userId}`);
      
      if (savedStats) {
        try {
          const parsedStats = JSON.parse(savedStats);
          console.log("Using localStorage stats:", parsedStats);
          setThreatStats(parsedStats);
        } catch (error) {
          console.error('Failed to parse saved stats:', error);
        }
      }
      
      if (savedCategories) {
        try {
          const parsedCategories = JSON.parse(savedCategories);
          console.log("Using localStorage categories:", parsedCategories);
          setThreatCategories(parsedCategories);
        } catch (error) {
          console.error('Failed to parse saved categories:', error);
        }
      }
    }
  }, [userId, userStats, userCategories]);

  // Save stats to localStorage whenever they change (as fallback)
  useEffect(() => {
    if (!userId) return;
    
    // Only save to localStorage if not using API data
    if (!userStats) {
      localStorage.setItem(`threat-stats-${userId}`, JSON.stringify(threatStats));
    }
  }, [threatStats, userId, userStats]);
  
  useEffect(() => {
    if (!userId) return;
    
    // Only save to localStorage if not using API data
    if (!userCategories) {
      localStorage.setItem(`threat-categories-${userId}`, JSON.stringify(threatCategories));
    }
  }, [threatCategories, userId, userCategories]);

  // Update the polling effect to use the userId directly
  useEffect(() => {
    // Skip if no user ID
    if (!userId) return
    
    console.log("Setting up stats polling mechanism with userId:", userId)
    
    // Initial fetch (important to get data on first load)
    fetchLatestStats()
    
    // Function to fetch the latest stats
    async function fetchLatestStats() {
      try {
        console.log("Polling for latest stats with userId:", userId)
        const response = await axios.get(`/api/user/stats?user_id=${userId}`, {
          headers: { 'user_id': userId }
        })
        
        if (response.data) {
          console.log("Received updated stats from polling:", response.data)
          setThreatStats(response.data.stats)
          setThreatCategories(response.data.categories)
          setDataLoading(false)
        }
      } catch (error) {
        console.error("Error polling for stats:", error)
      }
    }
    
    // Set up polling interval
    const interval = setInterval(fetchLatestStats, 30000)
    return () => clearInterval(interval)
  }, [userId])

  // Fetch analysis history on mount and after each analysis
  useEffect(() => {
    if (!userId) return
    const fetchHistory = async () => {
      try {
        console.log("Fetching user history from API with userId:", userId)
        const res = await axios.get('/api/user/history', { 
          headers: { 'user_id': userId }
        })
        
        if (res.data && Array.isArray(res.data)) {
          console.log(`Fetched ${res.data.length} history items from API:`, res.data)
          
          // Ensure data has all required fields for visualization
          const processedData = res.data.map(item => {
            // Check if the item has probabilities needed for the threat chart
            if (!item.probabilities || Object.keys(item.probabilities).length === 0) {
              console.warn(`History item ${item.id} missing probabilities, adding default values`)
              // Add default probabilities based on predicted_class
              const defaultProbs = {
                "Direct Violence Threats": 0.05,
                "Criminal Activity": 0.05,
                "Harassment and Intimidation": 0.05,
                "Hate Speech/Extremism": 0.05,
                "Child Safety Threats": 0.05,
                "Non-threat/Neutral": 0.75
              }
              
              // If there's a predicted class, boost its probability
              if (item.predicted_class && item.predicted_class in defaultProbs) {
                defaultProbs[item.predicted_class] = item.confidence || 0.8
                // Normalize the rest
                const remaining = 1 - defaultProbs[item.predicted_class]
                const others = Object.keys(defaultProbs).filter(k => k !== item.predicted_class)
                others.forEach(key => {
                  defaultProbs[key] = remaining / others.length
                })
              }
              
              item.probabilities = defaultProbs
            }
            
            return item
          })
          
          setHistory(processedData)
          // Also update global history data for export
          window.historyData = processedData
          // Also save as backup to localStorage
          localStorage.setItem(`detection-history-${userId}`, JSON.stringify(processedData))
        } else {
          console.warn("API returned empty or invalid history data:", res.data)
        }
      } catch (e) {
        console.error("Error fetching history:", e)
        console.error("Error details:", e.response?.data || e.message)
        
        // fallback to localStorage
        const local = localStorage.getItem(`detection-history-${userId}`)
        if (local) {
          try {
            console.log("Falling back to localStorage for history")
            const parsed = JSON.parse(local)
            setHistory(parsed)
            window.historyData = parsed
          } catch (err) {
            console.error("Error parsing local history:", err)
          }
        }
      }
    }
    fetchHistory()
  }, [userId, result]) // refetch after each analysis

  // Fetch summary and threat reports
  useEffect(() => {
    if (!userId) return
    const fetchReports = async () => {
      try {
        const summary = await axios.get(`/api/user/reports/summary`, { headers: { 'user_id': userId } })
        setSummaryReport(summary.data?.report || null)
      } catch {}
      try {
        const threat = await axios.get(`/api/user/reports/threat`, { headers: { 'user_id': userId } })
        setThreatReport(threat.data?.report || null)
      } catch {}
    }
    fetchReports()
  }, [userId])

  // Update the handleSubmit function to properly update metrics
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text || loading || apiStatus !== 'online') return
    
    setLoading(true)
    try {
      // Log user info for debugging
      console.log("Current user ID for submission:", userId)
      
      // Add user_id to the headers if available
      const headers = {}
      if (userId) {
        headers.user_id = userId
        console.log("Setting user_id header for prediction:", userId)
      }
      
      console.log("Sending request to /api/predict with headers:", headers)
      const response = await axios.post('/api/predict', { text }, { headers })
      
      console.log("Received response from prediction:", response.data)
      
      // Update the UI with the response
      setResult(response.data)
      
      // Call the addToHistory prop to update global state
      if (addToHistory) {
      addToHistory(response.data)
      }
      
      // After successful analysis, immediately fetch the latest stats and history
      if (userId) {
        try {
          console.log("Fetching latest data after prediction")
          // Add a small delay to ensure Firebase has time to update
          setTimeout(async () => {
            try {
              // Fetch updated stats
              const statsResponse = await axios.get('/api/user/stats', {
                headers: { 'user_id': userId }
              })
              
              if (statsResponse.data) {
                console.log("Updated stats after prediction:", statsResponse.data)
                setThreatStats(statsResponse.data.stats)
                setThreatCategories(statsResponse.data.categories)
                
                // Also update localStorage
                localStorage.setItem(`threat-stats-${userId}`, JSON.stringify(statsResponse.data.stats))
                localStorage.setItem(`threat-categories-${userId}`, JSON.stringify(statsResponse.data.categories))
              }
              
              // Fetch updated history
              const historyResponse = await axios.get('/api/user/history', {
                headers: { 'user_id': userId }
              })
              
              if (historyResponse.data && Array.isArray(historyResponse.data)) {
                console.log(`Fetched ${historyResponse.data.length} updated history items from API`)
                setHistory(historyResponse.data)
                // Also update global history data for export
                window.historyData = historyResponse.data
                // Also save as backup to localStorage
                localStorage.setItem(`detection-history-${userId}`, JSON.stringify(historyResponse.data))
              }
            } catch (error) {
              console.error("Error fetching updated data:", error)
            }
          }, 1000) // Use a longer delay to ensure Firebase has updated
        } catch (error) {
          console.error("Error setting up data refresh:", error)
        }
      }
      
    } catch (error) {
      console.error('Prediction error:', error)
      toast.error('Failed to analyze text. Please try again.')
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

  // Add these functions to handle export and report generation
  const handleExportData = () => {
    // If we have history data passed from parent (App.jsx), use it
    // Otherwise use a placeholder message
    if (window.historyData && window.historyData.length > 0) {
      // Prepare data for export
      const exportData = prepareThreatDataForExport(window.historyData);
      
      // Show a modal or dropdown for export options
      const exportType = window.confirm('Choose export format:\nOK for CSV, Cancel for JSON') ? 'csv' : 'json';
      
      if (exportType === 'csv') {
        exportAsCSV(exportData, 'astra-threat-data');
        toast.success('Data exported as CSV successfully');
      } else {
        exportAsJson(window.historyData, 'astra-threat-data');
        toast.success('Data exported as JSON successfully');
      }
    } else {
      toast.info('No threat analysis data available to export');
    }
  };
  
  const handleGenerateReport = async () => {
    const reportType = window.confirm('Choose report type:\nOK for Summary Report, Cancel for Full Threat Report') ? 'summary' : 'full';
    const userInfo = {
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest User',
      email: user?.emailAddresses?.[0]?.emailAddress || 'N/A'
    };
    
    if (reportType === 'summary') {
      // Use userStats and userCategories props or fallback to threatStats and threatCategories state
      const statsToUse = userStats || threatStats;
      const categoriesToUse = userCategories || threatCategories;
      
      if (!statsToUse || !categoriesToUse) {
        toast.error('Unable to generate summary report: stats data not available');
        return;
      }
      
      try {
        const report = generateSummaryReport(statsToUse, categoriesToUse, userInfo, true); // true = return as object
        
        if (userId && userId !== 'anonymous') {
          await axios.post('/api/user/reports/summary', report, { headers: { 'user_id': userId } });
          toast.success('Intelligence summary report generated and saved to database!');
        } else {
          toast.success('Intelligence summary report generated! Sign in to save reports.');
        }
        
        // Also generate and download PDF
        generateSummaryReport(statsToUse, categoriesToUse, userInfo, false);
      } catch (error) {
        console.error('Error generating summary report:', error);
        toast.error('Failed to generate summary report');
      }
    } else {
      const historyToUse = window.historyData || history || [];
      
      if (!historyToUse || historyToUse.length === 0) {
        toast.error('No threat analysis data available for detailed report generation');
        return;
      }
      
      try {
        const report = generateThreatReport(historyToUse, userInfo, true); // true = return as object
        
        if (userId && userId !== 'anonymous') {
          await axios.post('/api/user/reports/threat', report, { headers: { 'user_id': userId } });
          toast.success('Detailed threat analysis report generated and saved to database!');
      } else {
          toast.success('Detailed threat analysis report generated! Sign in to save reports.');
        }
        
        // Also generate and download PDF
        generateThreatReport(historyToUse, userInfo, false);
      } catch (error) {
        console.error('Error generating threat report:', error);
        toast.error('Failed to generate threat report');
      }
    }
  };

  // Update saveToLocalStorage to be more comprehensive
  const saveToLocalStorage = (analysisResult) => {
    if (!analysisResult) return;
    
    try {
      // Save the current analysis to localStorage as a backup
      const currentUserId = userId || 'anonymous';
      
      // Update and save history
      const savedHistory = JSON.parse(localStorage.getItem('detection-history') || '[]');
      const newHistory = [analysisResult, ...savedHistory].slice(0, 100); // Keep max 100 items
      localStorage.setItem('detection-history', JSON.stringify(newHistory));
      
      // Update and save stats
      let stats = JSON.parse(localStorage.getItem(`threat-stats-${currentUserId}`) || JSON.stringify({
        totalAnalyzed: 0,
        threatsDetected: 0, 
        highSeverity: 0,
        averageConfidence: 0,
        recentChange: 0,
        lastUpdated: 'Never'
      }));
      
      // Update stats based on the analysis result
      stats.totalAnalyzed++;
      stats.lastUpdated = 'Just now';
      
      if (analysisResult.threat) {
        stats.threatsDetected++;
        
        // Calculate severity
        const severity = getThreatSeverity(analysisResult.predicted_class, analysisResult.confidence);
        if (severity === 'high' || severity === 'critical') {
          stats.highSeverity++;
        }
        
        // Update average confidence
        const oldTotal = stats.threatsDetected > 1 ? 
          (stats.averageConfidence * (stats.threatsDetected - 1)) : 0;
        const newTotal = oldTotal + (analysisResult.confidence * 100);
        stats.averageConfidence = newTotal / stats.threatsDetected;
        stats.averageConfidence = Math.round(stats.averageConfidence * 10) / 10; // Round to 1 decimal
      }
      
      // Add some random change for visual effect
      stats.recentChange = Math.round((Math.random() * 5 + 1) * 10) / 10;
      
      // Save updated stats
      localStorage.setItem(`threat-stats-${currentUserId}`, JSON.stringify(stats));
      
      // If not using the API data, update the stats state directly
      if (!userId) {
        setThreatStats(stats);
      }
      
      // Update categories if it's a threat
      if (analysisResult.threat && analysisResult.predicted_class) {
        let categories = JSON.parse(localStorage.getItem(`threat-categories-${currentUserId}`) || '[]');
        
        // If no categories, create default ones
        if (!categories.length) {
          categories = [
            {category: "Hate Speech/Extremism", count: 0, trend: "neutral", percentage: 0},
            {category: "Direct Violence Threats", count: 0, trend: "neutral", percentage: 0},
            {category: "Harassment and Intimidation", count: 0, trend: "neutral", percentage: 0},
            {category: "Criminal Activity", count: 0, trend: "neutral", percentage: 0},
            {category: "Child Safety Threats", count: 0, trend: "neutral", percentage: 0}
          ];
        }
        
        // Find matching category
        const categoryIndex = categories.findIndex(c => 
          c.category.toLowerCase().includes(analysisResult.predicted_class.toLowerCase()) ||
          analysisResult.predicted_class.toLowerCase().includes(c.category.toLowerCase())
        );
        
        if (categoryIndex !== -1) {
          categories[categoryIndex].count++;
          categories[categoryIndex].trend = 'up';
          
          // Recalculate percentages
          const totalThreats = categories.reduce((acc, curr) => acc + curr.count, 0);
          categories.forEach((cat, i) => {
            cat.percentage = totalThreats > 0 ? Math.round(cat.count / totalThreats * 1000) / 10 : 0;
            cat.trend = i === categoryIndex ? 'up' : Math.random() > 0.5 ? 'neutral' : 'down';
          });
          
          // Save updated categories
          localStorage.setItem(`threat-categories-${currentUserId}`, JSON.stringify(categories));
          
          // If not using the API data, update the categories state directly
          if (!userId) {
            setThreatCategories(categories);
          }
        }
      }
      
      console.log('Saved analysis results to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

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
            <span className="text-sm text-slate-400">Last updated: {dataLoading ? "Loading..." : (threatStats?.lastUpdated || "Never")}</span>
            <button 
              className="btn btn-sm btn-primary"
              onClick={() => handleExportData()}
            >
              <FaDatabase className="mr-1.5" /> Export Data
            </button>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => handleGenerateReport()}
            >
              <FaRegFilePdf className="mr-1.5" /> Generate Report
            </button>
          </div>
        </div>
        <p className="text-slate-400 max-w-3xl">
          {userId ? `Welcome, ${user?.firstName || 'User'}! ` : 'Welcome! '}
          Your personal threat intelligence dashboard. The advanced AI-powered system detects and classifies threats with high precision, providing actionable intelligence.
        </p>
      </motion.div>
      
      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {dataLoading ? (
          // Show loading skeleton for stats when loading
          Array(4).fill(0).map((_, index) => (
            <motion.div key={index} variants={item} className="card bg-gradient-to-br from-slate-800 to-slate-900 border-t border-slate-700 shadow-xl p-4">
              <div className="animate-pulse h-16"></div>
            </motion.div>
          ))
        ) : (
          <>
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
          </>
        )}
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
                  <div className={`h-4 w-4 rounded-full mr-3 ${result.threat ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <span className={`font-semibold text-lg ${result.threat ? 'text-red-400' : 'text-green-400'}`}>
                    {result.threat ? 'Threat Detected' : 'No Threat Detected'}
                  </span>
                </div>
                
                {/* Two-Stage Threat Classification View */}
                <div className="mb-4">
                  <ThreatClassificationView result={result} />
                </div>
                
                {result.threat && (
                  <>
                    <div className="mb-4">
                      <div className="text-sm text-slate-400 mb-1">Severity</div>
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-opacity-20" 
                        style={{ backgroundColor: `${getSeverityColor(getThreatSeverity(result.predicted_class, result.confidence))}40` }}>
                        <span className={getSeverityColor(getThreatSeverity(result.predicted_class, result.confidence)).replace('bg-', 'text-')}>
                          {getThreatSeverity(result.predicted_class, result.confidence).toUpperCase()}
                        </span>
                      </div>
                          </div>
                    
                    <div>
                      <div className="text-sm text-slate-400 mb-2">Recommended Actions</div>
                      <ul className="space-y-1">
                        {getRecommendedActions(result.predicted_class, result.confidence).map((action, i) => (
                          <li key={i} className="flex items-center text-xs text-slate-300">
                            <FaFlag className="text-amber-500 mr-2" size={10} />
                            <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  </>
                )}
                
                {!result.threat && (
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