import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Settings from './pages/Settings'
import BatchAnalysis from './pages/BatchAnalysis'
import { toast } from 'react-toastify'
import axios from 'axios'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import CaseManagement from './pages/CaseManagement'
import ThreatMap from './pages/ThreatMap'

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:8000';

function App() {
  const [apiStatus, setApiStatus] = useState('loading')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [history, setHistory] = useState([])
  
  // Load prediction history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('detection-history')
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (error) {
        console.error('Failed to parse history:', error)
      }
    }
  }, [])
  
  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('detection-history', JSON.stringify(history))
  }, [history])
  
  // Check API status on mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await axios.get('/health')
        if (response.data.status === 'ok') {
          setApiStatus('online')
        } else {
          setApiStatus('error')
        }
      } catch (error) {
        console.error('API health check error:', error)
        setApiStatus('error')
      }
    }
    
    // Initial check
    checkApiStatus()
    
    // Set up interval for periodic checks
    const interval = setInterval(checkApiStatus, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  // Add a prediction to history
  const addToHistory = (prediction) => {
    setHistory(prev => {
      // Add timestamp to prediction
      const predictionWithTime = {
        ...prediction,
        timestamp: new Date().toISOString()
      }
      // Keep maximum 100 items, add new ones at the beginning
      return [predictionWithTime, ...prev].slice(0, 100)
    })
  }
  
  // Clear history
  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all prediction history?')) {
      setHistory([])
      toast.info('Prediction history cleared')
    }
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      <Sidebar isOpen={sidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} apiStatus={apiStatus} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900 text-white">
          <Routes>
            <Route path="/" element={<Dashboard apiStatus={apiStatus} addToHistory={addToHistory} />} />
            <Route path="/batch" element={<BatchAnalysis apiStatus={apiStatus} addToHistory={addToHistory} />} />
            <Route path="/history" element={<History history={history} />} />
            <Route path="/cases" element={<CaseManagement />} />
            <Route path="/threat-map" element={<ThreatMap />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
      
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  )
}

export default App 