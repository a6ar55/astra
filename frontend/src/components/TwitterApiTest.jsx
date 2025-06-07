import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTwitter, FaExclamationTriangle, FaSearch, FaSpinner, FaLocationArrow, FaUser, FaChartBar, FaShieldAlt, FaCode } from 'react-icons/fa';
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
  const [analyzingTweets, setAnalyzingTweets] = useState(false);
  const [individualAnalysis, setIndividualAnalysis] = useState({});

  const handleDirectSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setExtractedThreats([]);
    setIndividualAnalysis({});
    
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
      
      // Log the raw response to the console
      console.log("Raw Twitter API response:", JSON.stringify(response.data, null, 2));
      
      setResults(response.data);
      
      // Extract tweet content for classification
      const extractedData = extractTweetContent(response.data);
      await analyzeExtractedTweets(extractedData);
      
    } catch (err) {
      console.error("RapidAPI Twitter search error:", err);
      setError(err.message || "An error occurred during the search");
    } finally {
      setLoading(false);
    }
  };
  
  // Function to extract tweet content for processing
  const extractTweetContent = (data) => {
    const tweets = [];
    
    if (!data || !data.result || !data.result.timeline || !data.result.timeline.instructions) {
      return tweets;
    }
    
    // Find the entries array in the timeline
    const entriesArray = data.result.timeline.instructions.find(
      instruction => instruction.type === "TimelineAddEntries"
    )?.entries || [];
    
    // Filter for tweet entries
    entriesArray.forEach(entry => {
      if (entry.entryId && entry.entryId.startsWith('tweet-')) {
        const tweetContent = entry.content?.itemContent?.tweet_results?.result;
        if (tweetContent) {
          // Get user information
          const userInfo = tweetContent.core?.user_results?.result?.legacy || {};
          const tweetData = tweetContent.legacy || {};
          
          tweets.push({
            id: tweetData.id_str || `temp-${Math.random().toString(36).substr(2, 9)}`,
            content: tweetData.full_text || "No content available",
            username: userInfo.screen_name || "Unknown user",
            name: userInfo.name || "",
            location: userInfo.location || "Location not available",
            created_at: tweetData.created_at || "",
            profile_image_url: userInfo.profile_image_url_https || null,
            tweet_url: userInfo.screen_name ? `https://twitter.com/${userInfo.screen_name}/status/${tweetData.id_str}` : null,
            classification: null, // Will be filled by model analysis
            analysis_results: null // Will store full model results
          });
        }
      }
    });
    
    return tweets;
  };
  
  // Function to analyze a single tweet using the threat detection model
  const analyzeSingleTweet = async (tweet) => {
    try {
      const analysisResult = await apiService.analyzeThreat(tweet.content);
      console.log(`Analysis for tweet by @${tweet.username}:`, analysisResult);
      
      return {
        ...tweet,
        classification: analysisResult?.threat 
          ? analysisResult.stage2_result?.predicted_class || analysisResult.predicted_class
          : "Non-Threat",
        analysis_results: analysisResult,
        confidence: analysisResult?.confidence || 0,
        is_threat: analysisResult?.threat || false
      };
    } catch (error) {
      console.error(`Error analyzing tweet by @${tweet.username}:`, error);
      return {
        ...tweet,
        classification: determineFallbackThreatClass(tweet.content),
        is_threat: determineFallbackThreatClass(tweet.content) !== "Non-Threat",
        analysis_error: error.message
      };
    }
  };
  
  // Function to analyze extracted tweets using the threat detection model
  const analyzeExtractedTweets = async (tweets) => {
    if (!tweets || tweets.length === 0) return;
    
    setAnalyzingTweets(true);
    
    try {
      const analyzedTweets = [];
      const analysisDetails = {};
      
      // Process tweets one by one to log individual results
      for (const tweet of tweets) {
        const analyzedTweet = await analyzeSingleTweet(tweet);
        analyzedTweets.push(analyzedTweet);
        analysisDetails[tweet.id] = analyzedTweet.analysis_results;
      }
      
      setIndividualAnalysis(analysisDetails);
      console.log("All individual tweet analysis results:", analysisDetails);
      
      console.log("Analyzed tweets with threat detection model:", analyzedTweets);
      setExtractedThreats(analyzedTweets);
    } catch (error) {
      console.error("Error analyzing tweets:", error);
      setError("Failed to analyze tweets with the threat detection model");
      
      // Fall back to basic classification for UI display
      const fallbackAnalyzedTweets = tweets.map(tweet => ({
        ...tweet,
        classification: determineFallbackThreatClass(tweet.content),
        is_threat: determineFallbackThreatClass(tweet.content) !== "Non-Threat"
      }));
      
      setExtractedThreats(fallbackAnalyzedTweets);
    } finally {
      setAnalyzingTweets(false);
    }
  };
  
  // Simple function as fallback if model analysis fails
  const determineFallbackThreatClass = (content) => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('fuck') || lowerContent.includes('bitch')) {
      return "Hate Speech/Explicit Language";
    } else if (lowerContent.includes('threaten') || lowerContent.includes('kill')) {
      return "Direct Violence Threats";
    } else if (lowerContent.includes('harass') || lowerContent.includes('intimidate')) {
      return "Harassment and Intimidation";
    } else {
      return "Non-Threat";
    }
  };

  const getThreatBadgeColor = (threatClass) => {
    if (!threatClass) return "bg-gray-600 text-white";
    
    switch(threatClass) {
      case "Hate Speech":
      case "Hate Speech/Extremism":
      case "Hate Speech/Explicit Language":
        return "bg-red-600 text-white";
      case "Violence":
      case "Direct Violence Threats":
      case "Threats of Violence":
        return "bg-purple-700 text-white";
      case "Harassment":
      case "Harassment and Intimidation":
        return "bg-orange-600 text-white";
      case "Criminal Activity":
        return "bg-yellow-600 text-white";
      case "Child Exploitation":
      case "Child Safety Threats":
        return "bg-pink-700 text-white";
      case "Terrorism":
        return "bg-red-800 text-white";
      case "Self-Harm":
        return "bg-blue-600 text-white";
      case "Non-Threat":
      case "Not a Threat":
      case "Non-threat/Neutral":
        return "bg-green-600 text-white";
      default:
        return "bg-yellow-600 text-white";
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg shadow-lg mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <FaTwitter className="mr-3 text-blue-500" />
          Twitter Content Analysis
        </h2>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-5 mb-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2 flex items-center">
          <FaSearch className="text-blue-500 mr-2" />
          Search Configuration
        </h3>
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
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  style={{ color: 'black' }}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                style={{ color: 'black' }}
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

      {analyzingTweets && (
        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-md mb-6">
          <div className="flex items-center">
            <FaSpinner className="animate-spin h-5 w-5 text-blue-500 mr-2" />
            <span>Analyzing tweets with threat detection model...</span>
          </div>
        </div>
      )}

      {/* Extracted threat information display with improved styling */}
      {extractedThreats.length > 0 && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 border-b border-gray-200">
              <h3 className="font-bold text-lg text-white flex items-center">
                <FaShieldAlt className="mr-2" />
                Analyzed Tweets ({extractedThreats.length})
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                Content analyzed using threat detection model
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 border-b border-gray-200 bg-blue-50 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 border-b border-gray-200 bg-blue-50 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 border-b border-gray-200 bg-blue-50 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Content</th>
                    <th className="px-4 py-3 border-b border-gray-200 bg-blue-50 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Classification</th>
                    <th className="px-4 py-3 border-b border-gray-200 bg-blue-50 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedThreats.map((threat, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'} data-testid={`threat-row-${index}`}>
                      <td className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden">
                            {threat.profile_image_url ? (
                              <img 
                                src={threat.profile_image_url} 
                                alt={`@${threat.username}`}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'%3E%3C/path%3E%3C/svg%3E";
                                }}
                              />
                            ) : (
                              <div className="bg-blue-100 h-full w-full flex items-center justify-center">
                                <FaUser className="text-blue-500" />
                              </div>
                            )}
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
                        {threat.tweet_url ? (
                          <a 
                            href={threat.tweet_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block text-gray-900 text-sm truncate whitespace-normal line-clamp-2 hover:text-blue-600 hover:underline"
                          >
                            {threat.content}
                          </a>
                        ) : (
                          <p className="text-gray-900 text-sm truncate whitespace-normal line-clamp-2">
                            {threat.content}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getThreatBadgeColor(threat.classification)}`}>
                          {threat.classification}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-200">
                        <span className="text-gray-600 text-sm">
                          {threat.confidence ? `${Math.round(threat.confidence * 100)}%` : 'N/A'}
                        </span>
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
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-800 border-b border-gray-200 flex justify-between items-center cursor-pointer" 
               onClick={() => setShowRawJson(!showRawJson)}>
            <h3 className="font-semibold text-white flex items-center">
              <FaCode className="mr-2" />
              Raw API Response Data
            </h3>
            <button className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">
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