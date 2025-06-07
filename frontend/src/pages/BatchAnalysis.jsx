import { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { FaSpinner, FaUpload, FaFileAlt, FaExclamationTriangle, FaShieldAlt } from 'react-icons/fa'

const BatchAnalysis = ({ apiStatus, addToHistory }) => {
  const [texts, setTexts] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [textInput, setTextInput] = useState('')
  
  const handleAddText = () => {
    if (!textInput.trim()) {
      toast.error('Please enter some text')
      return
    }
    
    setTexts(prev => [...prev, textInput])
    setTextInput('')
  }
  
  const handleRemoveText = (index) => {
    setTexts(prev => prev.filter((_, i) => i !== index))
  }
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target.result
        const lines = content.split('\n').filter(line => line.trim())
        
        if (lines.length === 0) {
          toast.error('No text found in the file')
          return
        }
        
        if (lines.length > 100) {
          toast.warning('File contains more than 100 lines. Only the first 100 will be processed.')
        }
        
        setTexts(lines.slice(0, 100))
        toast.success(`Loaded ${Math.min(lines.length, 100)} texts from file`)
      } catch (error) {
        console.error('Error reading file:', error)
        toast.error('Failed to read file')
      }
    }
    
    reader.onerror = () => {
      toast.error('Failed to read file')
    }
    
    reader.readAsText(file)
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (texts.length === 0) {
      toast.error('Please add at least one text to analyze')
      return
    }
    
    if (apiStatus !== 'online') {
      toast.error('API is not available. Please check the connection.')
      return
    }
    
    setLoading(true)
    setResults([])
    
    try {
      // Get the user ID from the axios defaults or a user context if available
      const userId = axios.defaults.headers.common['user_id']
      const headers = userId ? { 'user_id': userId } : {}
      
      console.log("Sending batch analysis request with headers:", headers)
      const response = await axios.post('/api/predict/batch', { texts }, { headers })
      setResults(response.data.results)
      
      // Add each result to history
      response.data.results.forEach(result => {
        if (addToHistory) {
          console.log("Adding batch result to history:", result)
        addToHistory(result)
        }
      })
      
      toast.success(`Analysis complete for ${response.data.results.length} texts`)
      
      // If user is signed in, refresh history data after a delay
      if (userId) {
        setTimeout(async () => {
          try {
            console.log("Refreshing history data after batch analysis")
            const historyResponse = await axios.get('/api/user/history', {
              headers: { 'user_id': userId }
            })
            
            if (historyResponse.data && Array.isArray(historyResponse.data)) {
              console.log(`Received ${historyResponse.data.length} history items after batch analysis`)
              
              // Update global history data if needed
              if (window.refreshHistory && typeof window.refreshHistory === 'function') {
                window.refreshHistory(historyResponse.data)
              }
              
              // Update localStorage backup
              localStorage.setItem(`detection-history-${userId}`, JSON.stringify(historyResponse.data))
              
              // Also show a notification about history update
              toast.info(`${historyResponse.data.length} items in history updated`)
            } else {
              console.warn("Did not receive valid history data after batch analysis")
            }
          } catch (error) {
            console.error("Error refreshing history after batch analysis:", error)
            console.error("Error details:", error.response?.data || error.message)
          }
        }, 1500) // Longer delay for batch processing
      }
    } catch (error) {
      console.error('Batch prediction error:', error)
      toast.error(error.response?.data?.detail || 'Failed to analyze texts')
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-2xl font-bold mb-2">Batch Analysis</h1>
        <p className="text-gray-400">
          Analyze multiple texts at once. You can enter texts individually or upload a text file with one text per line.
        </p>
      </div>
      
      {/* Input form */}
      <div className="card mb-8">
        <div className="mb-6">
          <label htmlFor="textInput" className="block mb-2 font-medium">
            Add Text
          </label>
          <div className="flex">
            <textarea
              id="textInput"
              className="textarea flex-1 mr-2"
              rows={3}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text to add to the batch..."
              disabled={loading}
            />
            <button
              type="button"
              className="btn btn-primary self-end"
              onClick={handleAddText}
              disabled={loading}
            >
              Add
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block mb-2 font-medium">
            Upload File
          </label>
          <div className="flex items-center">
            <label className="btn bg-secondary hover:bg-gray-600 text-foreground flex items-center cursor-pointer">
              <FaUpload className="mr-2" />
              Choose File
              <input
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </label>
            <span className="ml-3 text-sm text-gray-400">
              Text file with one text per line (.txt, .csv)
            </span>
          </div>
        </div>
        
        {/* Text list */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Texts to Analyze ({texts.length})</h3>
            {texts.length > 0 && (
              <button
                type="button"
                className="text-sm text-red-500 hover:text-red-400"
                onClick={() => setTexts([])}
                disabled={loading}
              >
                Clear All
              </button>
            )}
          </div>
          
          {texts.length === 0 ? (
            <div className="bg-secondary rounded-lg p-4 text-center text-gray-400">
              <FaFileAlt className="mx-auto mb-2" size={24} />
              <p>No texts added yet. Add texts above or upload a file.</p>
            </div>
          ) : (
            <div className="bg-secondary rounded-lg p-2 max-h-60 overflow-y-auto">
              {texts.map((text, index) => (
                <div key={index} className="flex items-start p-2 border-b border-gray-700 last:border-b-0">
                  <div className="flex-1 mr-2 text-sm break-words">
                    {text.length > 100 ? `${text.substring(0, 100)}...` : text}
                  </div>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-400"
                    onClick={() => handleRemoveText(index)}
                    disabled={loading}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary flex items-center"
            onClick={handleSubmit}
            disabled={loading || texts.length === 0 || apiStatus !== 'online'}
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <FaShieldAlt className="mr-2" />
                Analyze Batch
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Results */}
      {results.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Text</th>
                  <th className="px-4 py-2 text-left">Classification</th>
                  <th className="px-4 py-2 text-left">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="truncate">
                        {result.text}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`rounded px-2 py-1 flex items-center space-x-1 inline-flex ${getThreatLevelClass(result.predicted_class)}`}>
                        {getThreatLevelIcon(result.predicted_class)}
                        <span>{result.predicted_class}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(result.confidence * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default BatchAnalysis 