import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  FaChartBar, 
  FaDatabase, 
  FaHistory, 
  FaCog, 
  FaMap, 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaFileAlt, 
  FaChevronDown,
  FaChartPie,
  FaUser,
  FaTwitter,
  FaSearch,
  FaRobot,
  FaBrain,
  FaFilePowerpoint,
  FaGavel,
  FaBalanceScale
} from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '@clerk/clerk-react'

const Sidebar = ({ isOpen }) => {
  const location = useLocation()
  const { user } = useUser()
  const [threatSubmenuOpen, setThreatSubmenuOpen] = useState(true)
  const [reportsSubmenuOpen, setReportsSubmenuOpen] = useState(false)
  const [socialMediaSubmenuOpen, setSocialMediaSubmenuOpen] = useState(false)
  const [firsSubmenuOpen, setFirsSubmenuOpen] = useState(false)
  const [legalAnalysisSubmenuOpen, setLegalAnalysisSubmenuOpen] = useState(false)
  
  // Animation variants
  const itemVariants = {
    open: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    closed: { opacity: 0, y: 20, transition: { duration: 0.2 } }
  }

  const sidebarVariants = {
    open: {
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    closed: {
      x: "-100%",
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  }

  // Get user initials for the avatar
  const getUserInitials = () => {
    if (!user) return '';
    
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    } else if (firstName) {
      return firstName.charAt(0);
    } else if (user.emailAddresses && user.emailAddresses[0]) {
      return user.emailAddresses[0].emailAddress.charAt(0).toUpperCase();
    } else {
      return '?';
    }
  };
  
  // Get display name
  const getDisplayName = () => {
    if (!user) return 'User';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.emailAddresses && user.emailAddresses[0]) {
      return user.emailAddresses[0].emailAddress.split('@')[0];
    } else {
      return 'User';
    }
  };

  // Check if a path is active including subpaths
  const isPathActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };
  
  return (
    <motion.aside 
      className={`bg-glass backdrop-blur-xl border-r border-border-primary/30 w-64 transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed h-full z-30 md:relative md:translate-x-0 shadow-2xl`}
      variants={sidebarVariants}
      animate={isOpen ? "open" : "closed"}
      initial="closed"
    >
      <div className="flex flex-col h-full relative">
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-accent-500/5 pointer-events-none" />
        
        {/* Sidebar header */}
        <motion.div 
          className="h-20 px-6 flex items-center border-b border-border-primary/20 bg-glass-dark/50 backdrop-blur-md relative z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center">
            <div className="relative">
              <img src="/astra-logo.svg" alt="Astra Logo" className="h-10 w-10 drop-shadow-lg" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-accent-400 opacity-20 rounded-full blur-sm" />
            </div>
            <span className="ml-3 text-2xl font-bold tracking-tight glow-text font-display">
              Astra
            </span>
          </div>
        </motion.div>
        
        {/* Sidebar content */}
        <div className="flex-1 overflow-y-auto py-8 px-4 space-y-1 relative z-10">
          <motion.ul 
            className="space-y-4"
            initial="closed"
            animate="open"
            variants={{
              open: {
                transition: { staggerChildren: 0.05 }
              }
            }}
          >
            {/* Dashboard link */}
            <motion.li variants={itemVariants}>
              <Link 
                to="/" 
                className={`group flex items-center px-4 py-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isPathActive('/') 
                    ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-text-primary border border-primary-500/30 shadow-neon' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-light/30 hover:border-border-accent/50 border border-transparent'
                }`}
              >
                <FaChartBar className={`mr-3 transition-colors ${isPathActive('/') ? 'text-primary-400' : 'text-text-tertiary group-hover:text-primary-400'}`} />
                <span>Dashboard</span>
                {isPathActive('/') && (
                  <motion.div 
                    className="ml-auto w-2 h-2 bg-primary-400 rounded-full"
                    layoutId="activeIndicator"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  />
                )}
              </Link>
            </motion.li>
            
            {/* Threat Analysis section */}
            <motion.li variants={itemVariants}>
              <button 
                className="group flex items-center justify-between w-full px-4 py-4 text-text-tertiary hover:text-text-primary text-sm font-semibold rounded-xl transition-all duration-300 hover:bg-surface-light/20"
                onClick={() => setThreatSubmenuOpen(!threatSubmenuOpen)}
              >
                <div className="flex items-center">
                  <FaExclamationTriangle className="mr-3 text-warning-400" />
                  <span>Threat Analysis</span>
                </div>
                <motion.div
                  animate={{ rotate: threatSubmenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaChevronDown />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {threatSubmenuOpen && (
                  <motion.ul 
                    className="mt-3 space-y-2 pl-4"
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={{
                      open: { 
                        opacity: 1, 
                        height: 'auto',
                        transition: { staggerChildren: 0.05 }
                      },
                      closed: { 
                        opacity: 0, 
                        height: 0,
                        transition: { staggerChildren: 0.02, staggerDirection: -1 }
                      }
                    }}
                  >
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/" 
                        className={`group flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                          location.pathname === '/' 
                            ? 'bg-primary-500/15 text-primary-300 border-l-2 border-primary-500' 
                            : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-light/20 border-l-2 border-transparent hover:border-primary-500/50'
                        }`}
                      >
                        <FaShieldAlt className={`mr-3 text-xs ${location.pathname === '/' ? 'text-primary-400' : 'text-text-muted group-hover:text-primary-400'}`} />
                        <span>Single Analysis</span>
                      </Link>
                    </motion.li>
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/batch" 
                        className={`group flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                          location.pathname === '/batch' 
                            ? 'bg-primary-500/15 text-primary-300 border-l-2 border-primary-500' 
                            : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-light/20 border-l-2 border-transparent hover:border-primary-500/50'
                        }`}
                      >
                        <FaDatabase className={`mr-3 text-xs ${location.pathname === '/batch' ? 'text-primary-400' : 'text-text-muted group-hover:text-primary-400'}`} />
                        <span>Batch Analysis</span>
                      </Link>
                    </motion.li>
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/threat-map" 
                        className={`group flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                          location.pathname === '/threat-map' 
                            ? 'bg-primary-500/15 text-primary-300 border-l-2 border-primary-500' 
                            : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-light/20 border-l-2 border-transparent hover:border-primary-500/50'
                        }`}
                      >
                        <FaMap className={`mr-3 text-xs ${location.pathname === '/threat-map' ? 'text-primary-400' : 'text-text-muted group-hover:text-primary-400'}`} />
                        <span>Threat Map</span>
                        <span className="ml-auto badge badge-danger animate-pulse-slow">
                          Live
                        </span>
                      </Link>
                    </motion.li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.li>
            
            {/* AI Chat Assistant */}
            <motion.li variants={itemVariants}>
              <Link 
                to="/chat" 
                className={`group flex items-center px-4 py-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isPathActive('/chat') 
                    ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-text-primary border border-primary-500/30 shadow-neon' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-light/30 hover:border-border-accent/50 border border-transparent'
                }`}
              >
                <FaRobot className={`mr-3 transition-colors ${isPathActive('/chat') ? 'text-primary-400' : 'text-text-tertiary group-hover:text-primary-400'}`} />
                <span>AI Chat Assistant</span>
                <span className="ml-auto badge badge-accent">
                  <FaBrain className="mr-1 text-xs" />
                  RAG
                </span>
                {isPathActive('/chat') && (
                  <motion.div 
                    className="ml-auto w-2 h-2 bg-primary-400 rounded-full"
                    layoutId="activeIndicator"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  />
                )}
              </Link>
            </motion.li>
            
            {/* Briefing */}
            <motion.li variants={itemVariants}>
              <Link 
                to="/briefing" 
                className={`group flex items-center px-4 py-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isPathActive('/briefing') 
                    ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-text-primary border border-primary-500/30 shadow-neon' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-light/30 hover:border-border-accent/50 border border-transparent'
                }`}
              >
                <FaFilePowerpoint className={`mr-3 transition-colors ${isPathActive('/briefing') ? 'text-primary-400' : 'text-text-tertiary group-hover:text-primary-400'}`} />
                <span>Briefing</span>
                <span className="ml-auto badge badge-warning">
                  <span className="text-xs">PPT</span>
                </span>
                {isPathActive('/briefing') && (
                  <motion.div 
                    className="ml-auto w-2 h-2 bg-primary-400 rounded-full"
                    layoutId="activeIndicator"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  />
                )}
              </Link>
            </motion.li>
            
            {/* Social Media Analysis section */}
            <motion.li variants={itemVariants}>
              <button 
                className="group flex items-center justify-between w-full px-4 py-4 text-text-tertiary hover:text-text-primary text-sm font-semibold rounded-xl transition-all duration-300 hover:bg-surface-light/20"
                onClick={() => setSocialMediaSubmenuOpen(!socialMediaSubmenuOpen)}
              >
                <div className="flex items-center">
                  <FaTwitter className="mr-3 text-primary-400" />
                  <span>Social Media Analysis</span>
                </div>
                <motion.div
                  animate={{ rotate: socialMediaSubmenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaChevronDown />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {socialMediaSubmenuOpen && (
                  <motion.ul 
                    className="mt-3 space-y-2 pl-4"
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={{
                      open: { 
                        opacity: 1, 
                        height: 'auto',
                        transition: { staggerChildren: 0.05 }
                      },
                      closed: { 
                        opacity: 0, 
                        height: 0,
                        transition: { staggerChildren: 0.02, staggerDirection: -1 }
                      }
                    }}
                  >
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/social-media/search" 
                        className={`group flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                          location.pathname === '/social-media/search' 
                            ? 'bg-primary-500/15 text-primary-300 border-l-2 border-primary-500' 
                            : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-light/20 border-l-2 border-transparent hover:border-primary-500/50'
                        }`}
                      >
                        <FaSearch className={`mr-3 text-xs ${location.pathname === '/social-media/search' ? 'text-primary-400' : 'text-text-muted group-hover:text-primary-400'}`} />
                        <span>Twitter Search</span>
                      </Link>
                    </motion.li>
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/social-media/threats" 
                        className={`group flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                          location.pathname === '/social-media/threats' 
                            ? 'bg-primary-500/15 text-primary-300 border-l-2 border-primary-500' 
                            : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-light/20 border-l-2 border-transparent hover:border-primary-500/50'
                        }`}
                      >
                        <FaExclamationTriangle className={`mr-3 text-xs ${location.pathname === '/social-media/threats' ? 'text-primary-400' : 'text-text-muted group-hover:text-primary-400'}`} />
                        <span>Twitter Threats</span>
                      </Link>
                    </motion.li>
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/social-media/user-analysis" 
                        className={`group flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                          location.pathname === '/social-media/user-analysis' 
                            ? 'bg-primary-500/15 text-primary-300 border-l-2 border-primary-500' 
                            : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-light/20 border-l-2 border-transparent hover:border-primary-500/50'
                        }`}
                      >
                        <FaUser className={`mr-3 text-xs ${location.pathname === '/social-media/user-analysis' ? 'text-primary-400' : 'text-text-muted group-hover:text-primary-400'}`} />
                        <span>User Analysis</span>
                      </Link>
                    </motion.li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.li>
            
            {/* Analysis History link */}
            <motion.li variants={itemVariants}>
              <Link 
                to="/history" 
                className={`group flex items-center px-4 py-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isPathActive('/history') 
                    ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-text-primary border border-primary-500/30 shadow-neon' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-light/30 hover:border-border-accent/50 border border-transparent'
                }`}
              >
                <FaHistory className={`mr-3 transition-colors ${isPathActive('/history') ? 'text-primary-400' : 'text-text-tertiary group-hover:text-primary-400'}`} />
                <span>Analysis History</span>
                {isPathActive('/history') && (
                  <motion.div 
                    className="ml-auto w-2 h-2 bg-primary-400 rounded-full"
                    layoutId="activeIndicator"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  />
                )}
              </Link>
            </motion.li>
            
            {/* FIRs section */}
            <motion.li variants={itemVariants}>
              <button 
                className="group flex items-center justify-between w-full px-4 py-4 text-text-tertiary hover:text-text-primary text-sm font-semibold rounded-xl transition-all duration-300 hover:bg-surface-light/20"
                onClick={() => setFirsSubmenuOpen(!firsSubmenuOpen)}
              >
                <div className="flex items-center">
                  <FaGavel className="mr-3 text-danger-400" />
                  <span>FIRs</span>
                </div>
                <motion.div
                  animate={{ rotate: firsSubmenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaChevronDown />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {firsSubmenuOpen && (
                  <motion.ul 
                    className="mt-3 space-y-2 pl-4"
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={{
                      open: { 
                        opacity: 1, 
                        height: 'auto',
                        transition: { staggerChildren: 0.05 }
                      },
                      closed: { 
                        opacity: 0, 
                        height: 0,
                        transition: { staggerChildren: 0.02, staggerDirection: -1 }
                      }
                    }}
                  >
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/firs" 
                        className={`group flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                          location.pathname === '/firs' 
                            ? 'bg-primary-500/15 text-primary-300 border-l-2 border-primary-500' 
                            : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-light/20 border-l-2 border-transparent hover:border-primary-500/50'
                        }`}
                      >
                        <FaFileAlt className={`mr-3 text-xs ${location.pathname === '/firs' ? 'text-primary-400' : 'text-text-muted group-hover:text-primary-400'}`} />
                        <span>View FIRs</span>
                      </Link>
                    </motion.li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.li>
            
            {/* Legal Analysis section */}
            <motion.li variants={itemVariants}>
              <button 
                className="group flex items-center justify-between w-full px-4 py-4 text-text-tertiary hover:text-text-primary text-sm font-semibold rounded-xl transition-all duration-300 hover:bg-surface-light/20"
                onClick={() => setLegalAnalysisSubmenuOpen(!legalAnalysisSubmenuOpen)}
              >
                <div className="flex items-center">
                  <FaBalanceScale className="mr-3 text-warning-400" />
                  <span>Legal Analysis</span>
                </div>
                <motion.div
                  animate={{ rotate: legalAnalysisSubmenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaChevronDown />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {legalAnalysisSubmenuOpen && (
                  <motion.ul 
                    className="mt-3 space-y-2 pl-4"
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={{
                      open: { 
                        opacity: 1, 
                        height: 'auto',
                        transition: { staggerChildren: 0.05 }
                      },
                      closed: { 
                        opacity: 0, 
                        height: 0,
                        transition: { staggerChildren: 0.02, staggerDirection: -1 }
                      }
                    }}
                  >
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/legal-analysis" 
                        className={`group flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                          location.pathname === '/legal-analysis' 
                            ? 'bg-primary-500/15 text-primary-300 border-l-2 border-primary-500' 
                            : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-light/20 border-l-2 border-transparent hover:border-primary-500/50'
                        }`}
                      >
                        <FaFileAlt className={`mr-3 text-xs ${location.pathname === '/legal-analysis' ? 'text-primary-400' : 'text-text-muted group-hover:text-primary-400'}`} />
                        <span>View Legal Analyses</span>
                      </Link>
                    </motion.li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.li>
            
            {/* Reports section */}
            <motion.li variants={itemVariants}>
              <button 
                className="group flex items-center justify-between w-full px-4 py-4 text-text-tertiary hover:text-text-primary text-sm font-semibold rounded-xl transition-all duration-300 hover:bg-surface-light/20"
                onClick={() => setReportsSubmenuOpen(!reportsSubmenuOpen)}
              >
                <div className="flex items-center">
                  <FaFileAlt className="mr-3 text-accent-400" />
                  <span>Reports</span>
                </div>
                <motion.div
                  animate={{ rotate: reportsSubmenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaChevronDown />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {reportsSubmenuOpen && (
                  <motion.ul 
                    className="mt-3 space-y-2 pl-4"
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={{
                      open: { 
                        opacity: 1, 
                        height: 'auto',
                        transition: { staggerChildren: 0.05 }
                      },
                      closed: { 
                        opacity: 0, 
                        height: 0,
                        transition: { staggerChildren: 0.02, staggerDirection: -1 }
                      }
                    }}
                  >
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/reports/summary" 
                        className={`group flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                          location.pathname === '/reports/summary' 
                            ? 'bg-primary-500/15 text-primary-300 border-l-2 border-primary-500' 
                            : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-light/20 border-l-2 border-transparent hover:border-primary-500/50'
                        }`}
                      >
                        <FaChartPie className={`mr-3 text-xs ${location.pathname === '/reports/summary' ? 'text-primary-400' : 'text-text-muted group-hover:text-primary-400'}`} />
                        <span>Summary Reports</span>
                      </Link>
                    </motion.li>
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/reports/threat" 
                        className={`group flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                          location.pathname === '/reports/threat' 
                            ? 'bg-primary-500/15 text-primary-300 border-l-2 border-primary-500' 
                            : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-light/20 border-l-2 border-transparent hover:border-primary-500/50'
                        }`}
                      >
                        <FaExclamationTriangle className={`mr-3 text-xs ${location.pathname === '/reports/threat' ? 'text-primary-400' : 'text-text-muted group-hover:text-primary-400'}`} />
                        <span>Threat Reports</span>
                      </Link>
                    </motion.li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.li>
            
            {/* Settings link */}
            <motion.li variants={itemVariants}>
              <Link 
                to="/settings" 
                className={`group flex items-center px-4 py-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isPathActive('/settings') 
                    ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-text-primary border border-primary-500/30 shadow-neon' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-light/30 hover:border-border-accent/50 border border-transparent'
                }`}
              >
                <FaCog className={`mr-3 transition-colors ${isPathActive('/settings') ? 'text-primary-400' : 'text-text-tertiary group-hover:text-primary-400'}`} />
                <span>Settings</span>
                {isPathActive('/settings') && (
                  <motion.div 
                    className="ml-auto w-2 h-2 bg-primary-400 rounded-full"
                    layoutId="activeIndicator"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  />
                )}
              </Link>
            </motion.li>
          </motion.ul>
        </div>
        
        {/* Sidebar footer - user profile */}
        {user && (
          <motion.div 
            className="p-6 border-t border-border-primary/20 bg-glass-dark/30 backdrop-blur-md relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center group hover:bg-surface-light/20 p-3 rounded-xl transition-all duration-300">
              <div className="flex-shrink-0 relative">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold border-2 border-primary-500/30 shadow-lg">
                  {getUserInitials()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-500 border-2 border-bg-primary rounded-full status-online" />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{getDisplayName()}</p>
                <p className="text-xs text-text-tertiary truncate">{user.emailAddresses?.[0]?.emailAddress || ''}</p>
              </div>
              <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <FaCog className="text-text-muted text-sm" />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.aside>
  )
}

export default Sidebar 