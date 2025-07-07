import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { motion } from 'framer-motion'
import { FaFilter, FaSearch, FaCalendarAlt } from 'react-icons/fa'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'
import L from 'leaflet'
import { toast } from 'react-toastify'

// Fix the marker icon issue in React Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
})

// Custom marker icons for different threat types
const createCustomIcon = (color) => {
  return new L.Icon({
    iconUrl: `/marker-${color}.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: '/marker-shadow.png',
    shadowSize: [41, 41]
  })
}

const threatIcons = {
  'Direct Violence Threats': createCustomIcon('red'),
  'Criminal Activity': createCustomIcon('purple'),
  'Harassment and Intimidation': createCustomIcon('orange'),
  'Hate Speech/Extremism': createCustomIcon('yellow'),
  'Child Safety Threats': createCustomIcon('black'),
  'default': new L.Icon.Default()
}

const ThreatMap = () => {
  const [mapPosition] = useState([40, 0])
  const [threats, setThreats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter states
  const [timeRange, setTimeRange] = useState(30) // days
  const [selectedThreatTypes, setSelectedThreatTypes] = useState([])
  const [availableThreatTypes, setAvailableThreatTypes] = useState([])
  const [selectedPriorities, setSelectedPriorities] = useState([])

  useEffect(() => {
    const fetchThreatData = async () => {
      setLoading(true)
      try {
        const response = await axios.get('/api/threat-map/data')
        setThreats(response.data)
        
        // Extract available threat types for filtering
        const types = [...new Set(response.data.map(threat => threat.type))]
        setAvailableThreatTypes(types)
        
        setError(null)
      } catch (err) {
        console.error('Error loading threat map data:', err)
        setError('Failed to load threat data')
        toast.error('Failed to load threat map data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchThreatData()
  }, [])
  
  // Apply filters
  const applyFilters = async () => {
    try {
      const filterData = {
        timeRange: timeRange,
        threatTypes: selectedThreatTypes.length > 0 ? selectedThreatTypes : undefined,
        priority: selectedPriorities.length > 0 ? selectedPriorities : undefined
      }
      
      const response = await axios.post('/api/threat-map/filter', filterData)
      setThreats(response.data)
      
      toast.success(`Showing ${response.data.length} threats matching filters`)
    } catch (err) {
      console.error('Error applying filters:', err)
      toast.error('Failed to apply filters')
    }
  }
  
  const handleThreatTypeToggle = (type) => {
    if (selectedThreatTypes.includes(type)) {
      setSelectedThreatTypes(selectedThreatTypes.filter(t => t !== type))
    } else {
      setSelectedThreatTypes([...selectedThreatTypes, type])
    }
  }
  
  const handlePriorityToggle = (priority) => {
    if (selectedPriorities.includes(priority)) {
      setSelectedPriorities(selectedPriorities.filter(p => p !== priority))
    } else {
      setSelectedPriorities([...selectedPriorities, priority])
    }
  }
  
  const clearFilters = () => {
    setTimeRange(30)
    setSelectedThreatTypes([])
    setSelectedPriorities([])
  }
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }
  
  // Get icon for threat based on type
  const getMarkerIcon = (threatType) => {
    return threatIcons[threatType] || threatIcons.default
  }
  
  // Get color for priority badge
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'critical': return 'bg-red-600'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-600'
      default: return 'bg-blue-500'
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">Threat Map</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl">Loading threat data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">Threat Map</h1>
        <div className="bg-red-900/50 p-4 rounded-lg border border-red-800 text-center">
          <p className="text-xl">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-800 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-8">Threat Map</h1>
        
        {/* Filters */}
        <div className="mb-6 bg-slate-800 p-4 rounded-lg">
          <div className="flex items-center mb-3">
            <FaFilter className="mr-2" />
            <h2 className="text-xl font-semibold">Filter Threats</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Time Range</label>
              <div className="flex items-center">
                <FaCalendarAlt className="mr-2 text-blue-400" />
                <select 
                  className="bg-slate-700 rounded-md p-2 w-full"
                  value={timeRange}
                  onChange={e => setTimeRange(parseInt(e.target.value))}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 3 months</option>
                  <option value="180">Last 6 months</option>
                  <option value="365">Last year</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block mb-2 text-sm font-medium">Threat Type</label>
              <div className="flex flex-wrap gap-2">
                {availableThreatTypes.map(type => (
                  <button
                    key={type}
                    className={`text-sm px-2 py-1 rounded-md ${selectedThreatTypes.includes(type) ? 'bg-blue-600' : 'bg-slate-700'}`}
                    onClick={() => handleThreatTypeToggle(type)}
                  >
                    {type.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block mb-2 text-sm font-medium">Priority</label>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`text-sm px-2 py-1 rounded-md ${selectedPriorities.includes('critical') ? 'bg-red-600' : 'bg-slate-700'}`}
                  onClick={() => handlePriorityToggle('critical')}
                >
                  Critical
                </button>
                <button
                  className={`text-sm px-2 py-1 rounded-md ${selectedPriorities.includes('high') ? 'bg-orange-500' : 'bg-slate-700'}`}
                  onClick={() => handlePriorityToggle('high')}
                >
                  High
                </button>
                <button
                  className={`text-sm px-2 py-1 rounded-md ${selectedPriorities.includes('medium') ? 'bg-yellow-500' : 'bg-slate-700'}`}
                  onClick={() => handlePriorityToggle('medium')}
                >
                  Medium
                </button>
                <button
                  className={`text-sm px-2 py-1 rounded-md ${selectedPriorities.includes('low') ? 'bg-green-600' : 'bg-slate-700'}`}
                  onClick={() => handlePriorityToggle('low')}
                >
                  Low
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md mr-2"
              onClick={clearFilters}
            >
              Clear
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded-md"
              onClick={applyFilters}
            >
              Apply Filters
            </button>
          </div>
        </div>
        
        {/* Map */}
        <div className="w-full h-[70vh] rounded-xl overflow-hidden border border-slate-700 shadow-lg">
          {threats.length === 0 ? (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <p className="text-xl">No threat data matches the selected filters</p>
            </div>
          ) : (
            <MapContainer
              center={mapPosition}
              zoom={3}
              style={{ height: '700px', width: '100%' }}
              className="rounded-lg"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {threats && threats.filter(threat => threat.lat && threat.lng).map((threat) => (
                <Marker 
                  key={threat.id} 
                  position={[threat.lat, threat.lng]}
                  icon={getMarkerIcon(threat.type)}
                >
                  <Popup>
                    <div className="p-1 max-w-xs">
                      <h3 className="font-bold text-lg mb-2">{threat.title}</h3>
                      
                      <div className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mb-2 ${getPriorityColor(threat.priority)}`}>
                        {threat.priority?.toUpperCase()} PRIORITY
                      </div>

                      <p className="text-sm mb-1">
                        <span className="font-semibold">Type:</span> {threat.type}
                      </p>
                      <p className="text-sm mb-1">
                        <span className="font-semibold">Date:</span> {formatDate(threat.date)}
                      </p>
                      <p className="text-sm mb-1">
                        <span className="font-semibold">Location:</span> {threat.location}
                      </p>
                       {threat.twitter_metadata?.username && (
                        <p className="text-sm mb-1">
                          <span className="font-semibold">User:</span>
                          <a 
                            href={`https://twitter.com/${threat.twitter_metadata.username}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline ml-1"
                          >
                            @{threat.twitter_metadata.username}
                          </a>
                        </p>
                      )}
                      <p className="text-sm text-gray-200 mt-2 p-2 bg-slate-700 rounded">
                        "{threat.details}"
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
        
        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Total Threats</h3>
            <p className="text-2xl font-bold">{threats.length}</p>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">High Priority</h3>
            <p className="text-2xl font-bold text-orange-400">
              {threats.filter(t => t.priority === 'critical' || t.priority === 'high').length}
            </p>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Most Common Type</h3>
            <p className="text-2xl font-bold text-blue-400">
              {availableThreatTypes.length > 0 ? 
                availableThreatTypes.reduce((a, b) => 
                  threats.filter(t => t.type === a).length > 
                  threats.filter(t => t.type === b).length ? a : b
                ).split(' ')[0] : 'None'}
            </p>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Active Regions</h3>
            <p className="text-2xl font-bold text-green-400">
              {[...new Set(threats.map(t => t.location))].length}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default ThreatMap 