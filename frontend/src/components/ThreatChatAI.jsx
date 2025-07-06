import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/clerk-react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaPaperPlane,
  FaRobot,
  FaUser,
  FaShieldAlt,
  FaExclamationTriangle,
  FaClock,
  FaDatabase,
  FaBrain,
  FaSpinner,
  FaHistory,
  FaTrash,
  FaSyncAlt,
  FaBolt,
  FaEye,
  FaCloudDownloadAlt,
  FaSearch,
  FaGlobe
} from 'react-icons/fa'

const ThreatChatAI = () => {
  const { user } = useUser()
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [healthStatus, setHealthStatus] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Initialize chat
  useEffect(() => {
    loadChatHistory()
    checkChatHealth()
    
    // Welcome message
    if (messages.length === 0) {
      const welcomeMessage = {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: `🛡️ **ASTRA-AI Intelligence Assistant Activated**

Greetings, Agent. I am ASTRA-AI, your specialized threat analysis intelligence assistant. I have access to your complete threat intelligence database and am equipped with advanced pattern recognition capabilities.

**My Capabilities:**
• 🔍 **Threat Pattern Analysis** - Identify emerging threat vectors
• 📊 **Intelligence Synthesis** - Correlate data across multiple reports  
• ⚠️ **Risk Assessment** - Evaluate threat severity and impact
• 🎯 **Tactical Recommendations** - Provide actionable security guidance
• 📈 **Trend Analysis** - Monitor threat landscape evolution

I can answer questions about your threat reports, provide security insights, and assist with intelligence analysis. How may I assist you today?`,
        timestamp: new Date().toISOString(),
        context_used: false
      }
      setMessages([welcomeMessage])
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadChatHistory = async () => {
    try {
      const response = await axios.get('/api/chat/history', {
        headers: { 'user_id': user?.id || 'anonymous' },
        params: { limit: 50 }
      })
      
      if (response.data.status === 'success') {
        setChatHistory(response.data.history)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const checkChatHealth = async () => {
    try {
      const response = await axios.post('/api/chat/health', {
        check_type: 'detailed'
      })
      setHealthStatus(response.data)
    } catch (error) {
      console.error('Error checking chat health:', error)
      setHealthStatus({ status: 'error', chat_enabled: false })
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await axios.post('/api/chat/message', {
        message: userMessage.content,
        use_web_search: webSearchEnabled
      }, {
        headers: { 'user_id': user?.id || 'anonymous' },
        timeout: webSearchEnabled ? 90000 : 60000 // Extended timeout for web search
      })

      if (response.data.status === 'success') {
        // Debug: log full API response and any web sources
        console.log('📡 Raw API response:', response.data)
        if (response.data.web_sources && response.data.web_sources.length) {
          console.log('🌐 Web Sources Returned:', response.data.web_sources)
        }
        const aiMessage = {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          content: response.data.response,
          timestamp: response.data.timestamp,
          context_used: response.data.context_used,
          context_summary: response.data.context_summary,
          rag_context_used: response.data.rag_context_used,
          web_context_used: response.data.web_context_used,
          web_sources: response.data.web_sources || [],
          model: response.data.model
        }

        setMessages(prev => [...prev, aiMessage])
        
        // Show context feedback
        if (response.data.rag_context_used && response.data.web_context_used) {
          toast.success('Response enhanced with both internal intelligence and web search data', {
            icon: '🔍🌐'
          })
        } else if (response.data.rag_context_used) {
          toast.success('Response enhanced with your threat intelligence data', {
            icon: '🔍'
          })
        } else if (response.data.web_context_used) {
          toast.success('Response enhanced with real-time web intelligence', {
            icon: '🌐'
          })
        }
      } else {
        throw new Error(response.data.error || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      
      let errorContent = '⚠️ **System Error**\n\nI apologize, but I encountered an error processing your request. This could be due to:\n\n• Service temporarily unavailable\n• Network connectivity issues\n• Authentication problems\n\nPlease try again in a moment. If the issue persists, contact your system administrator.'
      let toastMessage = 'Failed to get AI response'
      
      // Check for specific error types
      if (error.code === 'ECONNABORTED') {
        errorContent = '⏱️ **Request Timeout**\n\nThe AI service took longer than expected to respond. This could be due to:\n\n• High server load\n• Complex analysis taking time\n• Network latency\n\nPlease try again with a shorter message or wait a moment.'
        toastMessage = 'Request timed out - please try again'
      } else if (error.response?.status === 402) {
        errorContent = '💳 **Credit Limit Reached**\n\nThe AI service has reached its usage limit. This could be due to:\n\n• API credits exhausted\n• Daily usage quota exceeded\n• Account needs upgrading\n\nPlease contact your administrator to add more credits.'
        toastMessage = 'AI service credit limit reached'
      }
      
      const errorMessage = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString(),
        isError: true
      }
      
      setMessages(prev => [...prev, errorMessage])
      toast.error(toastMessage)
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    toast.info('Chat cleared')
  }

  const refreshRAG = async () => {
    try {
      const response = await axios.post('/api/chat/rag/refresh', {}, {
        headers: { 'user_id': user?.id || 'anonymous' }
      })
      
      if (response.data.status === 'success') {
        toast.success(`RAG cache refreshed: ${response.data.reports_cached} reports indexed`, {
          icon: '🔄'
        })
        checkChatHealth()
      }
    } catch (error) {
      console.error('Error refreshing RAG:', error)
      toast.error('Failed to refresh intelligence database')
    }
  }

  const migrateData = async () => {
    try {
      setIsLoading(true)
      const response = await axios.post('/api/chat/rag/migrate', {}, {
        headers: { 'user_id': user?.id || 'anonymous' }
      })
      
      if (response.data.status === 'success') {
        const { migrated_items, final_rag_reports, breakdown } = response.data
        toast.success(
          `Data migration complete! ${migrated_items} items migrated. RAG now has ${final_rag_reports} reports.`, 
          { icon: '🚀', duration: 5000 }
        )
        
        // Add system message about migration
        const migrationMessage = {
          id: 'migration-' + Date.now(),
          role: 'assistant',
          content: `🚀 **Data Migration Complete**

Successfully migrated your data to the intelligence database:

• **Analysis History**: ${breakdown.analysis_history} items
• **Threat Reports**: ${breakdown.threat_reports} items  
• **Summary Reports**: ${breakdown.summary_reports} items

**Total**: ${migrated_items} items migrated
**RAG Database**: ${final_rag_reports} reports now available

Your chat experience is now enhanced with your complete threat intelligence history!`,
          timestamp: new Date().toISOString(),
          context_used: false
        }
        
        setMessages(prev => [...prev, migrationMessage])
        checkChatHealth()
      }
    } catch (error) {
      console.error('Error migrating data:', error)
      toast.error('Failed to migrate data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatMessage = (content) => {
    // Convert markdown-style formatting to JSX
    const lines = content.split('\n')
    
    return lines.map((line, index) => {
      // Handle headers
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <h4 key={index} className="font-bold text-blue-400 mb-2">
            {line.replace(/\*\*/g, '')}
          </h4>
        )
      }
      
      // Handle bullet points
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <div key={index} className="flex items-start mb-1">
            <span className="text-blue-400 mr-2">•</span>
            <span>{line.substring(2)}</span>
          </div>
        )
      }
      
      // Handle numbered lists
      if (/^\d+\./.test(line)) {
        return (
          <div key={index} className="flex items-start mb-1">
            <span className="text-blue-400 mr-2 font-medium">
              {line.match(/^\d+\./)[0]}
            </span>
            <span>{line.replace(/^\d+\.\s*/, '')}</span>
          </div>
        )
      }
      
      // Handle bold text
      if (line.includes('**')) {
        const parts = line.split('**')
        return (
          <p key={index} className="mb-1">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-yellow-400">{part}</strong> : part
            )}
          </p>
        )
      }
      
      // Handle empty lines
      if (line.trim() === '') {
        return <br key={index} />
      }
      
      // Regular lines
      return <p key={index} className="mb-1">{line}</p>
    })
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <FaRobot className="text-3xl text-blue-500" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center">
                ASTRA-AI Intelligence Assistant
                <FaShieldAlt className="ml-2 text-blue-500" />
              </h1>
              <p className="text-sm text-gray-400">
                {healthStatus?.chat_enabled ? 
                  `Connected • ${healthStatus?.rag_service?.reports_cached || 0} reports indexed` :
                  'Initializing...'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Show migration button if no reports are cached */}
            {healthStatus?.rag_service?.reports_cached === 0 && (
              <button
                onClick={migrateData}
                disabled={isLoading}
                className="btn btn-sm btn-warning tooltip"
                data-tip="Migrate your Firebase data to RAG database"
              >
                <FaCloudDownloadAlt className={isLoading ? 'animate-spin' : ''} />
                {isLoading ? 'Migrating...' : 'Sync Data'}
              </button>
            )}
            
            {/* Web Search Toggle */}
            <button
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`btn btn-sm tooltip ${
                webSearchEnabled ? 'btn-primary' : 'btn-ghost'
              }`}
              data-tip={webSearchEnabled ? 'Disable web search' : 'Enable web search for real-time information'}
            >
              <FaGlobe className={webSearchEnabled ? 'text-white' : 'text-gray-400'} />
              {webSearchEnabled && <span className="text-xs ml-1">Web</span>}
            </button>
            
            <button
              onClick={refreshRAG}
              className="btn btn-sm btn-ghost tooltip"
              data-tip="Refresh Intelligence Database"
            >
              <FaSyncAlt />
            </button>
            
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn btn-sm btn-ghost tooltip"
              data-tip="Chat History"
            >
              <FaHistory />
            </button>
            
            <button
              onClick={clearChat}
              className="btn btn-sm btn-ghost tooltip"
              data-tip="Clear Chat"
            >
              <FaTrash />
            </button>
            
            <div className="flex items-center space-x-1 text-xs">
              <FaBrain className="text-blue-400" />
              <span className="text-gray-400">RAG Enhanced</span>
              {healthStatus?.web_search_enabled && (
                <>
                  <span className="text-gray-500">•</span>
                  <FaGlobe className="text-green-400" />
                  <span className="text-gray-400">Web Ready</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Health Status Bar */}
        {healthStatus && (
          <div className="mt-3 flex items-center space-x-4 text-xs">
            <div className={`flex items-center space-x-1 ${
              healthStatus.chat_enabled ? 'text-green-400' : 'text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                healthStatus.chat_enabled ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span>AI Service</span>
            </div>
            
            <div className="flex items-center space-x-1 text-blue-400">
              <FaDatabase className="w-3 h-3" />
              <span>Reports: {healthStatus?.rag_service?.reports_cached || 0}</span>
            </div>
            
            <div className="flex items-center space-x-1 text-purple-400">
              <FaBolt className="w-3 h-3" />
              <span>Model: DeepSeek R1</span>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-4xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white ml-12'
                  : message.isError
                  ? 'bg-red-900 border border-red-600 text-red-100 mr-12'
                  : 'bg-gray-800 border border-gray-700 text-gray-100 mr-12'
              }`}>
                {/* Message Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {message.role === 'user' ? (
                      <FaUser className="text-blue-200" />
                    ) : (
                      <FaRobot className={message.isError ? 'text-red-400' : 'text-blue-400'} />
                    )}
                    <span className="font-medium text-sm">
                      {message.role === 'user' ? 'Agent' : 'ASTRA-AI'}
                    </span>
                    
                    {(message.rag_context_used || message.web_context_used || message.context_used) && (
                      <div className="flex items-center space-x-1 text-xs bg-blue-900 bg-opacity-50 px-2 py-1 rounded">
                        {message.rag_context_used && <FaDatabase className="text-blue-400" />}
                        {message.web_context_used && <FaGlobe className="text-green-400" />}
                        {!message.rag_context_used && !message.web_context_used && <FaEye className="text-blue-400" />}
                        <span className="text-blue-300">
                          {message.rag_context_used && message.web_context_used ? 'Multi-Intel Enhanced' :
                           message.rag_context_used ? 'Database Enhanced' :
                           message.web_context_used ? 'Web Enhanced' : 'Intel Enhanced'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <FaClock />
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                
                {/* Message Content */}
                <div className="prose prose-invert max-w-none">
                  {formatMessage(message.content)}
                </div>
                
                {/* Context Summary */}
                {(message.context_summary || message.web_sources?.length > 0) && (
                  <div className="mt-3 space-y-2">
                    {message.context_summary && (
                      <div className="p-3 bg-blue-900 bg-opacity-30 rounded border border-blue-600 border-opacity-50">
                        <div className="flex items-center space-x-2 text-xs text-blue-300 mb-1">
                          <FaDatabase />
                          <span>Intelligence Context Applied</span>
                        </div>
                        <p className="text-xs text-blue-200">{message.context_summary}</p>
                      </div>
                    )}
                    
                    {message.web_sources && message.web_sources.length > 0 && (
                      <div className="p-3 bg-green-900 bg-opacity-30 rounded border border-green-600 border-opacity-50">
                        <div className="flex items-center space-x-2 text-xs text-green-300 mb-2">
                          <FaGlobe />
                          <span>Web Sources ({message.web_sources.length})</span>
                        </div>
                        <div className="space-y-1">
                          {message.web_sources.map((source, idx) => (
                            <div key={idx} className="text-xs">
                              <a 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-green-400 hover:text-green-300 underline block"
                              >
                                {source.title}
                              </a>
                              <span className="text-green-200 opacity-75">({source.word_count} words)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mr-12">
              <div className="flex items-center space-x-3">
                <FaSpinner className="animate-spin text-blue-400" />
                <span className="text-gray-300">ASTRA-AI is analyzing...</span>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about threat intelligence, request analysis, or get security guidance..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={inputMessage.split('\n').length || 1}
              maxLength={2000}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              {inputMessage.length}/2000
            </div>
          </div>
          
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="btn btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaPaperPlane className="mr-2" />
            Send
          </button>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {webSearchEnabled && (
              <span className="flex items-center space-x-1 text-green-400">
                <FaGlobe className="w-3 h-3" />
                <span>Web search enabled</span>
              </span>
            )}
          </div>
          {healthStatus?.chat_enabled && (
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>AI Assistant Ready</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ThreatChatAI 