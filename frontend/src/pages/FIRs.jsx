import { useState, useEffect } from 'react';
import { FaGavel, FaDownload, FaEye, FaSpinner, FaExclamationTriangle, FaCheckCircle, FaClock, FaFileAlt, FaTrash, FaShieldAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../services/apiService';

const FIRs = () => {
  const [loading, setLoading] = useState(true);
  const [firs, setFirs] = useState([]);
  const [error, setError] = useState(null);
  const [selectedFIR, setSelectedFIR] = useState(null);

  useEffect(() => {
    fetchFIRs();
  }, []);

  const fetchFIRs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getUserFIRs();
      console.log('🔍 Fetched FIRs from backend:', response);
      
      setFirs(response.firs || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred while fetching FIRs');
      console.error('❌ Error fetching FIRs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFIR = (fir) => {
    setSelectedFIR(fir);
  };

  const handleUpdateStatus = async (firId, newStatus) => {
    try {
      await apiService.updateFIRStatus(firId, newStatus);
      
      // Update local state
      setFirs(prevFirs => 
        prevFirs.map(fir => 
          fir.fir_id === firId 
            ? { ...fir, status: newStatus }
            : fir
        )
      );
      
      console.log('✅ FIR status updated successfully');
    } catch (error) {
      console.error('❌ Error updating FIR status:', error);
      setError('Failed to update status: ' + error.message);
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'critical':
        return 'badge-danger';
      case 'high':
        return 'badge-warning';
      case 'medium':
        return 'badge-primary';
      case 'low':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return 'badge-danger';
      case 'investigating':
        return 'badge-warning';
      case 'resolved':
        return 'badge-success';
      case 'closed':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return <FaExclamationTriangle className="mr-1" />;
      case 'investigating':
        return <FaClock className="mr-1" />;
      case 'resolved':
        return <FaCheckCircle className="mr-1" />;
      case 'closed':
        return <FaShieldAlt className="mr-1" />;
      default:
        return <FaClock className="mr-1" />;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
            <FaGavel className="text-4xl text-danger-400 mr-4 drop-shadow-lg" />
            <div className="absolute inset-0 bg-danger-400/20 rounded-full blur-md" />
          </div>
          <div>
            <h1 className="heading-2 glow-text">
              First Information Reports (FIRs)
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge badge-danger">NYPD Style</span>
              <span className="badge badge-primary">Legal Documents</span>
            </div>
          </div>
        </div>
        <p className="body-large max-w-4xl">
          View and manage First Information Reports generated for critical Twitter threats. 
          These NYPD-style reports contain detailed information about threats, suspects, and incident narratives.
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
            <h3 className="heading-4 mb-2">Loading FIRs</h3>
            <p className="body-medium">Fetching First Information Reports...</p>
          </div>
        </motion.div>
      )}

      {/* No Results State */}
      {!loading && firs.length === 0 && (
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
            <h3 className="heading-4 mb-4">No FIRs Generated Yet</h3>
            <p className="body-medium mb-6 max-w-md">
              No First Information Reports have been generated yet. FIRs are created when agents 
              identify critical threats in the Twitter Threats section.
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.href = '/social-media/threats'}
            >
              <FaExclamationTriangle className="mr-2" />
              Go to Twitter Threats
            </button>
          </div>
        </motion.div>
      )}

      {/* Results Grid */}
      {!loading && firs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="card-glass mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="heading-4">Generated FIRs</h2>
                <p className="body-medium mt-1">Click on any FIR to view detailed information</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge badge-danger">
                  <FaGavel className="mr-2" />
                  {firs.length} FIRs
                </span>
              </div>
            </div>
            
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {firs.map((fir, index) => (
                <motion.div 
                  key={fir.fir_id || `fir-${index}`}
                  variants={itemVariants}
                  className="card hover:shadow-neon cursor-pointer transition-all duration-300 hover:scale-105"
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* FIR Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-primary/20">
                    <div className="flex items-center">
                      <div className="relative">
                        <FaGavel className="w-8 h-8 text-danger-400" />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-danger-500 border-2 border-bg-primary rounded-full" />
                      </div>
                      <div className="ml-3">
                        <div className="font-semibold text-text-primary">
                          {fir.fir_id}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {formatDate(fir.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Threat Information */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`badge ${getSeverityColor(fir.severity)}`}>
                        <FaExclamationTriangle className="mr-1" />
                        {fir.severity}
                      </span>
                      <span className={`badge ${getStatusColor(fir.status)}`}>
                        {getStatusIcon(fir.status)}
                        {fir.status}
                      </span>
                    </div>
                    
                    {/* Threat Classification */}
                    <div className="mb-3">
                      <div className="text-xs font-medium text-text-tertiary mb-1">Threat Classification</div>
                      <div className="text-sm text-text-primary">
                        {fir.content?.threat_classification || 'Unknown'}
                      </div>
                    </div>

                    {/* Suspect Info */}
                    <div className="mb-3">
                      <div className="text-xs font-medium text-text-tertiary mb-1">Suspect</div>
                      <div className="text-sm text-text-primary">
                        @{fir.content?.suspect_info?.username || 'Unknown'}
                      </div>
                    </div>

                    {/* Location */}
                    <div className="mb-3">
                      <div className="text-xs font-medium text-text-tertiary mb-1">Location</div>
                      <div className="text-sm text-text-primary">
                        {fir.content?.location?.city}, {fir.content?.location?.state}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleViewFIR(fir)}
                    >
                      <FaEye className="mr-2" />
                      View Details
                    </button>
                    <select
                      value={fir.status}
                      onChange={(e) => handleUpdateStatus(fir.fir_id, e.target.value)}
                      className="select select-sm select-bordered"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INVESTIGATING">Investigating</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Selected FIR Modal */}
      <AnimatePresence>
        {selectedFIR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedFIR(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="max-w-4xl w-full max-h-[90vh] overflow-y-auto card-glass"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <FaGavel className="text-2xl text-danger-400 mr-3" />
                    <div>
                      <h2 className="heading-3">FIR Details</h2>
                      <p className="text-text-tertiary">{selectedFIR.fir_id}</p>
                    </div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedFIR(null)}
                  >
                    ×
                  </button>
                </div>

                {/* FIR Content */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-text-tertiary mb-2">Severity</h3>
                      <span className={`badge ${getSeverityColor(selectedFIR.severity)}`}>
                        {selectedFIR.severity}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-tertiary mb-2">Status</h3>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${getStatusColor(selectedFIR.status)}`}>
                          {getStatusIcon(selectedFIR.status)}
                          {selectedFIR.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Threat Details */}
                  <div>
                    <h3 className="text-sm font-semibold text-text-tertiary mb-2">Threat Classification</h3>
                    <p className="text-text-primary">{selectedFIR.content?.threat_classification}</p>
                  </div>

                  {/* Suspect Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-text-tertiary mb-2">Suspect Information</h3>
                    <div className="bg-surface-light/20 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-text-tertiary">Username:</span>
                          <p className="text-text-primary">@{selectedFIR.content?.suspect_info?.username}</p>
                        </div>
                        <div>
                          <span className="text-xs text-text-tertiary">Display Name:</span>
                          <p className="text-text-primary">{selectedFIR.content?.suspect_info?.display_name}</p>
                        </div>
                        <div>
                          <span className="text-xs text-text-tertiary">Location:</span>
                          <p className="text-text-primary">
                            {selectedFIR.content?.suspect_info?.location?.city}, {selectedFIR.content?.suspect_info?.location?.state}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-text-tertiary">Followers:</span>
                          <p className="text-text-primary">{selectedFIR.content?.suspect_info?.followers_count || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Threat Content */}
                  <div>
                    <h3 className="text-sm font-semibold text-text-tertiary mb-2">Threatening Content</h3>
                    <div className="bg-surface-light/20 p-4 rounded-lg">
                      <p className="text-text-primary">{selectedFIR.content?.threat_details?.content}</p>
                    </div>
                  </div>

                  {/* Narrative */}
                  <div>
                    <h3 className="text-sm font-semibold text-text-tertiary mb-2">Narrative</h3>
                    <div className="bg-surface-light/20 p-4 rounded-lg">
                      <p className="text-text-primary whitespace-pre-line">{selectedFIR.content?.narrative}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t border-border-primary/20">
                    <button 
                      className="btn btn-primary"
                      onClick={() => setSelectedFIR(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FIRs; 