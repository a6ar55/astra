import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTwitter, FaExclamationTriangle, FaSearch, FaSpinner, FaLocationArrow, FaUser, FaChartBar, FaShieldAlt, FaCode } from 'react-icons/fa';
import apiService from '../services/apiService';
import ModelSelector from './ModelSelector';

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
  const [selectedModel, setSelectedModel] = useState('distilbert');

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
    
    // Process all entries to handle both tweet entries and user module entries
    entriesArray.forEach(entry => {
      // Handle regular tweet entries
      if (entry.entryId && entry.entryId.startsWith('tweet-')) {
        const tweetContent = entry.content?.itemContent?.tweet_results?.result;
        if (tweetContent) {
          // Get user information from legacy structure
          const userCore = tweetContent.core?.user_results?.result?.core || {};
          const userLegacy = tweetContent.core?.user_results?.result?.legacy || {};
          const userAvatar = tweetContent.core?.user_results?.result?.avatar || {};
          const tweetData = tweetContent.legacy || {};
          
          // Extract profile image from multiple possible locations
          const profileImageUrl = userAvatar.image_url || 
                                userLegacy.profile_image_url_https || 
                                userLegacy.profile_image_url ||
                                null;

          console.log(`Extracted profile image URL for tweet by ${userCore.screen_name}:`, profileImageUrl);
          
          tweets.push({
            id: tweetData.id_str || `temp-${Math.random().toString(36).substr(2, 9)}`,
            content: tweetData.full_text || "No content available",
            username: userCore.screen_name || userLegacy.screen_name || "Unknown user",
            name: userCore.name || userLegacy.name || "",
            display_name: userCore.name || userLegacy.name || "",
            bio: userLegacy.description || "",
            description: userLegacy.description || "",
            location: userLegacy.location || "Location not available",
            created_at: tweetData.created_at || "",
            profile_image_url: profileImageUrl,
            profile_pic_url: profileImageUrl,
            profile_image_url_https: profileImageUrl,
            likes: tweetData.favorite_count || 0,
            retweets: tweetData.retweet_count || 0,
            tweet_url: (userCore.screen_name || userLegacy.screen_name) ? `https://twitter.com/${userCore.screen_name || userLegacy.screen_name}/status/${tweetData.id_str}` : null,
            classification: null, // Will be filled by model analysis
            analysis_results: null, // Will store full model results
            // Store full user metadata for backend
            user_metadata: {
              display_name: userCore.name || userLegacy.name || "",
              twitter_handle: userCore.screen_name || userLegacy.screen_name || "",
              profile_image: profileImageUrl,
              location: userLegacy.location || "",
              bio: userLegacy.description || "",
              followers_count: userLegacy.followers_count || 0,
              following_count: userLegacy.friends_count || 0,
              verified: userLegacy.verified || false,
              account_created: userCore.created_at || "",
              public_metrics: userLegacy.public_metrics || {}
            }
          });
        }
      }
      
      // Handle user module entries (like in your search results)
      if (entry.entryId && entry.entryId.includes('usermodule')) {
        const timelineModule = entry.content;
        if (timelineModule && timelineModule.items) {
          timelineModule.items.forEach(item => {
            const userResult = item.item?.itemContent?.user_results?.result;
            if (userResult) {
              // Extract user data from the new structure - handle multiple possible formats
              const coreData = userResult.core || {};
              const avatarData = userResult.avatar || {};
              const locationData = userResult.location || {};
              const legacyData = userResult.legacy || {};
              
              // Extract profile image from multiple possible locations
              const profileImageUrl = avatarData.image_url || 
                                    legacyData.profile_image_url_https || 
                                    legacyData.profile_image_url ||
                                    userResult.profile_image_url ||
                                    userResult.profile_pic_url ||
                                    null;
              
              console.log(`Extracted profile image URL for ${coreData.screen_name}:`, profileImageUrl);
              
              // Extract location from multiple possible sources
              const userLocation = legacyData.location || 
                                 locationData.location || 
                                 userResult.location?.location || 
                                 "Location not available";

              // Create a synthetic tweet entry for users found in search
              tweets.push({
                id: userResult.rest_id || `user-${Math.random().toString(36).substr(2, 9)}`,
                content: legacyData.description || "Profile content", // Use description as content for analysis
                username: coreData.screen_name || "Unknown user",
                name: coreData.name || "",
                display_name: coreData.name || "",
                bio: legacyData.description || "",
                description: legacyData.description || "",
                location: userLocation,
                created_at: coreData.created_at || "",
                profile_image_url: profileImageUrl,
                profile_pic_url: profileImageUrl,
                profile_image_url_https: profileImageUrl,
                tweet_url: coreData.screen_name ? `https://twitter.com/${coreData.screen_name}` : null,
                likes: 0,
                retweets: 0,
                classification: null, // Will be filled by model analysis
                analysis_results: null, // Will store full model results
                is_user_profile: true, // Flag to indicate this is from user search, not tweet
                // Store full user metadata for backend
                user_metadata: {
                  display_name: coreData.name || "",
                  twitter_handle: coreData.screen_name || "",
                  profile_image: profileImageUrl,
                  location: userLocation,
                  bio: legacyData.description || "",
                  followers_count: legacyData.followers_count || 0,
                  following_count: legacyData.friends_count || 0,
                  verified: legacyData.verified || userResult.is_blue_verified || false,
                  account_created: coreData.created_at || "",
                  public_metrics: legacyData.public_metrics || {}
                }
              });
            }
          });
        }
      }
    });
    
    return tweets;
  };
  
  // Function to analyze a single tweet using the threat detection model
  const analyzeSingleTweet = async (tweet) => {
    try {
      // Prepare tweet metadata for backend analysis including user info
      const tweetMetadata = {
        tweet_id: tweet.id,
        created_at: tweet.created_at,
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        // Include user metadata
        user_name: tweet.name || tweet.display_name,
        user_profile_image_url: tweet.profile_image_url || tweet.profile_pic_url || tweet.profile_image_url_https,
        user_location: tweet.location,
        user_description: tweet.bio || tweet.description,
        user_followers_count: tweet.user_metadata?.followers_count || 0,
        user_friends_count: tweet.user_metadata?.following_count || 0,
        user_verified: tweet.user_metadata?.verified || false,
        user_created_at: tweet.user_metadata?.account_created || '',
        user_public_metrics: tweet.user_metadata?.public_metrics || {}
      };

      console.log(`Sending tweet analysis with metadata for @${tweet.username}:`, tweetMetadata);

      // Use analyzeSingleTweet instead of analyzeThreat to save user metadata
      const analysisResult = await apiService.analyzeSingleTweet(
        tweet.content, 
        tweet.username, 
        tweetMetadata,
        selectedModel
      );
      
      console.log(`Analysis for tweet by @${tweet.username} using ${selectedModel}:`, analysisResult);
      
      return {
        ...tweet,
        classification: analysisResult?.threat 
          ? analysisResult.stage2_result?.predicted_class || analysisResult.predicted_class
          : "Non-Threat",
        analysis_results: analysisResult,
        confidence: analysisResult?.confidence || 0,
        is_threat: analysisResult?.threat || false,
        firebase_id: analysisResult?.id // Store Firebase document ID
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
    if (!threatClass) return "badge-secondary";
    
    switch(threatClass) {
      case "Hate Speech":
      case "Hate Speech/Extremism":
      case "Hate Speech/Explicit Language":
        return "badge-danger";
      case "Violence":
      case "Direct Violence Threats":
      case "Threats of Violence":
        return "badge-danger";
      case "Harassment":
      case "Harassment and Intimidation":
        return "badge-warning";
      case "Criminal Activity":
        return "badge-warning";
      case "Child Exploitation":
      case "Child Safety Threats":
        return "badge-danger";
      case "Terrorism":
        return "badge-danger";
      case "Self-Harm":
        return "badge-primary";
      case "Non-Threat":
      case "Not a Threat":
      case "Non-threat/Neutral":
        return "badge-success";
      default:
        return "badge-warning";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative">
            <FaTwitter className="text-3xl text-primary-400 mr-3 drop-shadow-lg" />
            <div className="absolute inset-0 bg-primary-400/20 rounded-full blur-sm" />
          </div>
          <div>
            <h2 className="heading-4 text-text-primary">Twitter Content Analysis</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge badge-primary">RapidAPI</span>
              <span className="badge badge-accent">Live Data</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4 pb-3 border-b border-border-primary/20 flex items-center">
          <FaSearch className="text-primary-400 mr-2" />
          Search Configuration
        </h3>
        <form onSubmit={handleDirectSearch}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="direct-query" className="block text-sm font-medium text-text-secondary mb-2">
                  Search Query
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="direct-query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter keywords..."
                    className="input-glass w-full pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FaSearch className="text-text-muted" />
                  </div>
                </div>
              </div>
              <div className="w-full md:w-32">
                <label htmlFor="direct-count" className="block text-sm font-medium text-text-secondary mb-2">
                  Count
                </label>
                <select
                  id="direct-count"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="input-glass w-full"
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
                  className="btn btn-primary"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <FaSearch className="mr-2" />
                      Search
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Model Selection */}
            <div className="border-t border-border-primary/20 pt-4">
              <ModelSelector 
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            </div>
          </div>
        </form>
      </div>

      {error && (
        <div className="alert alert-danger">
          <div className="flex items-center">
            <FaExclamationTriangle className="h-5 w-5 mr-3" />
            <div>
            <span className="font-medium">Error:</span>
            <span className="ml-1">{error}</span>
            </div>
          </div>
        </div>
      )}

      {analyzingTweets && (
        <div className="alert alert-info">
          <div className="flex items-center">
            <FaSpinner className="animate-spin h-5 w-5 mr-3" />
            <span>Analyzing tweets with threat detection model...</span>
          </div>
        </div>
      )}

      {/* Extracted threat information display with improved styling */}
      {extractedThreats.length > 0 && (
        <div className="card-glass overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-primary-600 to-accent-600 border-b border-border-primary/20">
              <h3 className="font-bold text-lg text-white flex items-center">
                <FaShieldAlt className="mr-2" />
                Analyzed Tweets ({extractedThreats.length})
              </h3>
            <p className="text-primary-100 text-sm mt-1">
                Content analyzed using threat detection model
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead className="bg-glass-dark">
                  <tr>
                  <th className="px-4 py-3 border-b border-border-primary/20 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 border-b border-border-primary/20 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 border-b border-border-primary/20 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Content</th>
                  <th className="px-4 py-3 border-b border-border-primary/20 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Classification</th>
                  <th className="px-4 py-3 border-b border-border-primary/20 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedThreats.map((threat, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-glass/30' : 'bg-glass/50'} hover:bg-surface-light/30 transition-colors`} data-testid={`threat-row-${index}`}>
                    <td className="px-4 py-3 border-b border-border-primary/10">
                        <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden border-2 border-primary-500/30">
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
                            <div className="bg-primary-500/20 h-full w-full flex items-center justify-center">
                              <FaUser className="text-primary-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                          <p className="text-text-primary font-medium">@{threat.username}</p>
                          <p className="text-text-tertiary text-xs">{threat.name}</p>
                          </div>
                        </div>
                      </td>
                    <td className="px-4 py-3 border-b border-border-primary/10">
                        <div className="flex items-center">
                        <FaLocationArrow className="text-text-muted mr-1" />
                        <span className="text-text-secondary text-sm">{threat.location}</span>
                        </div>
                      </td>
                    <td className="px-4 py-3 border-b border-border-primary/10 max-w-md">
                        {threat.tweet_url ? (
                          <a 
                            href={threat.tweet_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                          className="block text-text-primary text-sm line-clamp-2 hover:text-primary-400 hover:underline transition-colors"
                          >
                            {threat.is_user_profile ? `Profile: ${threat.content}` : threat.content}
                          </a>
                        ) : (
                        <p className="text-text-primary text-sm line-clamp-2">
                            {threat.is_user_profile ? `Profile: ${threat.content}` : threat.content}
                          </p>
                        )}
                      </td>
                    <td className="px-4 py-3 border-b border-border-primary/10">
                      <span className={`badge ${getThreatBadgeColor(threat.classification)}`}>
                          {threat.classification}
                        </span>
                      </td>
                    <td className="px-4 py-3 border-b border-border-primary/10">
                      <span className="text-text-secondary text-sm font-medium">
                          {threat.confidence ? `${Math.round(threat.confidence * 100)}%` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </div>
      )}

      {/* Raw JSON results with improved readability */}
      {results && (
        <div className="card-glass overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-secondary-700 to-secondary-600 border-b border-border-primary/20 flex justify-between items-center cursor-pointer" 
               onClick={() => setShowRawJson(!showRawJson)}>
            <h3 className="font-semibold text-text-primary flex items-center">
              <FaCode className="mr-2" />
              Raw API Response Data
            </h3>
            <button className="btn btn-sm btn-secondary">
              {showRawJson ? 'Hide Data' : 'Show Data'}
            </button>
          </div>
          
          {showRawJson && (
            <div className="bg-secondary-950 p-6 overflow-auto text-sm max-h-96 font-mono">
              <pre className="text-success-400">
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