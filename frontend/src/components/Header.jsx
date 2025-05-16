import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaShieldAlt, FaBell, FaUserCircle, FaLock, FaCog, FaDatabase, FaChartBar, FaHeadset } from 'react-icons/fa'

const Header = ({ apiStatus }) => {
  const location = useLocation()
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

  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex justify-between items-center">
          {/* Logo and title */}
          <div className="flex items-center">
            <div className="flex items-center flex-shrink-0 text-white mr-8">
              <FaShieldAlt className="h-8 w-8 text-blue-400" />
              <span className="ml-2 text-xl font-bold tracking-tight">
                ThreatShield <span className="text-blue-400">Pro</span>
              </span>
              <div className="ml-3 rounded-md border border-slate-600 px-2 py-1 text-xs bg-slate-700">
                <span className="text-slate-300">v1.2.0</span>
              </div>
            </div>
            
            {/* Navigation */}
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
            <div className="hidden md:flex items-center mr-4 px-3 py-1 rounded-md bg-slate-700 border border-slate-600">
              <div className={`w-2 h-2 rounded-full ${getApiStatusClass()} mr-2`}></div>
              <span className="text-xs font-medium text-slate-300">{getApiStatusText()}</span>
            </div>
            
            {/* Notifications */}
            <div className="relative ml-3">
              <button 
                className="p-1 rounded-full text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white relative"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <FaBell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {notificationsOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-96 rounded-md shadow-lg py-1 bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-slate-700">
                  <div className="px-4 py-2 border-b border-slate-700">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-white">Notifications</h3>
                      <button className="text-xs text-blue-400 hover:text-blue-300">Mark all as read</button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(notification => (
                      <div key={notification.id} className="px-4 py-3 hover:bg-slate-700 border-b border-slate-700 last:border-0">
                        <div className="flex items-start">
                          <div className={`flex-shrink-0 rounded-full h-8 w-8 flex items-center justify-center ${notification.type === 'alert' ? 'bg-red-900 text-red-200' : notification.type === 'system' ? 'bg-blue-900 text-blue-200' : 'bg-amber-900 text-amber-200'}`}>
                            {notification.type === 'alert' ? <FaLock className="h-4 w-4" /> : notification.type === 'system' ? <FaCog className="h-4 w-4" /> : <FaHeadset className="h-4 w-4" />}
                          </div>
                          <div className="ml-3 w-0 flex-1">
                            <p className="text-sm font-medium text-white">{notification.message}</p>
                            <p className="mt-1 text-xs text-slate-400">{notification.time}</p>
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
              <button 
                className="bg-slate-700 flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white border border-slate-500">
                  <FaUserCircle className="h-6 w-6" />
                </div>
              </button>
              
              {userMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-slate-700">
                  <div className="px-4 py-3 border-b border-slate-700">
                    <div className="text-sm font-medium text-white">Agent J. Smith</div>
                    <div className="text-xs text-slate-400">Security Analyst</div>
                  </div>
                  <a href="#profile" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Your Profile</a>
                  <a href="#settings" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Settings</a>
                  <a href="#sign-out" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Sign out</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header 