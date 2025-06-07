import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Custom hook to manage psycholinguistic profiling state and API calls
 */
const useProfiling = (initialEnabled = false) => {
  // State for toggle
  const [profilingEnabled, setProfilingEnabled] = useState(
    localStorage.getItem('profilingEnabled') === 'true' || initialEnabled
  );
  
  // State for API data
  const [profilingData, setProfilingData] = useState(null);
  const [isProfilingLoading, setIsProfilingLoading] = useState(false);
  const [profilingError, setProfilingError] = useState(null);
  
  // Save preference to localStorage when changed
  useEffect(() => {
    localStorage.setItem('profilingEnabled', profilingEnabled);
  }, [profilingEnabled]);
  
  // Reset profiling data
  const resetProfilingData = useCallback(() => {
    setProfilingData(null);
    setProfilingError(null);
    setIsProfilingLoading(false);
  }, []);
  
  // Generate mock profiling data for offline/demo mode
  const generateMockProfilingData = useCallback((text = "", isThreatening = false) => {
    // Base values that we'll adjust based on input
    const baseEmpath = {
      violence: 0.05,
      terrorism: 0.02,
      hate: 0.03,
      aggression: 0.04,
      anger: 0.06,
      death: 0.01,
      negative_emotion: 0.1,
      law: 0.08,
      power: 0.07,
      weapons: 0.02
    };
    
    const baseVader = {
      compound: -0.1,
      pos: 0.1,
      neu: 0.7,
      neg: 0.2
    };
    
    // If the text has "threatening" words, increase relevant scores
    const threatWords = ['kill', 'threat', 'attack', 'hate', 'destroy', 'bomb', 'violence', 
                        'weapon', 'gun', 'knife', 'shoot', 'death', 'terror', 'blood'];
    
    let threatLevel = isThreatening ? 0.3 : 0;
    
    if (text) {
      const lowerText = text.toLowerCase();
      threatWords.forEach(word => {
        if (lowerText.includes(word)) {
          threatLevel += 0.15;
        }
      });
    }
    
    // Cap the threat level
    threatLevel = Math.min(threatLevel, 0.8);
    
    // Adjust Empath scores based on threat level
    const mockEmpath = { ...baseEmpath };
    Object.keys(mockEmpath).forEach(key => {
      mockEmpath[key] = Math.min(baseEmpath[key] + threatLevel, 0.95);
    });
    
    // Adjust VADER scores - more negative for threatening content
    const mockVader = {
      compound: Math.max(-0.8, baseVader.compound - threatLevel),
      pos: Math.max(0.05, baseVader.pos - (threatLevel * 0.5)),
      neu: Math.max(0.1, baseVader.neu - threatLevel),
      neg: Math.min(0.85, baseVader.neg + threatLevel)
    };
    
    return {
      empath: mockEmpath,
      vader: mockVader
    };
  }, []);
  
  // Profile a single text
  const profileText = useCallback(async (text) => {
    if (!profilingEnabled || !text) {
      return null;
    }
    
    setIsProfilingLoading(true);
    setProfilingError(null);
    
    try {
      const response = await axios.post('/api/profile_text', { text }, {
        timeout: 10000 // 10 second timeout
      });
      
      setProfilingData(response.data.profiling);
      return response.data.profiling;
    } catch (error) {
      console.error('Error profiling text:', error);
      
      // Check if it's a 404 error (API not available)
      if (error.response && error.response.status === 404) {
        console.log('Profiling API unavailable, using mock data instead');
        // Determine if the text appears threatening based on content
        const isThreatening = text.toLowerCase().includes('threat') || 
                             text.toLowerCase().includes('kill') ||
                             text.toLowerCase().includes('hate') ||
                             text.toLowerCase().includes('attack');
        
        // Generate and use mock data as fallback
        const mockData = generateMockProfilingData(text, isThreatening);
        setProfilingData(mockData);
        return mockData;
      }
      
      const errorMessage = error.response?.data?.error || 
                          error.message || 
                          'Failed to profile text';
      setProfilingError(errorMessage);
      return null;
    } finally {
      setIsProfilingLoading(false);
    }
  }, [profilingEnabled, generateMockProfilingData]);
  
  // Profile multiple texts (e.g., tweets)
  const profileBatch = useCallback(async (texts) => {
    if (!profilingEnabled || !texts || texts.length === 0) {
      return null;
    }
    
    setIsProfilingLoading(true);
    setProfilingError(null);
    
    try {
      const response = await axios.post('/api/profile_batch', { texts }, {
        timeout: 15000 // 15 second timeout
      });
      
      setProfilingData(response.data.profiling.aggregated);
      return response.data.profiling;
    } catch (error) {
      console.error('Error profiling batch:', error);
      
      // Check if it's a 404 error (API not available)
      if (error.response && error.response.status === 404) {
        console.log('Batch profiling API unavailable, using mock data instead');
        
        // For batch processing, create aggregate and individual mock results
        const mockResults = texts.map(text => {
          // Determine if the text appears threatening
          const isThreatening = text.toLowerCase().includes('threat') || 
                               text.toLowerCase().includes('kill') ||
                               text.toLowerCase().includes('hate') ||
                               text.toLowerCase().includes('attack');
          return generateMockProfilingData(text, isThreatening);
        });
        
        // Create a simple aggregation of all results
        const aggregated = {
          empath: {},
          vader: {
            compound: 0,
            pos: 0,
            neu: 0,
            neg: 0
          }
        };
        
        // Combine all individual results
        mockResults.forEach(result => {
          // Aggregate Empath categories
          Object.keys(result.empath).forEach(key => {
            if (!aggregated.empath[key]) {
              aggregated.empath[key] = 0;
            }
            aggregated.empath[key] += result.empath[key] / mockResults.length;
          });
          
          // Aggregate VADER scores
          aggregated.vader.compound += result.vader.compound / mockResults.length;
          aggregated.vader.pos += result.vader.pos / mockResults.length;
          aggregated.vader.neu += result.vader.neu / mockResults.length;
          aggregated.vader.neg += result.vader.neg / mockResults.length;
        });
        
        const mockBatchData = {
          individual: mockResults,
          aggregated: aggregated
        };
        
        setProfilingData(mockBatchData.aggregated);
        return mockBatchData;
      }
      
      const errorMessage = error.response?.data?.error || 
                          error.message || 
                          'Failed to profile texts';
      setProfilingError(errorMessage);
      return null;
    } finally {
      setIsProfilingLoading(false);
    }
  }, [profilingEnabled, generateMockProfilingData]);
  
  return {
    profilingEnabled,
    setProfilingEnabled,
    profilingData,
    setProfilingData,
    isProfilingLoading,
    profilingError,
    profileText,
    profileBatch,
    resetProfilingData,
    generateMockProfilingData
  };
};

export default useProfiling; 