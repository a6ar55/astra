import { useState } from 'react'
import { FaCog, FaLock, FaDatabase, FaServer, FaUserShield, FaShieldAlt, FaBell, FaKey } from 'react-icons/fa'
import { motion } from 'framer-motion'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general')
  
  // Sample settings (would be loaded from API/state management in real app)
  const [settings, setSettings] = useState({
    general: {
      darkMode: true,
      autoRefresh: true,
      refreshInterval: 60,
      defaultPage: 'dashboard'
    },
    api: {
      endpoint: 'http://localhost:8000',
      timeout: 30,
      retries: 3
    },
    security: {
      twoFactorAuth: true,
      sessionTimeout: 30,
      ipWhitelist: '',
      restrictedAccess: true
    },
    notifications: {
      emailAlerts: true,
      criticalThreatsOnly: false,
      dailySummary: true,
      webPushEnabled: false
    }
  })
  
  // Handle settings change
  const handleSettingChange = (section, key, value) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    })
  }
  
  // Mock save settings
  const saveSettings = () => {
    // Would send to backend API in real app
    alert('Settings saved successfully')
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-white mb-2">System Settings</h1>
        <p className="text-slate-400 max-w-3xl">
          Configure system preferences, API connections, and security settings for the threat detection platform.
        </p>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings navigation */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-lg font-medium text-white">Configuration</h2>
            </div>
            <div className="p-2">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'general' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                >
                  <FaCog className="mr-3 text-slate-400" />
                  <span>General Settings</span>
                </button>
                <button
                  onClick={() => setActiveTab('api')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'api' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                >
                  <FaServer className="mr-3 text-slate-400" />
                  <span>API Configuration</span>
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'security' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                >
                  <FaLock className="mr-3 text-slate-400" />
                  <span>Security Settings</span>
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'notifications' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                >
                  <FaBell className="mr-3 text-slate-400" />
                  <span>Notifications</span>
                </button>
                <button
                  onClick={() => setActiveTab('data')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'data' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                >
                  <FaDatabase className="mr-3 text-slate-400" />
                  <span>Data Management</span>
                </button>
                <button
                  onClick={() => setActiveTab('access')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'access' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                >
                  <FaUserShield className="mr-3 text-slate-400" />
                  <span>Access Control</span>
                </button>
              </nav>
            </div>
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center">
                <FaShieldAlt className="text-blue-400 mr-2" />
                <span className="text-xs text-slate-400">Settings are encrypted and secure</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Settings form */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-xl font-medium text-white">
                {activeTab === 'general' && 'General Settings'}
                {activeTab === 'api' && 'API Configuration'}
                {activeTab === 'security' && 'Security Settings'}
                {activeTab === 'notifications' && 'Notification Settings'}
                {activeTab === 'data' && 'Data Management'}
                {activeTab === 'access' && 'Access Control'}
              </h2>
            </div>
            
            <div className="p-6">
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Interface Theme</label>
                      <select
                        className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={settings.general.darkMode ? 'dark' : 'light'}
                        onChange={(e) => handleSettingChange('general', 'darkMode', e.target.value === 'dark')}
                      >
                        <option value="dark">Dark Mode (Law Enforcement)</option>
                        <option value="light">Light Mode (Standard)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Default Landing Page</label>
                      <select
                        className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={settings.general.defaultPage}
                        onChange={(e) => handleSettingChange('general', 'defaultPage', e.target.value)}
                      >
                        <option value="dashboard">Dashboard</option>
        
                        <option value="threat-map">Threat Map</option>
                        <option value="batch">Batch Analysis</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoRefresh"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-700"
                      checked={settings.general.autoRefresh}
                      onChange={(e) => handleSettingChange('general', 'autoRefresh', e.target.checked)}
                    />
                    <label htmlFor="autoRefresh" className="ml-2 block text-sm text-slate-300">
                      Enable automatic data refresh
                    </label>
                  </div>
                  
                  {settings.general.autoRefresh && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Refresh Interval (seconds)
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="300"
                        className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={settings.general.refreshInterval}
                        onChange={(e) => handleSettingChange('general', 'refreshInterval', parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* API Settings */}
              {activeTab === 'api' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">API Endpoint URL</label>
                    <input
                      type="text"
                      className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={settings.api.endpoint}
                      onChange={(e) => handleSettingChange('api', 'endpoint', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Request Timeout (seconds)</label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={settings.api.timeout}
                        onChange={(e) => handleSettingChange('api', 'timeout', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Connection Retries</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={settings.api.retries}
                        onChange={(e) => handleSettingChange('api', 'retries', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-900/20 border border-blue-800/50 rounded-md p-4 text-sm text-blue-300">
                    <div className="flex items-center mb-2">
                      <FaKey className="mr-2" />
                      <span className="font-medium">API Authentication</span>
                    </div>
                    <p>API keys and authentication credentials are managed through your organization's secure credential store.</p>
                  </div>
                </div>
              )}
              
              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="twoFactorAuth"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-700"
                        checked={settings.security.twoFactorAuth}
                        onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                      />
                      <label htmlFor="twoFactorAuth" className="ml-2 block text-sm text-slate-300">
                        Enable Two-Factor Authentication
                      </label>
                    </div>
                    <div className="bg-green-900 text-green-300 px-2 py-1 rounded text-xs font-medium">
                      Recommended
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="240"
                      className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    />
                    <p className="mt-1 text-xs text-slate-400">Set to 0 for no timeout (not recommended)</p>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="restrictedAccess"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-700"
                      checked={settings.security.restrictedAccess}
                      onChange={(e) => handleSettingChange('security', 'restrictedAccess', e.target.checked)}
                    />
                    <label htmlFor="restrictedAccess" className="ml-2 block text-sm text-slate-300">
                      Enable Role-Based Access Control
                    </label>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailAlerts"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-700"
                      checked={settings.notifications.emailAlerts}
                      onChange={(e) => handleSettingChange('notifications', 'emailAlerts', e.target.checked)}
                    />
                    <label htmlFor="emailAlerts" className="ml-2 block text-sm text-slate-300">
                      Enable email alerts for critical threats
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="criticalThreatsOnly"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-700"
                      checked={settings.notifications.criticalThreatsOnly}
                      onChange={(e) => handleSettingChange('notifications', 'criticalThreatsOnly', e.target.checked)}
                    />
                    <label htmlFor="criticalThreatsOnly" className="ml-2 block text-sm text-slate-300">
                      Only notify for critical and high severity threats
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="dailySummary"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-700"
                      checked={settings.notifications.dailySummary}
                      onChange={(e) => handleSettingChange('notifications', 'dailySummary', e.target.checked)}
                    />
                    <label htmlFor="dailySummary" className="ml-2 block text-sm text-slate-300">
                      Receive daily threat summary report
                    </label>
                  </div>
                </div>
              )}
              
              {/* Show placeholder for other tabs */}
              {(activeTab === 'data' || activeTab === 'access') && (
                <div className="text-center py-6">
                  <FaLock className="mx-auto h-12 w-12 text-slate-500 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Restricted Settings</h3>
                  <p className="text-slate-400 max-w-md mx-auto">
                    These settings require administrator privileges to modify. Please contact your system administrator.
                  </p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-700 flex justify-end">
              <button 
                onClick={saveSettings}
                className="btn btn-primary px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings 