import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include user_id in all requests
    this.client.interceptors.request.use((config) => {
      // Try to get user_id from localStorage
      const userId = localStorage.getItem('userId') || window.clerk?.user?.id;
      
      if (userId) {
        config.headers['user_id'] = userId;
      } else if (window.clerk?.user?.id) {
        // Use Clerk user ID if available and store it for future use
        const clerkUserId = window.clerk.user.id;
        localStorage.setItem('userId', clerkUserId);
        config.headers['user_id'] = clerkUserId;
      }
      
      return config;
    });
  }

  // Threat Analysis API
  async analyzeThreat(text) {
    try {
      const response = await this.client.post('/predict', { text });
      return response.data;
    } catch (error) {
      console.error('Error analyzing threat:', error);
      throw error;
    }
  }

  async analyzeBatchThreats(texts) {
    try {
      const response = await this.client.post('/predict/batch', { texts });
      return response.data;
    } catch (error) {
      console.error('Error analyzing batch threats:', error);
      throw error;
    }
  }

  // User History API
  async getUserHistory() {
    try {
      const response = await this.client.get('/user/history');
      return response.data;
    } catch (error) {
      console.error('Error fetching user history:', error);
      throw error;
    }
  }

  async getUserStats() {
    try {
      const response = await this.client.get('/user/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  // Reports API
  async getSummaryReport() {
    try {
      const response = await this.client.get('/user/reports/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching summary report:', error);
      throw error;
    }
  }

  async saveSummaryReport(reportData) {
    try {
      const response = await this.client.post('/user/reports/summary', reportData);
      return response.data;
    } catch (error) {
      console.error('Error saving summary report:', error);
      throw error;
    }
  }

  async getThreatReport() {
    try {
      const response = await this.client.get('/user/reports/threat');
      return response.data;
    } catch (error) {
      console.error('Error fetching threat report:', error);
      throw error;
    }
  }

  async saveThreatReport(reportData) {
    try {
      const response = await this.client.post('/user/reports/threat', reportData);
      return response.data;
    } catch (error) {
      console.error('Error saving threat report:', error);
      throw error;
    }
  }

  // Twitter API
  async searchTwitterThreats(query, count = 20) {
    try {
      const response = await this.client.post('/twitter/search', { query, count });
      return response.data;
    } catch (error) {
      console.error('Error searching Twitter threats:', error);
      throw error;
    }
  }

  async getTwitterUserInfo(username) {
    try {
      const response = await this.client.post('/twitter/user', { username });
      return response.data;
    } catch (error) {
      console.error('Error getting Twitter user info:', error);
      throw error;
    }
  }

  async getTwitterThreats() {
    try {
      const response = await this.client.get('/twitter/threats');
      return response.data;
    } catch (error) {
      console.error('Error fetching Twitter threats:', error);
      throw error;
    }
  }

  // New Twitter Analysis methods
  async analyzeTwitterUser(username, tweets, userInfo = null) {
    try {
      const response = await this.client.post('/twitter/analyze-user', {
        username,
        tweets,
        userInfo
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing Twitter user:', error);
      throw error;
    }
  }

  async analyzeSingleTweet(tweetText, username = null, tweetMetadata = null) {
    try {
      const response = await this.client.post('/twitter/analyze-tweet', {
        tweet_text: tweetText,
        username,
        tweet_metadata: tweetMetadata
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing single tweet:', error);
      throw error;
    }
  }

  // Chat AI API
  async sendChatMessage(message) {
    try {
      const response = await this.client.post('/chat/message', { message });
      return response.data;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  async getChatHistory(limit = 20) {
    try {
      const response = await this.client.get('/chat/history', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  }

  async checkChatHealth() {
    try {
      const response = await this.client.post('/chat/health', {
        check_type: 'detailed'
      });
      return response.data;
    } catch (error) {
      console.error('Error checking chat health:', error);
      throw error;
    }
  }

  async refreshRAGCache() {
    try {
      const response = await this.client.post('/chat/rag/refresh');
      return response.data;
    } catch (error) {
      console.error('Error refreshing RAG cache:', error);
      throw error;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService; 