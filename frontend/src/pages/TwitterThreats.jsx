import { useState, useEffect } from 'react';
import { FaTwitter, FaExclamationTriangle, FaSpinner, FaUserCircle } from 'react-icons/fa';
import apiService from '../services/apiService';
import TwitterUserProfile from '../components/TwitterUserProfile';

const TwitterThreats = () => {
  const [loading, setLoading] = useState(true);
  const [threats, setThreats] = useState([]);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await apiService.getTwitterThreats();
        setThreats(data);
      } catch (err) {
        setError(err.response?.data?.detail || 'An error occurred while fetching threats');
      } finally {
        setLoading(false);
      }
    };

    fetchThreats();
  }, []);

  const handleUserSelect = (userData) => {
    setSelectedUser(userData);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <FaTwitter className="mr-3 text-blue-400" />
          Twitter Threat Monitor
        </h1>
        <p className="text-slate-600 mt-2">
          View threats detected from Twitter. This page shows all content flagged as threatening
          from Twitter searches, providing detailed metadata about the associated users.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          <div className="flex">
            <FaExclamationTriangle className="h-5 w-5 text-red-500 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-10">
          <FaSpinner className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" />
          <p className="text-slate-600">Loading threats from Twitter...</p>
        </div>
      )}

      {/* Results */}
      {!loading && threats.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-10 text-center">
          <FaExclamationTriangle className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-800">No Twitter threats found</h3>
          <p className="text-slate-600 mt-2">
            No threats from Twitter have been detected yet. Try searching for content using 
            the Twitter Search feature to identify potential threats.
          </p>
        </div>
      )}

      {!loading && threats.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Detected Twitter Threats
            </h2>
            <div className="text-sm bg-red-100 text-red-800 rounded-full px-3 py-1 flex items-center">
              <FaExclamationTriangle className="mr-2" />
              {threats.length} threats found
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {threats.map((threat) => (
              <div 
                key={threat.id || Math.random().toString(36).substring(7)} 
                className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md cursor-pointer"
                onClick={() => handleUserSelect(threat.user_metadata)}
              >
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <div className="flex items-center">
                    {threat.user_metadata?.profile_image ? (
                      <img 
                        src={threat.user_metadata.profile_image} 
                        alt="Profile" 
                        className="w-10 h-10 rounded-full mr-3"
                      />
                    ) : (
                      <FaUserCircle className="w-10 h-10 rounded-full mr-3 text-slate-400" />
                    )}
                    <div>
                      <div className="font-medium text-slate-900">
                        {threat.user_metadata?.display_name || 'Unknown User'}
                      </div>
                      {threat.user_metadata?.twitter_handle && (
                        <div className="text-sm text-slate-500">
                          @{threat.user_metadata.twitter_handle}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 mr-2 bg-red-100 text-red-800 rounded">
                      <FaExclamationTriangle className="mr-1" />
                      {threat.predicted_class || threat.threat_class || 'Threat'}
                    </span>
                    <span className="text-slate-500">
                      {new Date(threat.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-3">
                    {threat.text || threat.threat_content || 'No content available'}
                  </p>
                </div>
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
                  Confidence: {Math.round((threat.confidence || threat.threat_confidence || 0) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected User Profile */}
      {selectedUser && (
        <TwitterUserProfile 
          userData={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
      )}
    </div>
  );
};

export default TwitterThreats; 