import { useState } from 'react';
import { FaTwitter } from 'react-icons/fa';
import { motion } from 'framer-motion';
import TwitterUserProfile from '../components/TwitterUserProfile';
import TwitterApiTest from '../components/TwitterApiTest';

const TwitterSearch = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  const handleUserSelect = (userData) => {
    setSelectedUser(userData);
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
              Twitter Threat Search
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge badge-primary">AI-Powered</span>
              <span className="badge badge-accent">Real-time</span>
            </div>
          </div>
        </div>
        <p className="body-large max-w-4xl">
          Search Twitter for potential threats based on keywords or phrases. Our advanced AI system will analyze tweets in real-time and identify users that may be posting threatening content.
        </p>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Search Configuration Card */}
        <div className="card-glass mb-8">
          <TwitterApiTest />
        </div>

      {/* Selected User Profile */}
      {selectedUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
        <TwitterUserProfile 
          userData={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
          </motion.div>
      )}
      </motion.div>
    </div>
  );
};

export default TwitterSearch; 