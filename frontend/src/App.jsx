import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Settings from './pages/Settings'
import BatchAnalysis from './pages/BatchAnalysis'
import TwitterSearch from './pages/TwitterSearch'
import TwitterThreats from './pages/TwitterThreats'
import TwitterUserAnalysis from './pages/TwitterUserAnalysis'
import SummaryReport from './pages/SummaryReport'
import ThreatReport from './pages/ThreatReport'
import ThreatMap from './pages/ThreatMap'
import ThreatChatAI from './components/ThreatChatAI'
import Briefing from './pages/Briefing'
import FIRs from './pages/FIRs'
import LegalAnalysis from './pages/LegalAnalysis'
import { toast } from 'react-toastify'
import axios from 'axios'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser
} from "@clerk/clerk-react";
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:8000';

function App() {
  const [apiStatus, setApiStatus] = useState('loading')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [history, setHistory] = useState([])
  const [userStats, setUserStats] = useState(null)
  const [userCategories, setUserCategories] = useState(null)
  const { user, isLoaded, isSignedIn } = useUser()
  
  // Function to load user-specific data
  const loadUserData = async () => {
    if (isLoaded && isSignedIn && user) {
      try {
        console.log("Loading data for user with ID:", user.id);
        
        // Add user_id header to all requests and store in localStorage
        axios.defaults.headers.common['user_id'] = user.id;
        localStorage.setItem('userId', user.id);
        
        // Configure axios with better defaults for error handling
        axios.defaults.timeout = 30000; // 30s timeout (increased for AI responses)
        axios.defaults.retry = 3;
        axios.defaults.retryDelay = 1000;
        
        // Add an interceptor for retry logic
        axios.interceptors.response.use(undefined, function (err) {
          const { config } = err;
          if(!config || !config.retry) return Promise.reject(err);
          
          config.retryCount = config.retryCount || 0;
          
          if(config.retryCount >= config.retry) {
            return Promise.reject(err);
          }
          
          config.retryCount += 1;
          console.log(`Retrying API request (${config.retryCount}/${config.retry}): ${config.url}`);
          
          const backoff = new Promise(resolve => {
            setTimeout(function() {
              resolve();
            }, config.retryDelay || 1);
          });
          
          return backoff.then(function() {
            return axios(config);
          });
        });
        
        // First, make sure the user is registered
        try {
          console.log("Registering/updating user in Firebase");
          const registerResponse = await axios.post('/api/user/register', {
            user_id: user.id,
            email: user.emailAddresses[0]?.emailAddress || `${user.id}@example.com`,
            first_name: user.firstName,
            last_name: user.lastName
          });
          console.log("User registration/update successful:", registerResponse.data);
        } catch (regError) {
          console.error("Error registering user:", regError);
          console.error("Registration error details:", regError.response?.data || regError.message);
          // Continue anyway to try loading data - the backend will handle fallbacks
          console.log("Continuing with data loading despite registration error...");
        }
        
        // Set a flag to track if any API calls succeeded
        let anyApiSuccess = false;
        
        // Load stats with explicit headers
        try {
          console.log("Loading user stats from API");
          const statsResponse = await axios.get('/api/user/stats', {
            headers: { 'user_id': user.id }
          });
          
          if (statsResponse.data) {
            console.log("Successfully loaded stats from API:", statsResponse.data);
            setUserStats(statsResponse.data.stats);
            setUserCategories(statsResponse.data.categories);
            
            // Save to localStorage as backup
            localStorage.setItem(`threat-stats-${user.id}`, JSON.stringify(statsResponse.data.stats));
            localStorage.setItem(`threat-categories-${user.id}`, JSON.stringify(statsResponse.data.categories));
            anyApiSuccess = true;
          }
        } catch (statsError) {
          console.error("Error loading user stats:", statsError);
          console.error("Stats error details:", statsError.response?.data || statsError.message);
          
          // Create default stats for new users or when API fails
          const defaultStats = {
            totalAnalyzed: 0,
            threatsDetected: 0,
            highSeverity: 0,
            averageConfidence: 0.0,
            recentChange: 0.0,
            lastUpdated: "Never"
          };
          
          const defaultCategories = [
            {category: "Hate Speech/Extremism", count: 0, trend: "neutral", percentage: 0.0},
            {category: "Direct Violence Threats", count: 0, trend: "neutral", percentage: 0.0},
            {category: "Harassment and Intimidation", count: 0, trend: "neutral", percentage: 0.0},
            {category: "Criminal Activity", count: 0, trend: "neutral", percentage: 0.0},
            {category: "Child Safety Threats", count: 0, trend: "neutral", percentage: 0.0}
          ];
          
          setUserStats(defaultStats);
          setUserCategories(defaultCategories);
          
          // Save defaults to localStorage
          localStorage.setItem(`threat-stats-${user.id}`, JSON.stringify(defaultStats));
          localStorage.setItem(`threat-categories-${user.id}`, JSON.stringify(defaultCategories));
          
          console.log("Set default stats and categories for user");
        }
        
        // Load history with retry logic
        let retries = 0;
        const MAX_RETRIES = 3;
        
        const fetchHistory = async () => {
          try {
            console.log(`Loading user history from API (attempt ${retries + 1}/${MAX_RETRIES})`);
            const historyResponse = await axios.get('/api/user/history', {
              headers: { 'user_id': user.id }
            });
            
            if (historyResponse.data && Array.isArray(historyResponse.data)) {
              console.log(`Successfully loaded ${historyResponse.data.length} history items from API:`, 
                         historyResponse.data.length > 0 ? historyResponse.data.slice(0, 2) : 'No items');
              
              // Process history data to ensure all required fields are present
              const processedHistory = historyResponse.data
                .filter(item => item) // Filter out any null/undefined items
                .map(item => {
                  // Ensure we have consistent field naming
                  const processed = {
                    ...item,
                    text: item.text || item.threat_content || "",
                    predicted_class: item.predicted_class || item.threat_class || "Unknown",
                    confidence: typeof item.confidence === 'number' ? item.confidence : 
                                (typeof item.threat_confidence === 'number' ? item.threat_confidence / 100 : 0.5)
                  };
                  
                  // Ensure we have probabilities for visualization
                  if (!processed.probabilities || Object.keys(processed.probabilities).length === 0) {
                    // Create default probabilities
                    processed.probabilities = {
                      "Direct Violence Threats": 0.05,
                      "Criminal Activity": 0.05,
                      "Harassment and Intimidation": 0.05,
                      "Hate Speech/Extremism": 0.05,
                      "Child Safety Threats": 0.05,
                      "Non-threat/Neutral": 0.75
                    };
                    
                    // If we have a predicted class, boost its probability
                    if (processed.predicted_class && processed.predicted_class in processed.probabilities) {
                      processed.probabilities[processed.predicted_class] = processed.confidence || 0.8;
                    }
                  }
                  
                  return processed;
                });
              
              setHistory(processedHistory);
              // Make history available globally for reporting and export functions
              window.historyData = processedHistory;
              
              // Save as backup
              localStorage.setItem(`detection-history-${user.id}`, JSON.stringify(processedHistory));
              anyApiSuccess = true;
              return true; // Success
            } else {
              console.warn("API returned empty or invalid history data", historyResponse.data);
              return false;
            }
          } catch (historyError) {
            console.error("Error loading user history:", historyError);
            console.error("History error details:", historyError.response?.data || historyError.message);
            return false;
          }
        };
        
        // Try to fetch history with retries
        let historySuccess = false;
        while (retries < MAX_RETRIES && !historySuccess) {
          historySuccess = await fetchHistory();
          if (!historySuccess) {
            retries++;
            if (retries < MAX_RETRIES) {
              console.log(`Retrying history fetch in 1 second... (${retries}/${MAX_RETRIES})`);
              await new Promise(r => setTimeout(r, 1000)); // Wait 1 second between retries
            }
          }
        }
        
        // If all retries failed, fall back to localStorage
        if (!historySuccess) {
          toast.warning("Couldn't load history from server after multiple attempts");
          loadHistoryFromLocalStorage();
        }
        
      } catch (error) {
        console.error('Error in user data loading flow:', error);
        
        // Fall back to localStorage if API fails completely
        toast.error("Failed to load data from server. Using local storage instead.");
        loadFromLocalStorage();
      }
    } else {
      // Not signed in, use localStorage
      console.log("User not signed in, using localStorage");
      loadFromLocalStorage();
    }
  };
  
  // Helper function to just load history from localStorage
  const loadHistoryFromLocalStorage = () => {
    const savedHistory = localStorage.getItem('detection-history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(parsedHistory);
        window.historyData = parsedHistory;
      } catch (error) {
        console.error('Failed to parse history from localStorage:', error);
      }
    }
  };
  
  // Add the loadFromLocalStorage function
  const loadFromLocalStorage = () => {
    // Load prediction history from localStorage
    loadHistoryFromLocalStorage();
    
    // Also attempt to load any user stats from localStorage
    const savedStats = localStorage.getItem(`threat-stats-${user?.id || 'anonymous'}`);
    if (savedStats) {
      try {
        const parsedStats = JSON.parse(savedStats);
        setUserStats(parsedStats);
      } catch (error) {
        console.error('Failed to parse stats from localStorage:', error);
      }
    }
    
    // And categories if available
    const savedCategories = localStorage.getItem(`threat-categories-${user?.id || 'anonymous'}`);
    if (savedCategories) {
      try {
        const parsedCategories = JSON.parse(savedCategories);
        setUserCategories(parsedCategories);
      } catch (error) {
        console.error('Failed to parse categories from localStorage:', error);
      }
    }
  };
  
  // Function to clear user data on logout
  const clearUserData = () => {
    console.log("Clearing user data on logout");
    
    // Clear state
    setHistory([]);
    setUserStats(null);
    setUserCategories(null);
    
    // Clear axios headers
    delete axios.defaults.headers.common['user_id'];
    
    // Clear localStorage
    const userIdToRemove = localStorage.getItem('userId');
    if (userIdToRemove) {
      localStorage.removeItem(`threat-stats-${userIdToRemove}`);
      localStorage.removeItem(`threat-categories-${userIdToRemove}`);
      localStorage.removeItem(`detection-history-${userIdToRemove}`);
      localStorage.removeItem('userId');
    }
    
    // Clear any global data
    window.historyData = null;
    
    console.log("User data cleared successfully");
  };

  // Monitor authentication changes
  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn && user) {
        // User signed in - load their data
        loadUserData();
      } else {
        // User signed out - clear data
        clearUserData();
      }
    }
  }, [isLoaded, isSignedIn, user?.id]);

  // Load data only when user changes or signs in
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      loadUserData();
    }
  }, [isLoaded, isSignedIn, user?.id]);
  
  // Initialize global history refresh function for use across components
  useEffect(() => {
    // Expose a global function to refresh history
    window.refreshHistory = (historyData) => {
      console.log(`Refreshing global history with ${historyData?.length || 0} items`)
      if (Array.isArray(historyData)) {
        setHistory(historyData)
        window.historyData = historyData
      }
    }
    
    return () => {
      // Clean up on unmount
      delete window.refreshHistory
    }
  }, [])
  
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
    // Check for null or undefined prediction
    if (!prediction) {
      console.error("Attempted to add null/undefined prediction to history");
      return;
    }

    // Ensure prediction has a timestamp
    const predictionWithTime = {
      ...prediction,
      timestamp: prediction.timestamp || new Date().toISOString()
    };
    
    // Add to frontend state
    setHistory(prev => {
      // Keep maximum 100 items, add new ones at the beginning
      return [predictionWithTime, ...prev].slice(0, 100);
    });
    
    // Also add to window.historyData for export functions
    window.historyData = [predictionWithTime, ...(window.historyData || [])].slice(0, 100);
    
    // Also save to localStorage as backup (this will be our fallback)
    try {
      const savedHistory = JSON.parse(localStorage.getItem('detection-history') || '[]');
      const newHistory = [predictionWithTime, ...savedHistory].slice(0, 100);
      localStorage.setItem('detection-history', JSON.stringify(newHistory));
      
      // Also save user-specific history if signed in
      if (isSignedIn && user) {
        localStorage.setItem(`detection-history-${user.id}`, JSON.stringify(newHistory));
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  // Clear history
  const clearHistory = async () => {
    if (confirm('Are you sure you want to clear all prediction history?')) {
      setHistory([])
      window.historyData = []
      
      // For signed in users, we'd ideally have an API endpoint to clear history
      if (!isSignedIn) {
        localStorage.removeItem('detection-history')
      }
      
      toast.info('Prediction history cleared')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <SignedOut>
        <div className="flex flex-col min-h-screen">
          {/* Improved navigation for unauthenticated users */}
          <motion.nav 
            className="fixed w-full bg-slate-800/90 backdrop-blur-sm z-50 py-4 px-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center">
                <img src="/astra-logo.svg" alt="Astra Logo" className="h-10 w-10" />
                <span className="ml-3 text-2xl font-extrabold tracking-tight text-blue-400">
                  Astra
                </span>
              </div>
              
              <div className="flex items-center">
                <div className="hidden md:flex space-x-8 mr-8">
                  <Link to="/" className="text-white text-sm font-medium hover:text-blue-400 transition-colors">Home</Link>
                  <Link to="/about" className="text-white text-sm font-medium hover:text-blue-400 transition-colors">About</Link>
                  <Link to="/contact" className="text-white text-sm font-medium hover:text-blue-400 transition-colors">Contact</Link>
                </div>
                
                <div className="flex space-x-3">
                  <SignInButton mode="modal">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-md transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                      Sign Up
                    </button>
                  </SignUpButton>
                </div>
              </div>
            </div>
          </motion.nav>
          
          <main className="flex-grow pt-16">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          
          {/* Footer */}
          <motion.footer 
            className="bg-slate-800"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
              <div className="flex justify-center md:justify-start space-x-6">
                <a href="#" className="text-slate-400 hover:text-slate-300">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-slate-300">
                  <span className="sr-only">GitHub</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-slate-300">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
              <div className="mt-8 md:mt-0 md:order-1">
                <p className="text-center text-xs leading-5 text-slate-400">
                  &copy; 2024 Astra, Inc. All rights reserved.
                </p>
              </div>
            </div>
          </motion.footer>
        </div>
      </SignedOut>
      
      <SignedIn>
    <div className="flex h-screen bg-slate-900 text-white">
      <Sidebar isOpen={sidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} apiStatus={apiStatus} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900 text-white">
          <Routes>
                <Route path="/" element={
                  <Dashboard 
                    apiStatus={apiStatus} 
                    addToHistory={addToHistory} 
                    userStats={userStats} 
                    userCategories={userCategories}
                  />
                } />
            <Route path="/batch" element={<BatchAnalysis apiStatus={apiStatus} addToHistory={addToHistory} />} />
                <Route path="/history" element={<History history={history} clearHistory={clearHistory} />} />

            <Route path="/threat-map" element={<ThreatMap />} />
            <Route path="/briefing" element={<Briefing />} />
            <Route path="/settings" element={<Settings />} />
                            <Route path="/social-media/search" element={<TwitterSearch addToHistory={addToHistory} />} />
            <Route path="/social-media/threats" element={<TwitterThreats />} />
            <Route path="/social-media/user-analysis" element={<TwitterUserAnalysis addToHistory={addToHistory} />} />
            <Route path="/firs" element={<FIRs />} />
            <Route path="/legal-analysis" element={<LegalAnalysis />} />
                <Route path="/reports/summary" element={<SummaryReport />} />
                <Route path="/reports/threat" element={<ThreatReport />} />
                <Route path="/chat" element={<ThreatChatAI />} />
          </Routes>
        </main>
      </div>
        </div>
      </SignedIn>
      
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
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