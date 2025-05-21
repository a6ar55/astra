import { FaTwitter, FaCheckCircle, FaUserFriends, FaCalendarAlt, FaMapMarkerAlt, FaGlobe, FaTimes, FaUser } from 'react-icons/fa';

const TwitterUserProfile = ({ userData, onClose }) => {
  if (!userData) return null;

  // Format date string
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      // Handle Twitter API date format
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (err) {
      return dateString;
    }
  };

  // Format number with commas
  const formatNumber = (number) => {
    return number?.toLocaleString() || '0';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <FaTwitter className="mr-2 text-blue-400" />
            Twitter User Profile
          </h2>
          <button 
            className="text-slate-500 hover:text-slate-700" 
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 py-4">
          <div className="flex items-start">
            {userData.profile_image ? (
              <img 
                src={userData.profile_image} 
                alt={userData.display_name || "User"} 
                className="w-20 h-20 rounded-full mr-5 border border-slate-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full mr-5 border border-slate-200 bg-slate-100 flex items-center justify-center">
                <FaUser className="w-10 h-10 text-slate-400" />
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center">
                <h3 className="text-xl font-bold text-slate-900 mr-2">
                  {userData.display_name || "Unknown User"}
                </h3>
                {userData.verified && (
                  <FaCheckCircle className="text-blue-500" title="Verified Account" />
                )}
              </div>
              <div className="text-blue-500 font-medium">
                @{userData.twitter_handle || "unknown"}
              </div>
              <p className="text-slate-700 mt-2">
                {userData.profile_description || "No description available"}
              </p>
            </div>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="text-sm text-slate-600">Followers</div>
              <div className="text-lg font-bold text-slate-900 flex items-center">
                <FaUserFriends className="mr-2 text-slate-500" />
                {formatNumber(userData.follower_count)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="text-sm text-slate-600">Following</div>
              <div className="text-lg font-bold text-slate-900 flex items-center">
                <FaUserFriends className="mr-2 text-slate-500" />
                {formatNumber(userData.following_count)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="text-sm text-slate-600">Tweets</div>
              <div className="text-lg font-bold text-slate-900 flex items-center">
                <FaTwitter className="mr-2 text-slate-500" />
                {formatNumber(userData.tweet_count)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="text-sm text-slate-600">Account Created</div>
              <div className="text-md font-bold text-slate-900 flex items-center">
                <FaCalendarAlt className="mr-2 text-slate-500" />
                <span className="truncate">{formatDate(userData.account_creation_date)}</span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 bg-slate-50 rounded-lg border border-slate-200 p-4">
            <h4 className="text-slate-800 font-medium mb-4">Additional Information</h4>
            <div className="space-y-3">
              {userData.location && (
                <div className="flex items-start">
                  <FaMapMarkerAlt className="text-slate-500 mt-0.5 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-slate-700">Location</div>
                    <div className="text-slate-600">{userData.location}</div>
                  </div>
                </div>
              )}
              
              {userData.url && (
                <div className="flex items-start">
                  <FaGlobe className="text-slate-500 mt-0.5 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-slate-700">Website</div>
                    <a 
                      href={userData.url.startsWith('http') ? userData.url : `https://${userData.url}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {userData.url}
                    </a>
                  </div>
                </div>
              )}
              
              <div className="flex items-start">
                <FaTwitter className="text-slate-500 mt-0.5 mr-3" />
                <div>
                  <div className="text-sm font-medium text-slate-700">Twitter Profile</div>
                  <a 
                    href={`https://twitter.com/${userData.twitter_handle}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    https://twitter.com/{userData.twitter_handle}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Threat Assessment Banner */}
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            <div className="flex items-center mb-2">
              <FaExclamationTriangle className="text-red-600 mr-2" />
              <h4 className="font-bold">Threat Assessment</h4>
            </div>
            <p>This Twitter user has been flagged for posting potentially threatening content. 
            The content has been analyzed by our threat detection model and requires review.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end">
          <button 
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 mr-2"
            onClick={onClose}
          >
            Close
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => window.open(`https://twitter.com/${userData.twitter_handle}`, '_blank')}
          >
            View on Twitter
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwitterUserProfile; 