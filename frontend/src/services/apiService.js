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

  // Models API
  async getAvailableModels() {
    try {
      const response = await this.client.get('/models');
      return response;
    } catch (error) {
      console.error('Error fetching available models:', error);
      throw error;
    }
  }

  // Threat Analysis API
  async analyzeThreat(text, modelType = 'distilbert') {
    try {
      const response = await this.client.post('/predict', { text, model_type: modelType });
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

  async clearTwitterThreats() {
    try {
      const response = await this.client.delete('/twitter/threats/clear');
      return response.data;
    } catch (error) {
      console.error('Error clearing Twitter threats:', error);
      throw error;
    }
  }

  // Twitter Monitor APIs
  async createTwitterMonitor(monitorData) {
    try {
      const response = await this.client.post('/twitter/monitors', monitorData);
      return response.data;
    } catch (error) {
      console.error('Error creating Twitter monitor:', error);
      throw error;
    }
  }

  async getTwitterMonitors() {
    try {
      const response = await this.client.get('/twitter/monitors');
      return response.data;
    } catch (error) {
      console.error('Error fetching Twitter monitors:', error);
      throw error;
    }
  }

  async updateTwitterMonitor(monitorId, monitorData) {
    try {
      const response = await this.client.put(`/twitter/monitors/${monitorId}`, monitorData);
      return response.data;
    } catch (error) {
      console.error('Error updating Twitter monitor:', error);
      throw error;
    }
  }

  async deleteTwitterMonitor(monitorId) {
    try {
      const response = await this.client.delete(`/twitter/monitors/${monitorId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting Twitter monitor:', error);
      throw error;
    }
  }

  // New Twitter Analysis methods
  async analyzeTwitterUser(username, tweets, userInfo = null, modelType = 'distilbert') {
    try {
      const response = await this.client.post('/twitter/analyze-user', {
        username,
        tweets,
        userInfo,
        model_type: modelType
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing Twitter user:', error);
      throw error;
    }
  }

  async analyzeSingleTweet(tweetText, username = null, tweetMetadata = null, modelType = 'distilbert') {
    try {
      const response = await this.client.post('/twitter/analyze-tweet', {
        tweet_text: tweetText,
        username,
        tweet_metadata: tweetMetadata,
        model_type: modelType
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing single tweet:', error);
      throw error;
    }
  }

  // Chat AI API
  async sendChatMessage(message, useWebSearch = false) {
    try {
      const response = await this.client.post('/chat/message', { 
        message, 
        use_web_search: useWebSearch 
      });
      return response.data;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  async performWebSearch(query, numResults = 5) {
    try {
      const response = await this.client.post('/chat/web-search', {
        query,
        num_results: numResults
      });
      return response.data;
    } catch (error) {
      console.error('Error performing web search:', error);
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

  // Generate presenter script (.txt)
  async generatePresenterScript(reportId) {
    try {
      const response = await this.client.post(
        '/briefing/generate-script',
        { reportId },
        { responseType: 'blob' }
      );

      const blob = response.data;
      const contentDisposition = response.headers?.['content-disposition'] || '';
      const fileNameMatch = contentDisposition.match(/filename="?([^;"\n]+)"?/i);
      const fileName = fileNameMatch ? fileNameMatch[1] : `threat_briefing_script_${new Date().toISOString().split('T')[0]}.txt`;

      const objectUrl = URL.createObjectURL(blob);

      return {
        success: true,
        blob,
        objectUrl,
        fileName
      };
    } catch (error) {
      console.error('Error generating presenter script:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to generate presenter script'
      };
    }
  }

  // Generate video from PowerPoint (.mp4)
  async generateVideoFromPptx(reportId) {
    try {
      const response = await this.client.post(
        '/briefing/generate-video',
        { reportId },
        { responseType: 'blob' }
      );

      const blob = response.data;
      const contentDisposition = response.headers?.['content-disposition'] || '';
      const fileNameMatch = contentDisposition.match(/filename="?([^;"\n]+)"?/i);
      const fileName = fileNameMatch ? fileNameMatch[1] : `threat_briefing_video_${new Date().toISOString().split('T')[0]}.mp4`;

      const objectUrl = URL.createObjectURL(blob);

      return {
        success: true,
        blob,
        objectUrl,
        fileName
      };
    } catch (error) {
      console.error('Error generating video:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to generate video'
      };
    }
  }

  // Briefing API methods
  async generatePowerpointPresentation(reportId) {
    try {
      const response = await this.client.post(
        '/briefing/generate-ppt',
        { reportId },
        { responseType: 'blob' }
      );

      // Axios already gives us a Blob when responseType is 'blob'
      const blob = response.data;

      // Try to extract filename from header → fallback to generic name
      const contentDisposition = response.headers?.['content-disposition'] || '';
      const fileNameMatch = contentDisposition.match(/filename="?([^;"]+)"?/i);
      const fileName = fileNameMatch ? fileNameMatch[1] : `threat_analysis_briefing_${new Date().toISOString().split('T')[0]}.pptx`;

      const objectUrl = URL.createObjectURL(blob);

      return {
        success: true,
        blob,
        objectUrl,
        fileName
      };
    } catch (error) {
      console.error('Error generating PowerPoint:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to generate presentation'
      };
    }
  }

  // FIR (First Information Report) API
  async createFIR(threatData) {
    try {
      const response = await this.client.post('/fir/create', { threat_data: threatData });
      return response.data;
    } catch (error) {
      console.error('Error creating FIR:', error);
      throw error;
    }
  }

  async getUserFIRs(limit = 50) {
    try {
      const response = await this.client.get(`/fir/list?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user FIRs:', error);
      throw error;
    }
  }

  async getFIRById(firId) {
    try {
      const response = await this.client.get(`/fir/${firId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching FIR:', error);
      throw error;
    }
  }

  async updateFIRStatus(firId, status) {
    try {
      const response = await this.client.put(`/fir/${firId}/status?status=${status}`);
      return response.data;
    } catch (error) {
      console.error('Error updating FIR status:', error);
      throw error;
    }
  }

  async downloadFIRPDF(firId) {
    try {
      const response = await this.client.get(`/fir/${firId}/pdf`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading FIR PDF:', error);
      throw error;
    }
  }

  async getAvailableReports() {
    try {
      // Get both threat and summary reports
      const [threatResponse, summaryResponse] = await Promise.all([
        this.getThreatReport(),
        this.getSummaryReport()
      ]);
      
      const reports = [];
      
      // Add threat report if available
      if (threatResponse.report) {
        reports.push({
          id: 'threat-report',
          type: 'threat',
          title: 'Threat Analysis Report',
          created_at: threatResponse.report.saved_at || new Date().toISOString(),
          incidents: threatResponse.report.incidents?.length || 0,
          preview: threatResponse.report
        });
      }
      
      // Add summary report if available
      if (summaryResponse.report) {
        reports.push({
          id: 'summary-report',
          type: 'summary',
          title: summaryResponse.report.title || 'Summary Report',
          created_at: summaryResponse.report.saved_at || new Date().toISOString(),
          incidents: summaryResponse.report.total_analyses || 0,
          preview: summaryResponse.report
        });
      }
      
      // Add some sample reports if no real reports exist
      if (reports.length === 0) {
        reports.push({
          id: 'sample-threat',
          type: 'threat',
          title: 'Sample Threat Intelligence Report',
          created_at: new Date().toISOString(),
          incidents: 5,
          preview: {
            title: 'Sample Threat Intelligence Report',
            summary: 'This is a sample report for demonstration purposes.',
            incidents: [
              { type: 'Hate Speech/Extremism', severity: 'HIGH', count: 2 },
              { type: 'Direct Violence Threats', severity: 'CRITICAL', count: 1 },
              { type: 'Harassment and Intimidation', severity: 'MEDIUM', count: 2 }
            ]
          }
        });
      }
      
      return reports;
    } catch (error) {
      console.error('Error getting available reports:', error);
      return [];
    }
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService; 