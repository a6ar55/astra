import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  FaChartBar, 
  FaDatabase, 
  FaHistory, 
  FaCog, 
  FaFolderOpen, 
  FaMap, 
  FaShieldAlt, 
  FaLock, 
  FaExclamationTriangle, 
  FaUserShield, 
  FaFileAlt, 
  FaChevronDown,
  FaChevronUp,
  FaChartPie,
  FaCrosshairs,
  FaUser,
  FaTwitter,
  FaSearch,
  FaRobot,
  FaBrain
} from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '@clerk/clerk-react'

const Sidebar = ({ isOpen }) => {
  const location = useLocation()
  const { user } = useUser()
  const [threatSubmenuOpen, setThreatSubmenuOpen] = useState(true)
  const [toolsSubmenuOpen, setToolsSubmenuOpen] = useState(false)
  const [reportsSubmenuOpen, setReportsSubmenuOpen] = useState(false)
  const [socialMediaSubmenuOpen, setSocialMediaSubmenuOpen] = useState(false)
  
  // Animation variants
  const itemVariants = {
    open: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    closed: { opacity: 0, y: 20, transition: { duration: 0.2 } }
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
  
  return (
    <aside 
      className={`bg-slate-800 border-r border-slate-700 w-64 transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed h-full z-30 md:relative md:translate-x-0`}
    >
      <div className="flex flex-col h-full">
        {/* Sidebar header */}
        <div className="h-16 px-4 flex items-center border-b border-slate-700">
          <div className="flex items-center">
            <img src="/astra-logo.svg" alt="Astra Logo" className="h-8 w-8" />
            <span className="ml-2 text-2xl font-extrabold tracking-tight text-blue-400">
              Astra
            </span>
          </div>
        </div>
        
        {/* Sidebar content */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {/* Dashboard link */}
            <li>
              <Link 
                to="/" 
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                <FaChartBar className="mr-3 text-slate-400" />
                <span>Dashboard</span>
              </Link>
            </li>
            
            {/* Threat Analysis section */}
            <li className="mt-4">
              <button 
                className="flex items-center justify-between w-full px-3 py-2 text-slate-400 hover:text-white text-sm font-medium rounded-md"
                onClick={() => setThreatSubmenuOpen(!threatSubmenuOpen)}
              >
                <div className="flex items-center">
                  <FaExclamationTriangle className="mr-3" />
                  <span>Threat Analysis</span>
                </div>
                {threatSubmenuOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              
              <AnimatePresence>
                {threatSubmenuOpen && (
                  <motion.ul 
                    className="mt-1 space-y-1 pl-6"
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={{
                      open: { opacity: 1, height: 'auto' },
                      closed: { opacity: 0, height: 0 }
                    }}
                  >
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/" 
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                      >
                        <FaShieldAlt className="mr-3 text-slate-400" />
                        <span>Single Analysis</span>
                      </Link>
                    </motion.li>
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/batch" 
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/batch' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                      >
                        <FaDatabase className="mr-3 text-slate-400" />
                        <span>Batch Analysis</span>
                      </Link>
                    </motion.li>
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/threat-map" 
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/threat-map' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                      >
                        <FaMap className="mr-3 text-slate-400" />
                        <span>Threat Map</span>
                        <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs leading-none text-red-100 bg-red-800 rounded-full">
                          Live
                        </span>
                      </Link>
                    </motion.li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
            
            {/* Case Management link */}
            <li className="mt-1">
              <Link 
                to="/cases" 
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/cases' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                <FaFolderOpen className="mr-3 text-slate-400" />
                <span>Case Management</span>
              </Link>
            </li>
            
            {/* AI Chat Assistant */}
            <li className="mt-1">
              <Link 
                to="/chat" 
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/chat' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                <FaRobot className="mr-3 text-slate-400" />
                <span>AI Chat Assistant</span>
                <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs leading-none text-blue-100 bg-blue-800 rounded-full">
                  <FaBrain className="mr-1 text-xs" />
                  RAG
                </span>
              </Link>
            </li>
            
            {/* Social Media Analysis section */}
            <li className="mt-1">
              <button 
                className="flex items-center justify-between w-full px-3 py-2 text-slate-400 hover:text-white text-sm font-medium rounded-md"
                onClick={() => setSocialMediaSubmenuOpen(!socialMediaSubmenuOpen)}
              >
                <div className="flex items-center">
                  <FaTwitter className="mr-3" />
                  <span>Social Media Analysis</span>
                </div>
                {socialMediaSubmenuOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              
              <AnimatePresence>
                {socialMediaSubmenuOpen && (
                  <motion.ul 
                    className="mt-1 space-y-1 pl-6"
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={{
                      open: { opacity: 1, height: 'auto' },
                      closed: { opacity: 0, height: 0 }
                    }}
                  >
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/social-media/search" 
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/social-media/search' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                      >
                        <FaSearch className="mr-3 text-slate-400" />
                        <span>Twitter Search</span>
                      </Link>
                    </motion.li>
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/social-media/threats" 
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/social-media/threats' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                      >
                        <FaExclamationTriangle className="mr-3 text-slate-400" />
                        <span>Twitter Threats</span>
                      </Link>
                    </motion.li>
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/social-media/user-analysis" 
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/social-media/user-analysis' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                      >
                        <FaUser className="mr-3 text-slate-400" />
                        <span>Twitter User Analysis</span>
                      </Link>
                    </motion.li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
            
            {/* Analysis History link */}
            <li>
              <Link 
                to="/history" 
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/history' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                <FaHistory className="mr-3 text-slate-400" />
                <span>Analysis History</span>
              </Link>
            </li>
            
            {/* Tools section */}
            <li className="mt-4">
              <button 
                className="flex items-center justify-between w-full px-3 py-2 text-slate-400 hover:text-white text-sm font-medium rounded-md"
                onClick={() => setToolsSubmenuOpen(!toolsSubmenuOpen)}
              >
                <div className="flex items-center">
                  <FaUserShield className="mr-3" />
                  <span>Security Tools</span>
                </div>
                {toolsSubmenuOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              
              <AnimatePresence>
                {toolsSubmenuOpen && (
                  <motion.ul 
                    className="mt-1 space-y-1 pl-6"
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={{
                      open: { opacity: 1, height: 'auto' },
                      closed: { opacity: 0, height: 0 }
                    }}
                  >
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/tools/scanner" 
                        className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <FaCrosshairs className="mr-3 text-slate-400" />
                        <span>Threat Scanner</span>
                      </Link>
                    </motion.li>
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/tools/monitor" 
                        className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <FaLock className="mr-3 text-slate-400" />
                        <span>Content Monitor</span>
                      </Link>
                    </motion.li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
            
            {/* Reports section */}
            <li className="mt-1">
              <button 
                className="flex items-center justify-between w-full px-3 py-2 text-slate-400 hover:text-white text-sm font-medium rounded-md"
                onClick={() => setReportsSubmenuOpen(!reportsSubmenuOpen)}
              >
                <div className="flex items-center">
                  <FaFileAlt className="mr-3" />
                  <span>Reports</span>
                </div>
                {reportsSubmenuOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              
              <AnimatePresence>
                {reportsSubmenuOpen && (
                  <motion.ul 
                    className="mt-1 space-y-1 pl-6"
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={{
                      open: { opacity: 1, height: 'auto' },
                      closed: { opacity: 0, height: 0 }
                    }}
                  >
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/reports/summary" 
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/reports/summary' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                      >
                        <FaChartPie className="mr-3 text-slate-400" />
                        <span>Summary Reports</span>
                      </Link>
                    </motion.li>
                    <motion.li variants={itemVariants}>
                      <Link 
                        to="/reports/threat" 
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/reports/threat' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                      >
                        <FaExclamationTriangle className="mr-3 text-slate-400" />
                        <span>Threat Reports</span>
                      </Link>
                    </motion.li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
            
            {/* Settings link */}
            <li className="mt-1">
              <Link 
                to="/settings" 
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/settings' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                <FaCog className="mr-3 text-slate-400" />
                <span>Settings</span>
              </Link>
            </li>
          </ul>
        </div>
        
        {/* Sidebar footer - user profile */}
        {user && (
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white border border-slate-500">
                  {getUserInitials()}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{getDisplayName()}</p>
                <p className="text-xs text-slate-400">{user.emailAddresses?.[0]?.emailAddress || ''}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar 