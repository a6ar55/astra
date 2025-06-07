import { useState, useEffect } from 'react'
import axios from 'axios'
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'
import { RiAddLine, RiCloseLine } from 'react-icons/ri'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'

const CaseManagement = () => {
  const [cases, setCases] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortField, setSortField] = useState('updatedDate')
  const [sortDirection, setSortDirection] = useState('desc')
  const [selectedCase, setSelectedCase] = useState(null)
  const [caseEvents, setCaseEvents] = useState([])
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [newEventText, setNewEventText] = useState('')
  const [isCreatingCase, setIsCreatingCase] = useState(false)
  const [newCase, setNewCase] = useState({
    title: '',
    summary: '',
    threatType: 'Hate Speech/Extremism',
    target: 'Individual',
    status: 'medium',
    source: 'Social Media',
    location: '',
  })
  
  // Fetch all cases on component mount
  useEffect(() => {
    const fetchCases = async () => {
      setIsLoading(true)
      try {
        const response = await axios.get('/api/cases')
        setCases(response.data)
        setError(null)
      } catch (err) {
        console.error('Error fetching cases:', err)
        setError('Failed to load cases. Please try again.')
        toast.error('Failed to load cases')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCases()
  }, [])
  
  // Fetch case events when a case is selected
  useEffect(() => {
    if (selectedCase) {
      const fetchCaseEvents = async () => {
        try {
          const response = await axios.get(`/api/cases/${selectedCase.id}/events`)
          setCaseEvents(response.data)
        } catch (err) {
          console.error('Error fetching case events:', err)
          toast.error('Failed to load case events')
        }
      }
      
      fetchCaseEvents()
    } else {
      setCaseEvents([])
    }
  }, [selectedCase])
  
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }
  
  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="ml-1" />
    return sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
  }
  
  const sortedCases = [...cases].sort((a, b) => {
    let aValue = a[sortField]
    let bValue = b[sortField]
    
    // Handle dates properly
    if (sortField === 'createdDate' || sortField === 'updatedDate') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }
    
    // Handle status sorting by priority
    if (sortField === 'status') {
      const priorityMap = { critical: 3, high: 2, medium: 1, low: 0 }
      aValue = priorityMap[aValue] || 0
      bValue = priorityMap[bValue] || 0
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })
  
  const handleSelectCase = async (caseItem) => {
    setSelectedCase(caseItem)
  }
  
  const handleCloseCase = () => {
    setSelectedCase(null)
    setCaseEvents([])
  }
  
  const handleAddEvent = async () => {
    if (!newEventText.trim()) return
    
    try {
      const response = await axios.post(`/api/cases/${selectedCase.id}/events`, {
        caseId: selectedCase.id,
        text: newEventText,
        user: 'Current User'
      })
      
      // Update events list
      setCaseEvents([response.data, ...caseEvents])
      
      // Reset form
      setNewEventText('')
      setIsAddingEvent(false)
      
      toast.success('Event added successfully')
    } catch (err) {
      console.error('Error adding event:', err)
      toast.error('Failed to add event')
    }
  }
  
  const handleStatusChange = async (status) => {
    try {
      const response = await axios.put(`/api/cases/${selectedCase.id}`, {
        status
      })
      
      // Update selected case and cases list
      setSelectedCase(response.data)
      setCases(cases.map(c => c.id === selectedCase.id ? response.data : c))
      
      toast.success('Case status updated')
    } catch (err) {
      console.error('Error updating case status:', err)
      toast.error('Failed to update case status')
    }
  }
  
  const handleCreateCase = async () => {
    try {
      // Validate inputs
      if (!newCase.title.trim() || !newCase.summary.trim() || !newCase.location.trim()) {
        toast.error('Please fill in all required fields')
        return
      }
      
      const response = await axios.post('/api/cases', newCase)
      
      // Add to cases list
      setCases([response.data, ...cases])
      
      // Reset form and close modal
      setNewCase({
        title: '',
        summary: '',
        threatType: 'Hate Speech/Extremism',
        target: 'Individual',
        status: 'medium',
        source: 'Social Media',
        location: '',
      })
      setIsCreatingCase(false)
      
      toast.success('Case created successfully')
    } catch (err) {
      console.error('Error creating case:', err)
      toast.error('Failed to create case')
    }
  }
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'bg-red-600'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-600'
      default: return 'bg-blue-500'
    }
  }
  
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }
  
  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="flex justify-between mb-8">
          <h1 className="text-3xl font-bold">Case Management</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl">Loading cases...</div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="flex justify-between mb-8">
          <h1 className="text-3xl font-bold">Case Management</h1>
        </div>
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
      {/* Header */}
      <div className="flex justify-between mb-8">
        <h1 className="text-3xl font-bold">Case Management</h1>
        <button 
          className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-2 rounded-md flex items-center"
          onClick={() => setIsCreatingCase(true)}
        >
          <RiAddLine className="mr-2" /> Create Case
        </button>
      </div>
      
      {/* Create Case Modal */}
      {isCreatingCase && (
        <motion.div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="bg-slate-800 rounded-lg p-8 max-w-2xl w-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create New Case</h2>
              <button 
                className="text-gray-400 hover:text-white"
                onClick={() => setIsCreatingCase(false)}
              >
                <RiCloseLine size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-1">Title*</label>
                <input 
                  type="text"
                  value={newCase.title}
                  onChange={e => setNewCase({...newCase, title: e.target.value})}
                  className="w-full bg-slate-700 rounded-md px-4 py-2"
                  placeholder="Case title"
                />
              </div>
              
              <div>
                <label className="block mb-1">Summary*</label>
                <textarea 
                  value={newCase.summary}
                  onChange={e => setNewCase({...newCase, summary: e.target.value})}
                  className="w-full bg-slate-700 rounded-md px-4 py-2 min-h-[100px]"
                  placeholder="Case description"
                ></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Threat Type</label>
                  <select 
                    value={newCase.threatType}
                    onChange={e => setNewCase({...newCase, threatType: e.target.value})}
                    className="w-full bg-slate-700 rounded-md px-4 py-2"
                  >
                    <option value="Direct Violence Threats">Direct Violence Threats</option>
                    <option value="Criminal Activity">Criminal Activity</option>
                    <option value="Harassment and Intimidation">Harassment and Intimidation</option>
                    <option value="Hate Speech/Extremism">Hate Speech/Extremism</option>
                    <option value="Child Safety Threats">Child Safety Threats</option>
                  </select>
                </div>
                
                <div>
                  <label className="block mb-1">Target</label>
                  <select 
                    value={newCase.target}
                    onChange={e => setNewCase({...newCase, target: e.target.value})}
                    className="w-full bg-slate-700 rounded-md px-4 py-2"
                  >
                    <option value="Individual">Individual</option>
                    <option value="Organization">Organization</option>
                    <option value="Public">Public</option>
                    <option value="Government">Government</option>
                    <option value="Religious community">Religious community</option>
                  </select>
                </div>
                
                <div>
                  <label className="block mb-1">Severity</label>
                  <select 
                    value={newCase.status}
                    onChange={e => setNewCase({...newCase, status: e.target.value})}
                    className="w-full bg-slate-700 rounded-md px-4 py-2"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                
                <div>
                  <label className="block mb-1">Source</label>
                  <select 
                    value={newCase.source}
                    onChange={e => setNewCase({...newCase, source: e.target.value})}
                    className="w-full bg-slate-700 rounded-md px-4 py-2"
                  >
                    <option value="Social Media">Social Media</option>
                    <option value="Email">Email</option>
                    <option value="Web forum">Web forum</option>
                    <option value="Dark web">Dark web</option>
                    <option value="Public report">Public report</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block mb-1">Location*</label>
                <input 
                  type="text"
                  value={newCase.location}
                  onChange={e => setNewCase({...newCase, location: e.target.value})}
                  className="w-full bg-slate-700 rounded-md px-4 py-2"
                  placeholder="City, Country"
                />
              </div>
            </div>
            
            <div className="mt-8 flex justify-end space-x-4">
              <button 
                className="px-4 py-2 bg-slate-600 rounded-md"
                onClick={() => setIsCreatingCase(false)}
              >
                Cancel
              </button>
              <button 
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-800 rounded-md"
                onClick={handleCreateCase}
              >
                Create Case
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Case list */}
        <div className={`bg-slate-800 rounded-lg p-6 overflow-auto ${selectedCase ? 'xl:col-span-7' : 'xl:col-span-12'}`}>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Active Cases ({cases.length})</h2>
            <div className="flex space-x-2">
              {/* Add filters here if needed */}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {cases.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No cases found</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="border-b border-slate-600">
                  <tr>
                    <th className="pb-3 font-semibold cursor-pointer" onClick={() => handleSort('status')}>
                      <div className="flex items-center">
                        Status {getSortIcon('status')}
                      </div>
                    </th>
                    <th className="pb-3 font-semibold cursor-pointer" onClick={() => handleSort('title')}>
                      <div className="flex items-center">
                        Title {getSortIcon('title')}
                      </div>
                    </th>
                    <th className="pb-3 font-semibold cursor-pointer" onClick={() => handleSort('updatedDate')}>
                      <div className="flex items-center">
                        Last Update {getSortIcon('updatedDate')}
                      </div>
                    </th>
                    <th className="pb-3 font-semibold cursor-pointer" onClick={() => handleSort('assignedTo')}>
                      <div className="flex items-center">
                        Assigned To {getSortIcon('assignedTo')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCases.map(caseItem => (
                    <tr 
                      key={caseItem.id} 
                      className={`border-b border-slate-700 cursor-pointer hover:bg-slate-700/50 ${selectedCase?.id === caseItem.id ? 'bg-slate-700/50' : ''}`}
                      onClick={() => handleSelectCase(caseItem)}
                    >
                      <td className="py-3">
                        <div className={`${getStatusColor(caseItem.status)} rounded-full px-3 py-1 text-sm inline-block`}>
                          {caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{caseItem.title}</div>
                        <div className="text-sm text-gray-400">{caseItem.id}</div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{formatDate(caseItem.updatedDate)}</div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{caseItem.assignedTo}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        
        {/* Case details */}
        {selectedCase && (
          <div className="bg-slate-800 rounded-lg p-6 flex flex-col xl:col-span-5">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-semibold">{selectedCase.title}</h2>
              <button 
                className="text-gray-400 hover:text-white"
                onClick={handleCloseCase}
              >
                <RiCloseLine size={20} />
              </button>
            </div>
            
            <div className="flex space-x-2 my-3">
              <div className={`${getStatusColor(selectedCase.status)} rounded-full px-3 py-1 text-sm`}>
                {selectedCase.status.charAt(0).toUpperCase() + selectedCase.status.slice(1)}
              </div>
              <div className="bg-slate-700 rounded-full px-3 py-1 text-sm">
                {selectedCase.threatType}
              </div>
            </div>
            
            <div className="bg-slate-700/50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-gray-300">{selectedCase.summary}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-sm text-gray-400">Target</h3>
                <p>{selectedCase.target}</p>
              </div>
              <div>
                <h3 className="text-sm text-gray-400">Location</h3>
                <p>{selectedCase.location}</p>
              </div>
              <div>
                <h3 className="text-sm text-gray-400">Source</h3>
                <p>{selectedCase.source}</p>
              </div>
              <div>
                <h3 className="text-sm text-gray-400">Confidence</h3>
                <p>{selectedCase.confidence}%</p>
              </div>
            </div>
            
            {/* Status selection */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Update Status</h3>
              <div className="flex space-x-2">
                <button 
                  className={`px-3 py-1 rounded-md ${selectedCase.status === 'critical' ? 'bg-red-600' : 'bg-slate-700 hover:bg-red-900'}`}
                  onClick={() => handleStatusChange('critical')}
                >
                  Critical
                </button>
                <button 
                  className={`px-3 py-1 rounded-md ${selectedCase.status === 'high' ? 'bg-orange-500' : 'bg-slate-700 hover:bg-orange-900'}`}
                  onClick={() => handleStatusChange('high')}
                >
                  High
                </button>
                <button 
                  className={`px-3 py-1 rounded-md ${selectedCase.status === 'medium' ? 'bg-yellow-500' : 'bg-slate-700 hover:bg-yellow-900'}`}
                  onClick={() => handleStatusChange('medium')}
                >
                  Medium
                </button>
                <button 
                  className={`px-3 py-1 rounded-md ${selectedCase.status === 'low' ? 'bg-green-600' : 'bg-slate-700 hover:bg-green-900'}`}
                  onClick={() => handleStatusChange('low')}
                >
                  Low
                </button>
              </div>
            </div>
            
            {/* Related cases */}
            {selectedCase.relatedCases && selectedCase.relatedCases.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Related Cases</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCase.relatedCases.map(relatedId => {
                    const relatedCase = cases.find(c => c.id === relatedId)
                    if (!relatedCase) return null
                    
                    return (
                      <div 
                        key={relatedId}
                        className="bg-slate-700 px-3 py-1 rounded-md text-sm cursor-pointer hover:bg-slate-600"
                        onClick={() => handleSelectCase(relatedCase)}
                      >
                        {relatedCase.title}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Timeline and events */}
            <div className="mb-4 flex-grow overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Timeline & Events</h3>
                <button 
                  className="text-sm bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-md flex items-center"
                  onClick={() => setIsAddingEvent(true)}
                >
                  <RiAddLine className="mr-1" /> Add Event
                </button>
              </div>
              
              {/* Add event form */}
              {isAddingEvent && (
                <div className="bg-slate-700 rounded-lg p-3 mb-3">
                  <textarea
                    value={newEventText}
                    onChange={e => setNewEventText(e.target.value)}
                    className="w-full bg-slate-600 rounded-md px-3 py-2 mb-2"
                    placeholder="Enter event details..."
                    rows="2"
                  ></textarea>
                  <div className="flex justify-end space-x-2">
                    <button 
                      className="px-3 py-1 bg-slate-600 rounded-md text-sm"
                      onClick={() => setIsAddingEvent(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="px-3 py-1 bg-blue-600 rounded-md text-sm"
                      onClick={handleAddEvent}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
              
              {/* Events list */}
              <div className="space-y-3">
                {caseEvents.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <p>No events recorded</p>
                  </div>
                ) : (
                  caseEvents.map((event, index) => (
                    <div key={index} className="bg-slate-700/50 p-3 rounded-lg">
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>{event.user}</span>
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <p>{event.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CaseManagement 