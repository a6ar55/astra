import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaShieldAlt, FaBell, FaUserCircle, FaLock, FaCog, FaDatabase, FaChartBar, FaHeadset, FaFilePowerpoint } from 'react-icons/fa'
import { UserButton, useUser } from '@clerk/clerk-react'

const Header = ({ apiStatus, toggleSidebar }) => {
  const location = useLocation()
  const { user } = useUser()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifications] = useState([
    { id: 1, type: 'alert', message: 'New high-severity threat detected', time: '2 minutes ago' },
    { id: 2, type: 'system', message: 'System update scheduled for tonight', time: '1 hour ago' },
    { id: 3, type: 'case', message: 'Case #2845 updated with new evidence', time: '3 hours ago' }
  ])

  const getApiStatusClass = () => {
    switch (apiStatus) {
      case 'online':
        return 'bg-emerald-500'
      case 'error':
        return 'bg-red-500'
      case 'loading':
        return 'bg-amber-500 animate-pulse'
      default:
        return 'bg-slate-500'
    }
  }
  
  const getApiStatusText = () => {
    switch (apiStatus) {
      case 'online':
        return 'API Connected'
      case 'error':
        return 'API Error'
      case 'loading':
        return 'Connecting...'
      default:
        return 'Unknown'
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

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo, links */}
          <div className="flex items-center">
            <button 
              className="mr-4 text-slate-400 hover:text-white md:hidden"
              onClick={toggleSidebar}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex items-center flex-shrink-0 text-white mr-8">
              <img src="/astra-logo.svg" alt="Astra Logo" className="h-8 w-8" />
              <span className="ml-2 text-2xl font-extrabold tracking-tight text-blue-400">
                Astra
              </span>
              <div className="ml-3 rounded-md border border-slate-600 px-2 py-1 text-xs bg-slate-700">
                <span className="text-slate-300">v1.2.0</span>
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-1">
              <Link to="/" className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                <span className="flex items-center">
                  <FaChartBar className="mr-1.5" /> Dashboard
                </span>
              </Link>
              <Link to="/batch" className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/batch' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                <span className="flex items-center">
                  <FaDatabase className="mr-1.5" /> Batch Analysis
                </span>
              </Link>
              <Link to="/briefing" className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/briefing' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                <span className="flex items-center">
                  <FaFilePowerpoint className="mr-1.5" /> Briefing
                </span>
              </Link>
              <Link to="/history" className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/history' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                <span className="flex items-center">
                  <FaChartBar className="mr-1.5" /> History
                </span>
              </Link>
              <Link to="/settings" className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/settings' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                <span className="flex items-center">
                  <FaCog className="mr-1.5" /> Settings
                </span>
              </Link>
            </nav>
          </div>
          
          {/* API status, user menu, and notifications */}
          <div className="flex items-center">
            {/* API Status */}
            <div className="hidden md:flex items-center mr-4">
              <div className={`h-2 w-2 rounded-full ${getApiStatusClass()} mr-2`}></div>
              <span className="text-xs text-slate-300">{getApiStatusText()}</span>
            </div>
            
            {/* Notifications */}
            <div className="relative mr-3">
              <button 
                className="p-1 rounded-full text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <span className="sr-only">View notifications</span>
                <FaBell className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
              </button>
              
              {notificationsOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg py-1 bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-slate-700">
                  <div className="px-4 py-2 border-b border-slate-700 text-white font-medium">
                    Notifications
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className="px-4 py-2 hover:bg-slate-700 border-b border-slate-700 last:border-none"
                      >
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              notification.type === 'alert' ? 'bg-red-500/20 text-red-400' :
                              notification.type === 'system' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {notification.type === 'alert' && <FaExclamationTriangle />}
                              {notification.type === 'system' && <FaShieldAlt />}
                              {notification.type === 'case' && <FaHeadset />}
                            </div>
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="text-sm text-white">{notification.message}</p>
                            <p className="text-xs text-slate-400">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-700">
                    <button className="text-xs text-blue-400 hover:text-blue-300 w-full text-center">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* User Menu */}
            <div className="relative ml-3">
              {user ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
              <button 
                className="bg-slate-700 flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white border border-slate-500">
                  <FaUserCircle className="h-6 w-6" />
                </div>
              </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header 