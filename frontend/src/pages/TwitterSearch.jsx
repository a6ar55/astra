import { useState } from 'react';
import { FaTwitter, FaSearch, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import apiService from '../services/apiService';
import TwitterUserProfile from '../components/TwitterUserProfile';
import TwitterApiTest from '../components/TwitterApiTest';

const TwitterSearch = () => {
  const [query, setQuery] = useState('');
  const [count, setCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSearchResults(null);
      setSelectedUser(null);
      
      const results = await apiService.searchTwitterThreats(query, count);
      setSearchResults(results);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred during the search');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userData) => {
    setSelectedUser(userData);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <FaTwitter className="mr-3 text-blue-400" />
          Twitter Threat Search
        </h1>
        <p className="text-slate-600 mt-2">
          Search Twitter for potential threats based on keywords or phrases.
          Our system will analyze tweets and identify users that may be posting threatening content.
        </p>
      </div>

      {/* Direct RapidAPI Test */}
      <TwitterApiTest />

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSearch}>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="query" className="block text-sm font-medium text-slate-700 mb-1">
                Search Query
              </label>
              <input
                type="text"
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter keywords to search for threats..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-full md:w-32">
              <label htmlFor="count" className="block text-sm font-medium text-slate-700 mb-1">
                Tweet Count
              </label>
              <select
                id="count"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
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
        </form>
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

      {/* Results */}
      {searchResults && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Search Results for "{query}"
            </h2>
            <div className="text-sm text-slate-600">
              <span className="inline-flex items-center justify-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full mr-2">
                Total: {searchResults.total_analyzed}
              </span>
              <span className="inline-flex items-center justify-center px-2 py-1 bg-red-100 text-red-800 rounded-full">
                <FaExclamationTriangle className="mr-1" />
                Threats: {searchResults.threats_found}
              </span>
            </div>
          </div>

          {searchResults.threats_found === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No threats detected in the analyzed tweets.
            </div>
          ) : (
            <div>
              <h3 className="text-md font-semibold mb-3 text-slate-700">Detected Threats:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.threats.map((threat) => (
                  <div 
                    key={threat.tweet_id} 
                    className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md cursor-pointer"
                    onClick={() => handleUserSelect(threat.user_metadata)}
                  >
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <div className="flex items-center">
                        <img 
                          src={threat.user_metadata.profile_image || '/default-avatar.png'} 
                          alt="Profile" 
                          className="w-10 h-10 rounded-full mr-3"
                        />
                        <div>
                          <div className="font-medium text-slate-900">
                            {threat.user_metadata.display_name}
                          </div>
                          <div className="text-sm text-slate-500">
                            @{threat.user_metadata.twitter_handle}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="mb-2 text-sm font-medium text-slate-700">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 mr-2 bg-red-100 text-red-800 rounded">
                          <FaExclamationTriangle className="mr-1" />
                          {threat.threat_analysis.predicted_class || 'Threat'}
                        </span>
                        <span className="text-slate-500">
                          {new Date(threat.tweet_created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-3">
                        {threat.tweet_content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

export default TwitterSearch; 