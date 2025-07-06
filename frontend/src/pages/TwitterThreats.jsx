import { useState, useEffect } from 'react';
import { FaTwitter, FaExclamationTriangle, FaSpinner, FaUserCircle, FaShieldAlt, FaTrash, FaMapMarkerAlt, FaGavel } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../services/apiService';
import TwitterUserProfile from '../components/TwitterUserProfile';

const TwitterThreats = () => {
  const [loading, setLoading] = useState(true);
  const [threats, setThreats] = useState([]);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [generatingFIR, setGeneratingFIR] = useState(null);

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await apiService.getTwitterThreats();
        console.log('🔍 Fetched Twitter threats from backend:', data);
        
        // Log the user metadata for each threat to debug the display issue
        data.forEach((threat, index) => {
          console.log(`Threat ${index + 1} user metadata:`, {
            user_metadata: threat.user_metadata,
            twitter_metadata: threat.twitter_metadata,
            text: threat.text
          });
        });
        
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

  const handleGenerateFIR = async (threat) => {
    try {
      setGeneratingFIR(threat.id || `threat-${threats.indexOf(threat)}`);
      
      // Create FIR
      const response = await apiService.createFIR(threat);
      
      console.log('✅ FIR created successfully:', response);
      
      // Show success message
      setError(null);
      
      // Optionally redirect to FIRs page
      setTimeout(() => {
        window.location.href = '/firs';
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error generating FIR:', error);
      setError('Failed to generate FIR: ' + error.message);
    } finally {
      setGeneratingFIR(null);
    }
  };

  const handleClearAll = async () => {
    try {
      setLoading(true);
      await apiService.clearTwitterThreats();
      setThreats([]);
      console.log('✅ Successfully cleared all Twitter threats');
    } catch (error) {
      setError('Failed to clear threats: ' + error.message);
      console.error('❌ Error clearing threats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThreatTypeColor = (threatClass) => {
    switch(threatClass?.toLowerCase()) {
      case 'hate speech/extremism':
      case 'hate speech':
        return 'badge-danger';
      case 'direct violence threats':
      case 'violence':
        return 'badge-danger';
      case 'harassment and intimidation':
      case 'harassment':
        return 'badge-warning';
      case 'criminal activity':
        return 'badge-warning';
      case 'child safety threats':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      {/* Header Section */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center mb-4">
          <div className="relative">
            <FaTwitter className="text-4xl text-primary-400 mr-4 drop-shadow-lg" />
            <div className="absolute inset-0 bg-primary-400/20 rounded-full blur-md" />
          </div>
          <div>
            <h1 className="heading-2 glow-text">
          Twitter Threat Monitor
        </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge badge-danger">Live Monitoring</span>
              <span className="badge badge-primary">AI Detection</span>
            </div>
          </div>
        </div>
        <p className="body-large max-w-4xl">
          View threats detected from Twitter in real-time. This dashboard shows all content flagged as threatening from Twitter searches, providing detailed metadata and analysis about the associated users.
        </p>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
      {error && (
          <motion.div 
            className="alert alert-danger mb-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="flex items-center">
              <FaExclamationTriangle className="h-5 w-5 mr-3" />
            <span>{error}</span>
          </div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && (
        <motion.div 
          className="card-glass p-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex flex-col items-center">
            <div className="relative">
              <FaSpinner className="animate-spin h-12 w-12 text-primary-400 mb-6" />
              <div className="absolute inset-0 bg-primary-400/20 rounded-full blur-md animate-pulse" />
            </div>
            <h3 className="heading-4 mb-2">Loading Twitter Threats</h3>
            <p className="body-medium">Fetching and analyzing threat data from Twitter...</p>
        </div>
        </motion.div>
      )}

      {/* No Results State */}
      {!loading && threats.length === 0 && (
        <motion.div 
          className="card-glass p-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col items-center">
            <div className="relative mb-6">
              <FaShieldAlt className="h-16 w-16 text-success-400" />
              <div className="absolute inset-0 bg-success-400/20 rounded-full blur-md" />
            </div>
            <h3 className="heading-4 mb-4">No Twitter Threats Detected</h3>
            <p className="body-medium mb-6 max-w-md">
              Great news! No threats from Twitter have been detected yet. The system is actively monitoring for potential threats.
            </p>
            <button className="btn btn-primary">
              <FaTwitter className="mr-2" />
              Start Twitter Search
            </button>
        </div>
        </motion.div>
      )}

      {/* Results Grid */}
      {!loading && threats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="card-glass mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="heading-4">Detected Twitter Threats</h2>
                <p className="body-medium mt-1">Click on any threat card to view detailed user information</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge badge-danger">
              <FaExclamationTriangle className="mr-2" />
              {threats.length} threats found
                </span>
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={handleClearAll}
                  disabled={loading}
                >
                  <FaTrash className="mr-2" />
                  Clear All
                </button>
            </div>
          </div>
          
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {threats.map((threat, index) => (
                <motion.div 
                  key={threat.id || `threat-${index}`}
                  variants={itemVariants}
                  className="card hover:shadow-neon cursor-pointer transition-all duration-300 hover:scale-105"
                onClick={() => handleUserSelect(threat.user_metadata)}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98 }}
              >
                  {/* User Header */}
                  <div className="flex items-center mb-4 pb-4 border-b border-border-primary/20">
                    <div className="relative">
                    {(threat.user_metadata?.profile_image || threat.twitter_metadata?.profile_image) ? (
                      <img 
                        src={threat.user_metadata?.profile_image || threat.twitter_metadata?.profile_image} 
                        alt="Profile" 
                          className="w-12 h-12 rounded-full border-2 border-primary-500/30"
                      />
                    ) : (
                        <FaUserCircle className="w-12 h-12 text-text-tertiary" />
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-danger-500 border-2 border-bg-primary rounded-full animate-pulse" />
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="font-semibold text-text-primary truncate">
                        {threat.user_metadata?.display_name || threat.twitter_metadata?.display_name || threat.twitter_metadata?.username || 'Unknown User'}
                      </div>
                      {(threat.user_metadata?.twitter_handle || threat.twitter_metadata?.username) && (
                        <div className="text-sm text-text-tertiary truncate">
                          @{threat.user_metadata?.twitter_handle || threat.twitter_metadata?.username}
                        </div>
                      )}
                      {(threat.user_metadata?.location || threat.twitter_metadata?.location) && (
                        <div className="text-xs text-text-tertiary truncate flex items-center mt-1">
                          <FaMapMarkerAlt className="mr-1" />
                          {threat.user_metadata?.location || threat.twitter_metadata?.location}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Threat Classification */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`badge ${getThreatTypeColor(threat.predicted_class || threat.threat_class)}`}>
                      <FaExclamationTriangle className="mr-1" />
                      {threat.predicted_class || threat.threat_class || 'Threat'}
                    </span>
                      <span className="text-xs text-text-tertiary">
                      {new Date(threat.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                    
                    {/* Content Preview */}
                    <p className="body-small text-text-secondary line-clamp-3 mb-3">
                    {threat.text || threat.threat_content || 'No content available'}
                  </p>
                </div>

                  {/* Confidence Meter */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-text-tertiary">Confidence</span>
                      <span className="text-xs font-bold text-text-primary">
                        {Math.round((threat.confidence || threat.threat_confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-danger-500 to-warning-500 h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.round((threat.confidence || threat.threat_confidence || 0) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* FIR Generation Button */}
                  <div className="flex items-center gap-2">
                    <button 
                      className="btn btn-sm btn-danger flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateFIR(threat);
                      }}
                      disabled={generatingFIR === (threat.id || `threat-${index}`)}
                    >
                      {generatingFIR === (threat.id || `threat-${index}`) ? (
                        <>
                          <FaSpinner className="animate-spin mr-1" />
                          Generating FIR...
                        </>
                      ) : (
                        <>
                          <FaGavel className="mr-1" />
                          Generate FIR
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
            ))}
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Selected User Profile Modal */}
      <AnimatePresence>
      {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
        <TwitterUserProfile 
          userData={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
            </motion.div>
          </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default TwitterThreats; 