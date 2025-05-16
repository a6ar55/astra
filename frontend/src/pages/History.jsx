import { useState } from 'react'
import { FaTrash, FaExclamationTriangle, FaShieldAlt, FaSearch } from 'react-icons/fa'
import ThreatChart from '../components/ThreatChart'

const History = ({ history, clearHistory }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResult, setSelectedResult] = useState(null)
  
  // Filter history based on search term
  const filteredHistory = history.filter(item => 
    item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.predicted_class.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
  
  const getThreatLevelClass = (threatClass) => {
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
    if (threatClass === 'Non-threat/Neutral') {
      return <FaShieldAlt size={16} />
    }
    return <FaExclamationTriangle size={16} />
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Prediction History</h1>
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
          
          <button
            className="btn flex items-center bg-danger hover:bg-red-600"
            onClick={clearHistory}
          >
            <FaTrash className="mr-2" />
            Clear History
          </button>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* History list */}
        <div className="card lg:w-1/2 h-[600px] flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
          
          {filteredHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              {searchTerm ? 'No matching results found' : 'No prediction history yet'}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredHistory.map((item, index) => (
                <div
                  key={index}
                  className={`
                    p-4 border-b border-gray-700 cursor-pointer hover:bg-secondary
                    ${selectedResult === item ? 'bg-secondary' : ''}
                  `}
                  onClick={() => setSelectedResult(item)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className={`rounded px-2 py-1 flex items-center space-x-1 ${getThreatLevelClass(item.predicted_class)}`}>
                      {getThreatLevelIcon(item.predicted_class)}
                      <span>{item.predicted_class}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.timestamp && formatDate(item.timestamp)}
                    </div>
                  </div>
                  
                  <div className="text-sm line-clamp-2 text-gray-300">
                    {item.text}
                  </div>
                  
                  <div className="mt-1 text-xs text-gray-400">
                    Confidence: {(item.confidence * 100).toFixed(2)}%
                  </div>
                </div>
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
                  <div className={`rounded-lg px-3 py-1 flex items-center space-x-2 ${getThreatLevelClass(selectedResult.predicted_class)}`}>
                    {getThreatLevelIcon(selectedResult.predicted_class)}
                    <span className="font-medium">{selectedResult.predicted_class}</span>
                  </div>
                  <div className="ml-4">
                    <span className="text-gray-400 mr-2">Confidence:</span>
                    <span className="font-medium">{(selectedResult.confidence * 100).toFixed(2)}%</span>
                  </div>
                </div>
                
                <div className="bg-secondary rounded-lg p-4 text-sm">
                  <div className="font-medium mb-1 text-gray-400">Analyzed Text:</div>
                  <div className="whitespace-pre-wrap">{selectedResult.text}</div>
                </div>
                
                {selectedResult.timestamp && (
                  <div className="mt-3 text-sm text-gray-400">
                    Analysis performed on {formatDate(selectedResult.timestamp)}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Classification Breakdown</h3>
                <ThreatChart probabilities={selectedResult.probabilities} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default History 