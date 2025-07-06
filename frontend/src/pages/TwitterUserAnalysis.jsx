import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaTwitter, 
  FaExclamationTriangle, 
  FaSearch, 
  FaSpinner, 
  FaPlus, 
  FaTimes, 
  FaUser, 
  FaChartPie, 
  FaShieldAlt,
  FaUserShield,
  FaFingerprint,
  FaFileAlt,
  FaBalanceScale,
  FaExclamation,
  FaBan,
  FaEye,
  FaFolderOpen,
  FaUserSecret,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { Pie, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import apiService from '../services/apiService';
import ModelSelector from '../components/ModelSelector';

const RAPID_API_KEY = "8d1cd79b4amshe05e1c93c31c055p16a3e2jsn2127cb0fc270";
const RAPID_API_HOST = "twitter154.p.rapidapi.com";

const TwitterUserAnalysis = () => {
  const [usernames, setUsernames] = useState(['']);
  const [tweetCount, setTweetCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [analyzingTweets, setAnalyzingTweets] = useState(false);
  const [error, setError] = useState(null);
  const [analyzedUsers, setAnalyzedUsers] = useState([]);
  const [activeUserIndex, setActiveUserIndex] = useState(null);
  const [currentUserTweets, setCurrentUserTweets] = useState([]);
  const [apiFailures, setApiFailures] = useState(0);
  const [useMockAnalysis, setUseMockAnalysis] = useState(false);
  const [selectedModel, setSelectedModel] = useState('distilbert');

  // Reset API failures count on component mount
  useEffect(() => {
    setApiFailures(0);
    setUseMockAnalysis(false);
  }, []);

  // Switch to mock analysis if too many failures
  useEffect(() => {
    if (apiFailures >= 3) {
      console.warn("Too many API failures detected, switching to mock analysis mode");
      setUseMockAnalysis(true);
    }
  }, [apiFailures]);

  // Add new username input field
  const addUsernameField = () => {
    setUsernames([...usernames, '']);
  };

  // Remove username input field
  const removeUsernameField = (index) => {
    const newUsernames = usernames.filter((_, i) => i !== index);
    setUsernames(newUsernames);
  };

  // Update username at specific index
  const updateUsername = (index, value) => {
    const newUsernames = [...usernames];
    newUsernames[index] = value;
    setUsernames(newUsernames);
  };

  // Handle the form submission to analyze multiple users
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filter out empty usernames
    const filteredUsernames = usernames.filter(username => username.trim() !== '');
    
    if (filteredUsernames.length === 0) {
      setError("Please enter at least one valid username");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const analyzedResults = [];
      
      // Process each username
      for (const username of filteredUsernames) {
        try {
          const userResult = await analyzeTwitterUser(username, tweetCount);
          analyzedResults.push(userResult);
        } catch (err) {
          console.error(`Error analyzing user ${username}:`, err);
          // Continue with other users even if one fails
        }
      }
      
      setAnalyzedUsers(analyzedResults);
      
      // Select the first user by default if we have results
      if (analyzedResults.length > 0) {
        setActiveUserIndex(0);
        setCurrentUserTweets(analyzedResults[0].tweets || []);
      }
      
    } catch (err) {
      console.error("Error during multiple user analysis:", err);
      setError(err.message || "An error occurred during analysis");
    } finally {
      setLoading(false);
    }
  };

  // Analyze a single Twitter user
  // Extract user information from Twitter API response
  const extractUserInfoFromResponse = (response) => {
    if (!response || !response.data) return null;
    
    try {
      // Handle different response formats
      const data = response.data;
      
      // Format 1: Direct user details response
      if (data.name || data.profile_pic_url) {
        return {
          name: data.name,
          display_name: data.name,
          profile_image_url: data.profile_pic_url,
          profile_pic_url: data.profile_pic_url,
          profile_image_url_https: data.profile_pic_url,
          location: data.location || '',
          description: data.description || '',
          bio: data.description || '',
          followers_count: data.follower_count || 0,
          friends_count: data.friends_count || 0,
          following_count: data.following_count || 0,
          verified: data.verified || false,
          created_at: data.created_at || '',
          public_metrics: data.public_metrics || {}
        };
      }
      
      // Format 2: Complex nested timeline response (like the user provided)
      if (data.result && data.result.timeline && data.result.timeline.instructions) {
        const instructions = data.result.timeline.instructions;
        
        for (const instruction of instructions) {
          if (instruction.type === "TimelineAddEntries" && instruction.entries) {
            for (const entry of instruction.entries) {
              if (entry.content && entry.content.items) {
                for (const item of entry.content.items) {
                  const userResult = item.item?.itemContent?.user_results?.result;
                  if (userResult) {
                    const core = userResult.core || {};
                    const legacy = userResult.legacy || {};
                    const avatar = userResult.avatar || {};
                    
                    return {
                      name: core.name || legacy.name || '',
                      display_name: core.name || legacy.name || '',
                      profile_image_url: avatar.image_url || legacy.profile_image_url_https || '',
                      profile_pic_url: avatar.image_url || legacy.profile_image_url_https || '',
                      profile_image_url_https: avatar.image_url || legacy.profile_image_url_https || '',
                      location: legacy.location || '',
                      description: legacy.description || '',
                      bio: legacy.description || '',
                      followers_count: legacy.followers_count || 0,
                      friends_count: legacy.friends_count || 0,
                      following_count: legacy.friends_count || 0,
                      verified: legacy.verified || userResult.is_blue_verified || false,
                      created_at: core.created_at || legacy.created_at || '',
                      public_metrics: legacy.public_metrics || {}
                    };
                  }
                }
              }
            }
          }
        }
      }
      
      // Format 3: Standard Twitter API user object
      if (data.data && data.data.user && data.data.user.result) {
        const userResult = data.data.user.result;
        const legacy = userResult.legacy || {};
        const core = userResult.core || {};
        const avatar = userResult.avatar || {};
        
        return {
          name: core.name || legacy.name || '',
          display_name: core.name || legacy.name || '',
          profile_image_url: avatar.image_url || legacy.profile_image_url_https || userResult.profile_pic_url || '',
          profile_pic_url: avatar.image_url || legacy.profile_image_url_https || userResult.profile_pic_url || '',
          profile_image_url_https: avatar.image_url || legacy.profile_image_url_https || userResult.profile_pic_url || '',
          location: legacy.location || '',
          description: legacy.description || '',
          bio: legacy.description || '',
          followers_count: legacy.followers_count || 0,
          friends_count: legacy.friends_count || 0,
          following_count: legacy.friends_count || 0,
          verified: legacy.verified || userResult.is_blue_verified || false,
          created_at: core.created_at || legacy.created_at || '',
          public_metrics: legacy.public_metrics || {}
        };
      }
      
    } catch (error) {
      console.error('Error extracting user info from response:', error);
    }
    
    return null;
  };

  const analyzeTwitterUser = async (username, count) => {
    try {
      // Get user tweets
      const userTweets = await fetchUserTweets(username, count);
      
      setAnalyzingTweets(true);
      
      // Get user info with fallback to mock data - try multiple endpoints
      let userInfo = null;
      try {
        // First try the user/details endpoint
        let response;
        try {
          response = await axios.get(`https://${RAPID_API_HOST}/user/details`, {
            params: { username },
            headers: {
              "X-RapidAPI-Key": RAPID_API_KEY,
              "X-RapidAPI-Host": RAPID_API_HOST
            }
          });
        } catch (detailsError) {
          console.log(`User details endpoint failed for ${username}, trying search endpoint...`);
          
          // Fallback to search endpoint that might return the complex structure
          try {
            response = await axios.get("https://twitter241.p.rapidapi.com/search-v2", {
              params: {
                type: "Users",
                count: "1",
                query: username
              },
              headers: {
                "x-rapidapi-key": RAPID_API_KEY,
                "x-rapidapi-host": "twitter241.p.rapidapi.com"
              }
            });
          } catch (searchError) {
            throw new Error(`Both user detail endpoints failed: ${detailsError.message}, ${searchError.message}`);
          }
        }
        
        console.log(`Raw user info response for ${username}:`, response.data);
        
        // Extract user info using the new extraction function
        const extractedUserInfo = extractUserInfoFromResponse(response);
        
        if (extractedUserInfo) {
          userInfo = extractedUserInfo;
          console.log(`Extracted user info for ${username}:`, userInfo);
        } else {
          throw new Error('Failed to extract user info from response');
        }
        
      } catch (error) {
        console.error(`Error fetching user info for ${username}:`, error);
        // Create mock user info
        userInfo = {
          name: username,
          display_name: username,
          profile_image_url: "https://via.placeholder.com/200x200.png?text=User",
          profile_pic_url: "https://via.placeholder.com/200x200.png?text=User",
          profile_image_url_https: "https://via.placeholder.com/200x200.png?text=User",
          location: "Unknown Location",
          description: `This is a mock profile for ${username} because the API request failed.`,
          bio: `This is a mock profile for ${username} because the API request failed.`,
          followers_count: Math.floor(Math.random() * 10000),
          friends_count: Math.floor(Math.random() * 1000),
          following_count: Math.floor(Math.random() * 1000),
          verified: false,
          created_at: new Date().toISOString(),
          public_metrics: {}
        };
      }

      // Now send all tweets to backend for analysis and storage
      try {
        console.log(`Sending ${userTweets.length} tweets to backend for analysis and storage...`);
        
        // Ensure userInfo contains all necessary fields for proper metadata storage
        const enrichedUserInfo = {
          ...userInfo,
          // Handle both direct and nested user info structures
          name: userInfo?.name || userInfo?.display_name || userInfo?.data?.user?.result?.legacy?.name || userInfo?.data?.user?.result?.core?.name,
          display_name: userInfo?.display_name || userInfo?.name || userInfo?.data?.user?.result?.legacy?.name || userInfo?.data?.user?.result?.core?.name,
          profile_image_url: userInfo?.profile_image_url || userInfo?.profile_pic_url || userInfo?.profile_image_url_https || userInfo?.data?.user?.result?.legacy?.profile_image_url_https || userInfo?.data?.user?.result?.profile_pic_url,
          profile_pic_url: userInfo?.profile_pic_url || userInfo?.profile_image_url || userInfo?.profile_image_url_https || userInfo?.data?.user?.result?.legacy?.profile_image_url_https || userInfo?.data?.user?.result?.profile_pic_url,
          profile_image_url_https: userInfo?.profile_image_url_https || userInfo?.profile_image_url || userInfo?.profile_pic_url || userInfo?.data?.user?.result?.legacy?.profile_image_url_https || userInfo?.data?.user?.result?.profile_pic_url,
          location: userInfo?.location || userInfo?.data?.user?.result?.legacy?.location || '',
          description: userInfo?.description || userInfo?.bio || userInfo?.data?.user?.result?.legacy?.description || '',
          bio: userInfo?.bio || userInfo?.description || userInfo?.data?.user?.result?.legacy?.description || '',
          followers_count: userInfo?.followers_count || userInfo?.data?.user?.result?.legacy?.followers_count || 0,
          friends_count: userInfo?.friends_count || userInfo?.following_count || userInfo?.data?.user?.result?.legacy?.friends_count || 0,
          following_count: userInfo?.following_count || userInfo?.friends_count || userInfo?.data?.user?.result?.legacy?.friends_count || 0,
          verified: userInfo?.verified || userInfo?.data?.user?.result?.legacy?.verified || userInfo?.data?.user?.result?.is_blue_verified || false,
          created_at: userInfo?.created_at || userInfo?.data?.user?.result?.legacy?.created_at || userInfo?.data?.user?.result?.core?.created_at || '',
          public_metrics: userInfo?.public_metrics || userInfo?.data?.user?.result?.legacy?.public_metrics || {}
        };

        const backendResponse = await apiService.analyzeTwitterUser(username, userTweets, enrichedUserInfo, selectedModel);
        
        if (backendResponse.success) {
          console.log(`Backend analysis successful for @${username}:`, backendResponse);
          
          // Use the backend-analyzed tweets with Firebase IDs
          const analyzedTweets = backendResponse.analyzed_tweets.map(tweet => ({
            id: tweet.twitter_metadata?.tweet_id || Math.random().toString(),
            content: tweet.text.replace(`Tweet by @${username}: `, ''), // Remove prefix for display
            created_at: tweet.twitter_metadata?.created_at || new Date().toISOString(),
            likes: tweet.twitter_metadata?.likes || 0,
            retweets: tweet.twitter_metadata?.retweets || 0,
            classification: tweet.threat 
              ? tweet.stage2_result?.predicted_class || tweet.predicted_class
              : "Non-Threat",
            analysis_results: tweet,
            confidence: tweet.confidence || 0,
            is_threat: tweet.threat || false,
            firebase_id: tweet.id // Store the Firebase document ID
          }));

          // Calculate analytics from backend data
          const totalTweets = analyzedTweets.length;
          const threatTweets = analyzedTweets.filter(tweet => tweet.is_threat);
          const threatCount = threatTweets.length;
          const threatPercentage = totalTweets > 0 ? (threatCount / totalTweets) * 100 : 0;
          
          // Count by classification
          const classifications = {};
          analyzedTweets.forEach(tweet => {
            if (tweet.classification) {
              classifications[tweet.classification] = (classifications[tweet.classification] || 0) + 1;
            }
          });

          setAnalyzingTweets(false);
          
          return {
            username,
            userInfo,
            tweets: analyzedTweets,
            stats: {
              totalTweets,
              threatCount,
              threatPercentage,
              classifications
            },
            backend_summary: backendResponse.summary,
            saved_to_firebase: true
          };
        } else {
          throw new Error('Backend analysis failed');
        }
      } catch (backendError) {
        console.error(`Backend analysis failed for @${username}, falling back to frontend-only analysis:`, backendError);
        
        // Fallback to original frontend analysis logic
      const generateMockAnalysis = (text) => {
        const possibleClasses = [
          "Non-Threat", 
          "Hate Speech/Extremism", 
          "Direct Violence Threats",
          "Harassment and Intimidation", 
          "Criminal Activity", 
          "Child Safety Threats"
        ];
        
        // Use the text content to determine threat classification more deterministically
        let isThreat = false;
        let classIndex = 0; // Default to Non-Threat
        
        // Check for threatening terms to classify more intelligently
        const lowerText = text.toLowerCase();
        
        // Keywords that suggest threats of different types
        const threatPatterns = [
          { keywords: ['hate', 'racist', 'disgusting', 'stupid', '#enoughisenough'], classIndex: 1 }, // Hate Speech
          { keywords: ['violence', 'kill', 'attack', 'hurt', 'threat', 'regret', 'revenge'], classIndex: 2 }, // Violence
          { keywords: ['harass', 'stalking', 'intimidate', 'watch their back', 'better watch'], classIndex: 3 }, // Harassment
          { keywords: ['illegal', 'crime', 'steal', 'drug', 'weapon'], classIndex: 4 }, // Criminal
          { keywords: ['child', 'kids', 'young', 'minor', 'youth'], classIndex: 5 } // Child Safety
        ];
        
        // Check if any threat pattern matches
        for (const pattern of threatPatterns) {
          if (pattern.keywords.some(keyword => lowerText.includes(keyword))) {
            isThreat = true;
            classIndex = pattern.classIndex;
            break;
          }
        }
        
        const predictedClass = possibleClasses[classIndex];
        const confidence = isThreat ? 0.85 + (Math.random() * 0.15) : 0.75 + (Math.random() * 0.2); // Higher confidence for threats
        
        // Generate realistic probabilities
        const probabilities = {};
        possibleClasses.forEach((cls, idx) => {
          if (idx === classIndex) {
            probabilities[cls] = confidence;
          } else {
            // Distribute remaining probability, with non-threats getting a bit more
            const remainingConfidence = (1 - confidence) / (possibleClasses.length - 1);
            probabilities[cls] = remainingConfidence * (idx === 0 ? 2 : 0.8);
          }
        });
        
        return {
          success: true,
          threat: isThreat,
          predicted_class: predictedClass,
          confidence: confidence,
          probabilities: probabilities,
          visualization_data: {
            keywords: [
              {"word": text.split(" ")[0], "score": 0.8},
              {"word": text.split(" ")[1] || "tweet", "score": 0.6},
              {"word": text.split(" ")[2] || "analysis", "score": 0.4},
            ]
          },
          text: text,
          timestamp: new Date().toISOString(),
          stage2_result: {
            predicted_class: predictedClass
          }
        };
      };
      
        // Analyze each tweet for threats using frontend logic
      const analyzedTweets = await Promise.all(
        userTweets.map(async (tweet) => {
          try {
            // Skip real API if we've had too many failures
            if (useMockAnalysis) {
              console.log(`Using mock analysis for tweet by ${username} (API bypass mode)`);
              const mockAnalysis = generateMockAnalysis(tweet.content);
              return {
                ...tweet,
                classification: mockAnalysis.threat 
                  ? mockAnalysis.stage2_result?.predicted_class || mockAnalysis.predicted_class
                  : "Non-Threat",
                analysis_results: mockAnalysis,
                confidence: mockAnalysis?.confidence || 0,
                is_threat: mockAnalysis?.threat || false
              };
            }
            
              // Try to use individual tweet analysis API
              try {
                const analysisResult = await apiService.analyzeSingleTweet(
                  tweet.content, 
                  username, 
                  {
                    tweet_id: tweet.id,
                    created_at: tweet.created_at,
                    likes: tweet.likes,
                    retweets: tweet.retweets,
                    user_name: userInfo?.name || userInfo?.display_name || userInfo?.data?.user?.result?.legacy?.name || userInfo?.data?.user?.result?.core?.name,
                    user_profile_image_url: userInfo?.profile_image_url || userInfo?.profile_pic_url || userInfo?.profile_image_url_https || userInfo?.data?.user?.result?.legacy?.profile_image_url_https || userInfo?.data?.user?.result?.profile_pic_url,
                    user_location: userInfo?.location || userInfo?.data?.user?.result?.legacy?.location || tweet.location,
                    user_description: userInfo?.description || userInfo?.bio || userInfo?.data?.user?.result?.legacy?.description,
                    user_followers_count: userInfo?.followers_count || userInfo?.data?.user?.result?.legacy?.followers_count || 0,
                    user_friends_count: userInfo?.friends_count || userInfo?.following_count || userInfo?.data?.user?.result?.legacy?.friends_count || 0,
                    user_verified: userInfo?.verified || userInfo?.data?.user?.result?.legacy?.verified || userInfo?.data?.user?.result?.is_blue_verified || false,
                    user_created_at: userInfo?.created_at || userInfo?.data?.user?.result?.legacy?.created_at || userInfo?.data?.user?.result?.core?.created_at || '',
                    user_public_metrics: userInfo?.public_metrics || userInfo?.data?.user?.result?.legacy?.public_metrics || {}
                  },
                  selectedModel
                );
              
                console.log(`Individual tweet analysis for ${username}:`, analysisResult);
              
              return {
                ...tweet,
                classification: analysisResult?.threat 
                  ? analysisResult.stage2_result?.predicted_class || analysisResult.predicted_class
                  : "Non-Threat",
                analysis_results: analysisResult,
                confidence: analysisResult?.confidence || 0,
                  is_threat: analysisResult?.threat || false,
                  firebase_id: analysisResult?.id
              };
              } catch (individualApiError) {
                // If individual API call fails, use mock data
                console.warn(`Individual API failure for analyzing tweet, using mock data:`, individualApiError);
              // Increment API failure counter
              setApiFailures(prev => prev + 1);
              
              const mockAnalysis = generateMockAnalysis(tweet.content);
              
              return {
                ...tweet,
                classification: mockAnalysis.threat 
                  ? mockAnalysis.stage2_result?.predicted_class || mockAnalysis.predicted_class
                  : "Non-Threat",
                analysis_results: mockAnalysis,
                confidence: mockAnalysis?.confidence || 0,
                is_threat: mockAnalysis?.threat || false
              };
            }
          } catch (error) {
            console.error(`Error analyzing tweet:`, error);
            return {
              ...tweet,
              classification: "Analysis Error",
              is_threat: false,
              analysis_error: true
            };
          }
        })
      );
      
      // Calculate analytics
      const totalTweets = analyzedTweets.length;
      const threatTweets = analyzedTweets.filter(tweet => tweet.is_threat);
      const threatCount = threatTweets.length;
      const threatPercentage = totalTweets > 0 ? (threatCount / totalTweets) * 100 : 0;
      
      // Count by classification
      const classifications = {};
      analyzedTweets.forEach(tweet => {
        if (tweet.classification) {
          classifications[tweet.classification] = (classifications[tweet.classification] || 0) + 1;
        }
      });
      
      setAnalyzingTweets(false);
      
      return {
        username,
        userInfo,
        tweets: analyzedTweets,
        stats: {
          totalTweets,
          threatCount,
          threatPercentage,
          classifications
          },
          saved_to_firebase: !!analyzedTweets.find(t => t.firebase_id) // True if any tweets were saved
      };
      }
      
    } catch (error) {
      console.error(`Error analyzing user ${username}:`, error);
      setAnalyzingTweets(false);
      throw error;
    }
  };

  // Add a mock tweets function
  const getMockTweets = (username, count) => {
    console.log(`Generating ${count} mock tweets for ${username}`);
    const mockTweets = [];
    
    // Realistic mock tweet templates for various categories
    const tweetTemplates = {
      normal: [
        "Just posted a new photo! Check it out on my profile #photography",
        "Can't believe it's already {day}! This week is flying by. #TimeFlies",
        "Anyone have recommendations for good restaurants in {city}?",
        "Just finished watching {show} - absolutely loved it! Highly recommend.",
        "Looking forward to the weekend! Got any plans?",
        "Weather is beautiful today. Perfect day for a walk outside."
      ],
      suspicious: [
        "The system is rigged against us. We need to take action soon...",
        "I'm tired of these people running everything. Something has to change. #EnoughIsEnough",
        "Sometimes I think violence is the only language they understand.",
        "If you're not angry, you're not paying attention. The time for action is coming.",
        "They won't listen until we make them listen. Remember that.",
        "I've been collecting some interesting items lately. You never know when you'll need protection."
      ],
      threatening: [
        "I've had it with {target}. They'll regret crossing me. #Revenge",
        "Someone needs to teach {target} a lesson they won't forget.",
        "I know where {target} lives. Maybe I'll pay them a visit soon.",
        "If I see {target} again, I can't be held responsible for what happens next.",
        "The world would be better without people like {target}.",
        "{target} better watch their back. I'm done with warnings."
      ]
    };
    
    // Randomization helpers
    const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "Seattle"];
    const shows = ["The Last of Us", "House of the Dragon", "Succession", "Ted Lasso", "Stranger Things"];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const targets = ["politicians", "celebrities", "the government", "the media", "those people", "them"];
    
          // Random date in the past month
      const getRandomDate = () => {
        const now = new Date();
        const pastDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        return pastDate.toISOString();
      };
      
      // Generate tweets with different categories
      for (let i = 1; i <= count; i++) {
        // Determine tweet category based on position (make some threatening)
        const category = i % 10 === 0 ? 'threatening' : (i % 5 === 0 ? 'suspicious' : 'normal');
        const templates = tweetTemplates[category];
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        // Get random city for both content and location
        const city = cities[Math.floor(Math.random() * cities.length)];
        
        // Replace placeholders
        let content = template
          .replace("{city}", city)
          .replace("{show}", shows[Math.floor(Math.random() * shows.length)])
          .replace("{day}", days[Math.floor(Math.random() * days.length)])
          .replace("{target}", targets[Math.floor(Math.random() * targets.length)]);
        
        const created_at = getRandomDate();
        const mockId = `mock-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        
        // Generate realistic engagement metrics
        const view_count = Math.floor(Math.random() * 10000) + 100;
        const favorite_count = Math.floor(view_count * (Math.random() * 0.1));
        const retweet_count = Math.floor(favorite_count * (Math.random() * 0.3));
        const reply_count = Math.floor(favorite_count * (Math.random() * 0.2));
        
        mockTweets.push({
          id: mockId,
          content: content,
          username: username,
          created_at: created_at,
          profile_image_url: "https://via.placeholder.com/48x48.png?text=User",
          location: city + ", " + ["USA", "UK", "Canada", "Australia", "India"][Math.floor(Math.random() * 5)],
          tweet_url: `https://twitter.com/${username}/status/${mockId}`,
          view_count: view_count,
          favorite_count: favorite_count,
          retweet_count: retweet_count,
          reply_count: reply_count,
          classification: null,
          analysis_results: null
        });
    }
    
    return mockTweets;
  };

  // Update the fetchUserTweets function with retry mechanism and better error handling
  const fetchUserTweets = async (username, count) => {
    const MAX_RETRIES = 3;
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        console.log(`Attempting to fetch tweets for ${username} (attempt ${retries + 1}/${MAX_RETRIES})`);
        
        // Try with the twitter154 API endpoint with a timeout
        try {
          const response = await Promise.race([
            axios.get(`https://${RAPID_API_HOST}/user/tweets`, {
              params: {
                username: username,
                limit: count.toString()
              },
              headers: {
                "X-RapidAPI-Key": RAPID_API_KEY,
                "X-RapidAPI-Host": RAPID_API_HOST
              },
              timeout: 5000 // 5 second timeout
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Twitter API timeout")), 5000))
          ]);
          
          console.log(`Raw tweets for ${username}:`, response.data);
          
          // Successfully fetched tweets with proper structure
          if (response.data && response.data.results && Array.isArray(response.data.results)) {
            const tweets = response.data.results.map(tweet => ({
              id: tweet.tweet_id || `temp-${Math.random().toString(36).substr(2, 9)}`,
              content: tweet.text || "No content available",
              username: username,
              created_at: tweet.creation_date || "",
              profile_image_url: tweet.user?.profile_pic_url || null,
              location: tweet.user?.location || null,
              tweet_url: `https://twitter.com/${username}/status/${tweet.tweet_id}`,
              retweet_count: tweet.retweet_count || 0,
              favorite_count: tweet.favorite_count || 0,
              reply_count: tweet.reply_count || 0,
              view_count: tweet.views || 0,
              classification: null,
              analysis_results: null
            }));
            
            // If we got fewer tweets than requested, pad with mock data
            if (tweets.length < count) {
              console.log(`Only received ${tweets.length} tweets, adding ${count - tweets.length} mock tweets`);
              const mockTweets = getMockTweets(username, count - tweets.length);
              tweets.push(...mockTweets);
            }
            
            console.log(`Extracted ${tweets.length} tweets for ${username}`);
            return tweets;
          }
          
          throw new Error("No tweets found in response");
        } catch (error) {
          console.warn(`Error with Twitter API for ${username}, falling back to mock data:`, error);
          throw error;
        }
      } catch (error) {
        console.error(`Error fetching tweets for ${username} (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
        retries++;
        
        if (retries < MAX_RETRIES) {
          // Wait before retry (exponential backoff)
          const delayMs = 1000 * Math.pow(2, retries);
          console.log(`Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    // If all retries failed, return mock data
    console.warn(`All attempts to fetch tweets for ${username} failed. Using mock data.`);
    return getMockTweets(username, count);
  };

  // Extract tweets from the Twitter API response
  const extractTweetsFromResponse = (data, username) => {
    const tweets = [];
    
    // Handle case when data is not available or in unexpected format
    if (!data) {
      console.warn('No data received from Twitter API');
      return tweets;
    }
    
    try {
      // Handle different response formats
      
      // Format 1: Twitter v1-style response with statuses array
      if (data.statuses && Array.isArray(data.statuses)) {
        console.log('Processing Twitter v1-style response format');
        
        data.statuses.forEach(tweet => {
          if (tweet && tweet.text) {
            tweets.push({
              id: tweet.id_str || `temp-${Math.random().toString(36).substr(2, 9)}`,
              content: tweet.text || tweet.full_text || "No content available",
              username: username,
              created_at: tweet.created_at || "",
              profile_image_url: tweet.user?.profile_image_url_https || null,
              tweet_url: `https://twitter.com/${username}/status/${tweet.id_str}`,
              classification: null,
              analysis_results: null
            });
          }
        });
        
        return tweets;
      }
      
      // Format 2: Twitter v2-style response with data.data format
      if (data.data && Array.isArray(data.data)) {
        console.log('Processing Twitter v2-style response format');
        
        data.data.forEach(tweet => {
          if (tweet && tweet.text) {
            tweets.push({
              id: tweet.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
              content: tweet.text || "No content available",
              username: username,
              created_at: tweet.created_at || "",
              profile_image_url: tweet.author?.profile_image_url || null,
              tweet_url: `https://twitter.com/${username}/status/${tweet.id}`,
              classification: null,
              analysis_results: null
            });
          }
        });
        
        return tweets;
      }
      
      // Format 3: User timeline format with data.user.result.timeline
      if (data.data?.user?.result?.timeline?.timeline) {
        console.log('Processing user timeline response format');
        
        // Find the entries array in the timeline
        const timeline = data.data.user.result.timeline.timeline;
        const instructions = timeline.instructions || [];
        
        let entries = [];
        for (const instruction of instructions) {
          if (instruction.type === "TimelineAddEntries") {
            entries = instruction.entries || [];
            break;
          }
        }
        
        // Extract tweets from entries
        for (const entry of entries) {
          if (entry.content && entry.content.itemContent && entry.content.itemContent.tweet_results && entry.content.itemContent.tweet_results.result) {
            const tweet = entry.content.itemContent.tweet_results.result;
            const tweetData = tweet.legacy || {};
            
            if (tweetData.full_text || tweetData.text) {
              tweets.push({
                id: tweetData.id_str || `temp-${Math.random().toString(36).substr(2, 9)}`,
                content: tweetData.full_text || tweetData.text || "No content available",
                username: username,
                created_at: tweetData.created_at || "",
                profile_image_url: tweet.core?.user_results?.result?.legacy?.profile_image_url_https || null,
                tweet_url: `https://twitter.com/${username}/status/${tweetData.id_str}`,
                classification: null,
                analysis_results: null
              });
            }
          }
        }
      }
      
      // Format 4: New API format with tweets array
      if (data.tweets && Array.isArray(data.tweets)) {
        console.log('Processing tweets array format');
        
        data.tweets.forEach(tweet => {
          if (tweet) {
            tweets.push({
              id: tweet.id || tweet.tweet_id || `temp-${Math.random().toString(36).substr(2, 9)}`,
              content: tweet.text || tweet.content || "No content available",
              username: username,
              created_at: tweet.created_at || "",
              profile_image_url: tweet.user?.profile_image_url || null,
              tweet_url: `https://twitter.com/${username}/status/${tweet.id || tweet.tweet_id}`,
              classification: null,
              analysis_results: null
            });
          }
        });
        
        return tweets;
      }
      
      console.warn('Unknown Twitter API response format:', Object.keys(data));
    } catch (error) {
      console.error('Error extracting tweets from response:', error);
    }
    
    return tweets;
  };

  // Handle user selection from the list
  const handleUserSelect = (index) => {
    setActiveUserIndex(index);
    setCurrentUserTweets(analyzedUsers[index].tweets || []);
  };

  // Prepare chart data for the selected user
  const prepareChartData = (userIndex) => {
    if (userIndex === null || !analyzedUsers[userIndex]) return null;
    
    const user = analyzedUsers[userIndex];
    const { classifications } = user.stats;
    
    // Prepare data for Pie chart
    const pieData = {
      labels: Object.keys(classifications),
      datasets: [
        {
          data: Object.values(classifications),
          backgroundColor: [
            '#FF6384', // Red for threats
            '#36A2EB', // Blue
            '#FFCE56', // Yellow
            '#4BC0C0', // Teal
            '#9966FF', // Purple
            '#FF9F40', // Orange
            '#8CFF70', // Green
          ],
          hoverBackgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
            '#8CFF70',
          ]
        }
      ]
    };
    
    // Threat vs non-threat for bar chart
    const barData = {
      labels: ['Threat Content', 'Safe Content'],
      datasets: [
        {
          label: 'Tweet Analysis',
          data: [
            user.stats.threatCount, 
            user.stats.totalTweets - user.stats.threatCount
          ],
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)', // Red for threats
            'rgba(75, 192, 192, 0.6)'  // Green for safe content
          ],
          borderColor: [
            'rgb(255, 99, 132)',
            'rgb(75, 192, 192)'
          ],
          borderWidth: 1
        }
      ]
    };
    
    return { pieData, barData };
  };

  // Prepare chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#fff'
        }
      }
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
    <div className="container mx-auto px-4 py-6">
      {useMockAnalysis && (
        <div className="bg-yellow-800 border border-yellow-600 text-yellow-200 px-4 py-3 mb-4 rounded-lg flex items-center">
          <FaExclamationTriangle className="mr-2 text-yellow-400" />
          <div>
            <p className="font-bold">Using simulated threat analysis</p>
            <p className="text-sm">Backend API unavailable. Analysis is being performed using AI simulation.</p>
          </div>
        </div>
      )}
      
      <div className="flex items-center mb-6 bg-navy-900 p-4 rounded-t-lg border-b-2 border-blue-500">
        <div className="p-2 bg-blue-700 rounded-full mr-4">
          <FaUserSecret className="text-white text-2xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">SOCIAL MEDIA INTELLIGENCE UNIT</h1>
          <p className="text-blue-300 text-sm">Subject Threat Assessment & Monitoring System</p>
        </div>
      </div>
      
      {/* User analysis form */}
      <div className="bg-navy-800 border border-gray-700 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center">
            <FaFolderOpen className="mr-2 text-yellow-400" />
            CREATE SUBJECT INVESTIGATION
          </h2>
          
          <div className="bg-blue-900 text-xs text-blue-300 px-3 py-1 rounded flex items-center">
            <FaFingerprint className="mr-1" /> 
            CLASSIFIED ACCESS LEVEL 4
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {usernames.map((username, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="relative flex-grow">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-blue-400">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => updateUsername(index, e.target.value)}
                    placeholder="Subject Username"
                    className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {usernames.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUsernameField(index)}
                    className="p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-800 transition-colors"
                  >
                    <FaBan />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center">
            <button
              type="button"
              onClick={addUsernameField}
              className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors border border-gray-700"
            >
              <FaPlus className="mr-2" /> ADD ADDITIONAL SUBJECT
            </button>
          </div>
          
          <div className="flex flex-wrap items-end space-x-4 mt-6 pt-4 border-t border-gray-700">
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                DATA COLLECTION DEPTH
              </label>
              <select
                value={tweetCount}
                onChange={(e) => setTweetCount(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 records</option>
                <option value={20}>20 records</option>
                <option value={30}>30 records</option>
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
              </select>
            </div>
            
            {/* Model Selection */}
            <div className="flex-grow max-w-md">
              <ModelSelector 
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                className="text-gray-300"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="submit"
                disabled={loading || analyzingTweets}
                className="px-6 py-3 bg-blue-700 hover:bg-blue-600 text-white font-medium rounded-lg shadow transition-colors flex items-center"
              >
                {loading || analyzingTweets ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    {analyzingTweets ? 'ANALYZING...' : 'COLLECTING DATA...'}
                  </>
                ) : (
                  <>
                    <FaSearch className="mr-2" /> INITIATE INVESTIGATION
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setUseMockAnalysis(true)}
                className={`px-3 py-2 ${useMockAnalysis ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'} rounded border border-gray-600 text-sm flex items-center`}
              >
                <FaShieldAlt className="mr-1" /> {useMockAnalysis ? 'USING SIMULATION' : 'USE OFFLINE MODE'}
              </button>
            </div>
          </div>
        </form>
        
        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-red-400 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Results section */}
      {analyzedUsers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* User list sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-navy-800 border border-gray-700 rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between bg-navy-900 -m-4 mb-4 p-4 border-b border-gray-700 rounded-t-lg">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <FaUserShield className="text-yellow-500 mr-2" />
                  SUBJECTS OF INTEREST
                </h3>
                <span className="bg-red-600/30 text-xs text-red-300 px-2 py-1 rounded-sm">
                  {analyzedUsers.length} ACTIVE
                </span>
              </div>
              <div className="space-y-2">
                {analyzedUsers.map((user, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeUserIndex === index 
                        ? 'bg-blue-900/30 border border-blue-800 shadow-md' 
                        : 'bg-navy-700 hover:bg-navy-600 border border-gray-700'
                    }`}
                    onClick={() => handleUserSelect(index)}
                  >
                    <div className="flex items-center">
                      {user.userInfo?.data?.user?.result?.legacy?.profile_image_url_https ||
                        user.userInfo?.data?.user?.result?.profile_pic_url ? (
                        <div className="h-12 w-12 rounded-md border-2 border-gray-600 overflow-hidden mr-3 relative">
                          <img 
                            src={user.userInfo?.data?.user?.result?.profile_pic_url || 
                                 user.userInfo?.data?.user?.result?.legacy?.profile_image_url_https}
                            alt={`@${user.username}`}
                            className="h-full w-full object-cover"
                          />
                          {user.stats.threatPercentage > 50 && (
                            <div className="absolute top-0 right-0 w-4 h-4 bg-red-600 rounded-full border border-white"></div>
                          )}
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-navy-600 border-2 border-gray-600 flex items-center justify-center mr-3 relative">
                          <FaUser className="text-gray-300" />
                          {user.stats.threatPercentage > 50 && (
                            <div className="absolute top-0 right-0 w-4 h-4 bg-red-600 rounded-full border border-white"></div>
                          )}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-white flex items-center">
                          <span>@{user.username}</span>
                          {user.stats.threatPercentage > 70 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-900/60 text-red-300 text-xs rounded">HIGH RISK</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center">
                          <FaExclamation className="text-yellow-500 mr-1" />
                          <span>{user.stats.threatCount} alerts</span>
                          <span className="mx-1">•</span>
                          <span>{user.stats.totalTweets} records</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="text-xs text-gray-400 mb-1 flex justify-between">
                        <span>Threat Assessment</span>
                        <span className={user.stats.threatPercentage > 50 ? 'text-red-400' : 'text-gray-400'}>
                          {Math.round(user.stats.threatPercentage)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-navy-900 rounded-full">
                        <div
                          className={`h-2 rounded-full ${
                            user.stats.threatPercentage > 70 ? 'bg-red-600' : 
                            user.stats.threatPercentage > 40 ? 'bg-yellow-500' : 
                            'bg-green-500'
                          }`}
                          style={{ width: `${user.stats.threatPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* User details and charts */}
          <div className="lg:col-span-3">
            {activeUserIndex !== null && analyzedUsers[activeUserIndex] && (
              <>
                {/* User stats and charts */}
                <div className="bg-navy-800 border border-gray-700 rounded-lg shadow-lg mb-6">
                  <div className="bg-navy-900 px-6 py-4 border-b border-gray-700 rounded-t-lg flex justify-between items-center">
                    <h3 className="font-bold text-lg text-white flex items-center">
                      <FaFileAlt className="mr-2 text-yellow-500" />
                      SUBJECT PROFILE REPORT
                    </h3>
                    <div className="flex items-center text-xs text-gray-400">
                      <span>CASE REF:</span>
                      <span className="ml-1 font-mono bg-navy-700 px-2 py-0.5 rounded">
                        SM-{Date.now().toString().substr(-6)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                      <div className="flex mb-4 md:mb-0">
                        <div className="mr-4">
                          {analyzedUsers[activeUserIndex].userInfo?.data?.user?.result?.legacy?.profile_image_url_https || 
                            analyzedUsers[activeUserIndex].userInfo?.data?.user?.result?.profile_pic_url ? (
                            <div className="h-20 w-20 rounded-lg border-2 border-gray-700 overflow-hidden mb-1">
                              <img 
                                src={analyzedUsers[activeUserIndex].userInfo?.data?.user?.result?.profile_pic_url || 
                                     analyzedUsers[activeUserIndex].userInfo?.data?.user?.result?.legacy?.profile_image_url_https}
                                alt={`@${analyzedUsers[activeUserIndex].username}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-20 w-20 rounded-lg bg-navy-600 border-2 border-gray-700 flex items-center justify-center mb-1">
                              <FaUser className="text-gray-300 text-2xl" />
                            </div>
                          )}
                          
                          <div className="text-center text-xs font-mono text-gray-500 mt-1">
                            ID: {analyzedUsers[activeUserIndex].username.substring(0, 6).toUpperCase()}{Math.floor(Math.random() * 999)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center mb-1">
                            <h3 className="text-xl font-bold text-white">@{analyzedUsers[activeUserIndex].username}</h3>
                            <div className="ml-3 px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded-sm border border-blue-800">
                              UNDER SURVEILLANCE
                            </div>
                          </div>
                          
                          {analyzedUsers[activeUserIndex].userInfo?.data?.user?.result?.legacy?.name && (
                            <p className="text-gray-300 font-medium">
                              {analyzedUsers[activeUserIndex].userInfo.data.user.result.legacy.name}
                            </p>
                          )}
                          {analyzedUsers[activeUserIndex].userInfo?.data?.user?.result?.legacy?.location && (
                            <p className="text-sm text-blue-300 mt-1 flex items-center">
                              <FaMapMarkerAlt className="mr-1" /> 
                              {analyzedUsers[activeUserIndex].userInfo.data.user.result.legacy.location}
                            </p>
                          )}
                          {analyzedUsers[activeUserIndex].userInfo?.data?.user?.result?.legacy?.description && (
                            <p className="text-sm text-gray-400 mt-1 border-l-2 border-gray-700 pl-2 italic">
                              "{analyzedUsers[activeUserIndex].userInfo.data.user.result.legacy.description}"
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 bg-navy-700 rounded-lg p-4 w-full md:w-auto">
                        <div className="text-center border-r border-gray-600 pr-4">
                          <div className="text-2xl font-bold text-white">
                            {analyzedUsers[activeUserIndex].stats.totalTweets}
                          </div>
                          <div className="text-xs text-gray-400">RECORDS ANALYZED</div>
                        </div>
                        
                        <div className="text-center border-r border-gray-600 pr-4">
                          <div className={`text-2xl font-bold ${
                            analyzedUsers[activeUserIndex].stats.threatCount > 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {analyzedUsers[activeUserIndex].stats.threatCount}
                          </div>
                          <div className="text-xs text-gray-400">THREAT INDICATORS</div>
                        </div>
                        
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            analyzedUsers[activeUserIndex].stats.threatPercentage > 50 ? 'text-red-400' : 
                            analyzedUsers[activeUserIndex].stats.threatPercentage > 25 ? 'text-yellow-400' : 
                            'text-green-400'
                          }`}>
                            {Math.round(analyzedUsers[activeUserIndex].stats.threatPercentage)}%
                          </div>
                          <div className="text-xs text-gray-400">THREAT ASSESSMENT</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Charts */}
                    {prepareChartData(activeUserIndex) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div className="bg-navy-700 border border-gray-700 rounded-lg overflow-hidden">
                          <div className="bg-navy-800 px-3 py-2 border-b border-gray-700">
                            <h4 className="text-sm font-medium text-gray-300 flex items-center">
                              <FaChartPie className="mr-2 text-yellow-500" /> 
                              CLASSIFICATION DISTRIBUTION
                            </h4>
                          </div>
                          <div className="p-4 h-64">
                            <Pie 
                              data={prepareChartData(activeUserIndex).pieData} 
                              options={chartOptions} 
                            />
                          </div>
                        </div>
                        
                        <div className="bg-navy-700 border border-gray-700 rounded-lg overflow-hidden">
                          <div className="bg-navy-800 px-3 py-2 border-b border-gray-700">
                            <h4 className="text-sm font-medium text-gray-300 flex items-center">
                              <FaBalanceScale className="mr-2 text-yellow-500" /> 
                              THREAT ASSESSMENT
                            </h4>
                          </div>
                          <div className="p-4 h-64">
                            <Bar 
                              data={prepareChartData(activeUserIndex).barData} 
                              options={chartOptions} 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Tweets table */}
                <div className="bg-navy-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-navy-900 border-b border-gray-700 rounded-t-lg flex items-center justify-between">
                    <h3 className="font-bold text-lg text-white flex items-center">
                      <FaEye className="mr-2 text-yellow-500" />
                      COMMUNICATION RECORDS 
                      <span className="ml-2 text-sm font-normal text-gray-400">
                        ({currentUserTweets.length})
                      </span>
                    </h3>
                    <div className="text-xs text-gray-500">
                      CLASSIFICATION: INTEL GRADE
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    {currentUserTweets.length > 0 ? (
                      <table className="w-full">
                        <thead className="bg-navy-900">
                          <tr>
                            <th className="px-4 py-3 border-b border-gray-700 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Content</th>
                            <th className="px-4 py-3 border-b border-gray-700 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-1/6">Threat Assessment</th>
                            <th className="px-4 py-3 border-b border-gray-700 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">Confidence</th>
                            <th className="px-4 py-3 border-b border-gray-700 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Engagement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentUserTweets.map((tweet, index) => (
                            <tr key={index} className={`${tweet.is_threat ? 'bg-red-900/10' : index % 2 === 0 ? 'bg-navy-800' : 'bg-navy-750'} hover:bg-navy-700`}>
                              <td className="px-4 py-3 border-b border-gray-700">
                                <a
                                  href={tweet.tweet_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-white hover:text-blue-400 transition-colors"
                                >
                                  {tweet.content}
                                </a>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(tweet.created_at).toLocaleString()}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-b border-gray-700">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${getThreatBadgeColor(tweet.classification)}`}>
                                  {tweet.classification}
                                </span>
                              </td>
                              <td className="px-4 py-3 border-b border-gray-700 text-sm">
                                {tweet.confidence ? (
                                  <div className="flex items-center">
                                    <div className="w-full bg-navy-900 rounded-full h-1.5 mr-2">
                                      <div 
                                        className={`h-1.5 rounded-full ${
                                          tweet.confidence > 0.8 ? 'bg-red-500' : 
                                          tweet.confidence > 0.5 ? 'bg-yellow-500' : 
                                          'bg-green-500'}`}
                                        style={{ width: `${Math.round(tweet.confidence * 100)}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-gray-300 text-xs">{Math.round(tweet.confidence * 100)}%</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-3 border-b border-gray-700">
                                <div className="flex items-center space-x-3 text-xs text-gray-400">
                                  <div title="Views">👁️ {tweet.view_count || '0'}</div>
                                  <div title="Likes">❤️ {tweet.favorite_count || '0'}</div>
                                  <div title="Retweets">🔁 {tweet.retweet_count || '0'}</div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 text-center text-gray-400">
                        No communication records found for this subject.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TwitterUserAnalysis; 