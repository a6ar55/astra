import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTwitter, FaExclamationTriangle, FaSearch, FaSpinner, FaLocationArrow, FaUser } from 'react-icons/fa';
import apiService from '../services/apiService';

const RAPID_API_KEY = "8d1cd79b4amshe05e1c93c31c055p16a3e2jsn2127cb0fc270";
const RAPID_API_HOST = "twitter241.p.rapidapi.com";

const TwitterApiTest = () => {
  const [query, setQuery] = useState('');
  const [count, setCount] = useState(20);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [extractedThreats, setExtractedThreats] = useState([]);
  const [showRawJson, setShowRawJson] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 });

  const handleDirectSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setExtractedThreats([]);
    
    try {
      const response = await axios.get("https://twitter241.p.rapidapi.com/search-v2", {
        params: {
          type: "Top",
          count: count.toString(),
          query: query
        },
        headers: {
          "x-rapidapi-key": RAPID_API_KEY,
          "x-rapidapi-host": RAPID_API_HOST
        }
      });
      
      // Log the raw response to console in full
      console.log('Raw Twitter API Response:', response.data);
      
      setResults(response.data);
      
      // Extract tweets and analyze them
      const extracted = await extractThreatInfo(response.data);
      setExtractedThreats(extracted);
    } catch (err) {
      console.error("RapidAPI Twitter search error:", err);
      setError(err.message || "An error occurred during the search");
    } finally {
      setLoading(false);
      setAnalyzeProgress({ current: 0, total: 0 });
    }
  };
  
  // Function to extract threat content, analyze it with model, and get user info
  const extractThreatInfo = async (data) => {
    const threats = [];
    
    if (!data || !data.result || !data.result.timeline || !data.result.timeline.instructions) {
      return threats;
    }
    
    // Find the entries array in the timeline
    const entriesArray = data.result.timeline.instructions.find(
      instruction => instruction.type === "TimelineAddEntries"
    )?.entries || [];
    
    // Filter for tweet entries
    const tweetEntries = entriesArray.filter(entry => 
      entry.entryId && entry.entryId.startsWith('tweet-')
    );
    
    setAnalyzeProgress({ current: 0, total: tweetEntries.length });
    
    // Process each tweet through the model
    for (let i = 0; i < tweetEntries.length; i++) {
      const entry = tweetEntries[i];
      const tweetContent = entry.content?.itemContent?.tweet_results?.result;
      
      if (tweetContent) {
        try {
          // Get user information
          const userInfo = tweetContent.core?.user_results?.result?.legacy || {};
          const tweetData = tweetContent.legacy || {};
          const tweetText = tweetData.full_text || "No content available";
          
          // Use the threat detection model to analyze the tweet content
          const threatAnalysis = await apiService.analyzeThreat(tweetText);
          
          // Update progress
          setAnalyzeProgress(prev => ({ ...prev, current: i + 1 }));
          
          // Add to threats list if there's a valid analysis result
          threats.push({
            content: tweetText,
            threatClass: threatAnalysis.predicted_class || "Unknown",
            confidence: threatAnalysis.confidence || 0,
            isThreat: threatAnalysis.threat || false,
            threatAnalysis: threatAnalysis,
            username: userInfo.screen_name || "Unknown user",
            name: userInfo.name || "",
            location: userInfo.location || "Location not available",
            created_at: tweetData.created_at || ""
          });
        } catch (err) {
          console.error("Error analyzing tweet:", err);
          // Add entry with basic analysis fallback
          const userInfo = tweetContent.core?.user_results?.result?.legacy || {};
          const tweetData = tweetContent.legacy || {};
          const tweetText = tweetData.full_text || "No content available";
          
          threats.push({
            content: tweetText,
            threatClass: determineThreatClassFallback(tweetText),
            confidence: null,
            isThreat: null, 
            threatAnalysis: null,
            username: userInfo.screen_name || "Unknown user",
            name: userInfo.name || "",
            location: userInfo.location || "Location not available",
            created_at: tweetData.created_at || ""
          });
          
          // Update progress even for errors
          setAnalyzeProgress(prev => ({ ...prev, current: i + 1 }));
        }
      }
    }
    
    return threats;
  };
  
  // Simple function to classify threats as fallback if API fails
  const determineThreatClassFallback = (content) => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('fuck') || lowerContent.includes('bitch')) {
      return "Hate Speech/Extremism";
    } else if (lowerContent.includes('threaten') || lowerContent.includes('kill')) {
      return "Direct Violence Threats";
    } else if (lowerContent.includes('harass') || lowerContent.includes('intimidate')) {
      return "Harassment and Intimidation";
    } else {
      return "Potential Threat - Needs Review";
    }
  };

  const getThreatBadgeColor = (threatClass) => {
    switch(threatClass) {
      case "Hate Speech/Extremism":
        return "bg-red-600 text-white";
      case "Direct Violence Threats":
        return "bg-purple-700 text-white";
      case "Harassment and Intimidation":
        return "bg-orange-600 text-white";
      case "Criminal Activity":
        return "bg-blue-600 text-white";
      case "Child Safety Threats":
        return "bg-pink-600 text-white";
      case "Not a Threat":
        return "bg-green-600 text-white";
      default:
        return "bg-yellow-600 text-white";
    }
  };
  
  const getConfidenceDisplay = (confidence) => {
    if (confidence === null || confidence === undefined) return "N/A";
    const percent = typeof confidence === 'number' ? Math.round(confidence * 100) : confidence;
    return `${percent}%`;
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-lg mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <FaTwitter className="mr-3 text-blue-500" />
          Twitter Content Analysis
        </h2>
      </div>
      
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Search Configuration</h3>
        <form onSubmit={handleDirectSearch}>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="direct-query" className="block text-sm font-medium text-gray-700 mb-1">
                Search Query
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="direct-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter keywords..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
              </div>
            </div>
            <div className="w-full md:w-32">
              <label htmlFor="direct-count" className="block text-sm font-medium text-gray-700 mb-1">
                Count
              </label>
              <select
                id="direct-count"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm flex items-center justify-center transition-colors"
              >
                {loading ? (
                  <><FaSpinner className="animate-spin mr-2" /> Searching...</>
                ) : (
                  <><FaSearch className="mr-2" /> Search</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md mb-6">
          <div className="flex">
            <FaExclamationTriangle className="h-5 w-5 text-red-500 mr-2" />
            <span className="font-medium">Error:</span>
            <span className="ml-1">{error}</span>
          </div>
        </div>
      )}
      
      {/* Processing progress indicator */}
      {analyzeProgress.total > 0 && analyzeProgress.current < analyzeProgress.total && (
        <div className="mb-6 bg-blue-50 p-4 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-blue-700">Analyzing tweets with threat detection model...</div>
            <div className="text-sm text-blue-600">{analyzeProgress.current}/{analyzeProgress.total}</div>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${(analyzeProgress.current / analyzeProgress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Extracted threat information display with improved styling */}
      {extractedThreats.length > 0 && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-200">
              <h3 className="font-bold text-lg text-white flex items-center">
                <FaExclamationTriangle className="mr-2" />
                Detected Content Analysis ({extractedThreats.length})
              </h3>
              <p className="text-gray-200 text-sm mt-1">
                Content analyzed and classified by AI threat detection model
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Content</th>
                    <th className="px-4 py-3 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Classification</th>
                    <th className="px-4 py-3 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedThreats.map((threat, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} data-testid={`threat-row-${index}`}>
                      <td className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <FaUser className="text-blue-500" />
                          </div>
                          <div className="ml-3">
                            <p className="text-gray-900 font-medium">@{threat.username}</p>
                            <p className="text-gray-500 text-xs">{threat.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center">
                          <FaLocationArrow className="text-gray-400 mr-1" />
                          <span className="text-gray-600 text-sm">{threat.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-200 max-w-md">
                        <p className="text-gray-900 text-sm truncate whitespace-normal line-clamp-2">{threat.content}</p>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getThreatBadgeColor(threat.threatClass)}`}>
                          {threat.threatClass}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-200 text-sm">
                        {getConfidenceDisplay(threat.confidence)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Raw JSON results with improved readability */}
      {results && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer" 
               onClick={() => setShowRawJson(!showRawJson)}>
            <h3 className="font-semibold text-gray-700">Raw API Response Data</h3>
            <button className="text-sm text-blue-600 hover:text-blue-800">
              {showRawJson ? 'Hide Data' : 'Show Data'}
            </button>
          </div>
          
          {showRawJson && (
            <div className="bg-gray-900 p-4 rounded-b-md overflow-auto text-xs max-h-96">
              <pre className="text-green-400 font-mono">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TwitterApiTest; 