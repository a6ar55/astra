import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FaBalanceScale, 
  FaTrash, 
  FaEye, 
  FaClock, 
  FaExclamationTriangle,
  FaSearch,
  FaFilter,
  FaSort,
  FaDownload
} from 'react-icons/fa'
import apiService from '../services/apiService'

const LegalAnalysis = () => {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClass, setFilterClass] = useState('all')
  const [sortBy, setSortBy] = useState('timestamp')

  useEffect(() => {
    fetchLegalAnalyses()
  }, [])

  const fetchLegalAnalyses = async () => {
    try {
      setLoading(true)
      const response = await apiService.getUserLegalAnalyses(100)
      if (response.status === 'success') {
        setAnalyses(response.analyses || [])
      } else {
        setError('Failed to fetch legal analyses')
      }
    } catch (err) {
      console.error('Error fetching legal analyses:', err)
      setError('Failed to fetch legal analyses')
    } finally {
      setLoading(false)
    }
  }

  const deleteAnalysis = async (analysisId) => {
    if (!window.confirm('Are you sure you want to delete this legal analysis?')) {
      return
    }

    try {
      await apiService.deleteLegalAnalysis(analysisId)
      setAnalyses(analyses.filter(analysis => analysis.id !== analysisId))
    } catch (err) {
      console.error('Error deleting legal analysis:', err)
      alert('Failed to delete legal analysis')
    }
  }

  const viewAnalysis = async (analysisId) => {
    try {
      const response = await apiService.getLegalAnalysisById(analysisId)
      if (response.status === 'success') {
        setSelectedAnalysis(response.analysis)
        setShowModal(true)
      }
    } catch (err) {
      console.error('Error fetching legal analysis:', err)
      alert('Failed to fetch legal analysis details')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getThreatClassColor = (threatClass) => {
    const colors = {
      'hate speech/extremism': 'text-red-500',
      'direct violence threats': 'text-red-600',
      'harassment and intimidation': 'text-orange-500',
      'criminal activity': 'text-purple-500',
      'child safety threats': 'text-pink-500',
      'not a threat': 'text-green-500'
    }
    return colors[threatClass.toLowerCase()] || 'text-gray-500'
  }

  const filteredAnalyses = analyses
    .filter(analysis => {
      const matchesSearch = analysis.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           analysis.threat_class?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterClass === 'all' || analysis.threat_class?.toLowerCase() === filterClass.toLowerCase()
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'timestamp':
          return new Date(b.timestamp) - new Date(a.timestamp)
        case 'threat_class':
          return a.threat_class?.localeCompare(b.threat_class)
        case 'content':
          return a.content?.localeCompare(b.content)
        default:
          return 0
      }
    })

  const threatClasses = [...new Set(analyses.map(a => a.threat_class).filter(Boolean))]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl mr-4">
              <FaBalanceScale className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Legal Analysis</h1>
              <p className="text-text-secondary">Review legal implications and punishments for detected threats</p>
            </div>
          </div>
          
          {error && (
            <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg p-4 mb-6">
              <p className="text-danger-400">{error}</p>
            </div>
          )}
        </motion.div>

        {/* Filters and Search */}
        <motion.div 
          className="bg-glass backdrop-blur-xl border border-border-primary/30 rounded-xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search content or threat class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-light/50 border border-border-primary/30 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-light/50 border border-border-primary/30 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 appearance-none"
              >
                <option value="all">All Threat Classes</option>
                {threatClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="relative">
              <FaSort className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-light/50 border border-border-primary/30 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 appearance-none"
              >
                <option value="timestamp">Sort by Date</option>
                <option value="threat_class">Sort by Threat Class</option>
                <option value="content">Sort by Content</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Results */}
        <motion.div 
          className="bg-glass backdrop-blur-xl border border-border-primary/30 rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {filteredAnalyses.length === 0 ? (
            <div className="p-12 text-center">
              <FaBalanceScale className="text-6xl text-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-secondary mb-2">No Legal Analyses Found</h3>
              <p className="text-text-tertiary">
                {analyses.length === 0 
                  ? "You haven't performed any legal analyses yet. Go to Analysis History to analyze threats for legal implications."
                  : "No analyses match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-light/30 border-b border-border-primary/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Content</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Threat Class</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary/20">
                  {filteredAnalyses.map((analysis, index) => (
                    <motion.tr 
                      key={analysis.id}
                      className="hover:bg-surface-light/20 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-text-primary text-sm font-medium truncate">
                            {analysis.content}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getThreatClassColor(analysis.threat_class)} bg-surface-light/50`}>
                          <FaExclamationTriangle className="mr-1" />
                          {analysis.threat_class}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-text-tertiary text-sm">
                          <FaClock className="mr-2" />
                          {formatDate(analysis.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewAnalysis(analysis.id)}
                            className="p-2 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => deleteAnalysis(analysis.id)}
                            className="p-2 text-danger-400 hover:text-danger-300 hover:bg-danger-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Analysis Details Modal */}
        <AnimatePresence>
          {showModal && selectedAnalysis && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-glass backdrop-blur-xl border border-border-primary/30 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="p-6 border-b border-border-primary/20">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-text-primary">Legal Analysis Details</h2>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Content */}
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Threat Content</h3>
                    <div className="bg-surface-light/30 rounded-lg p-4">
                      <p className="text-text-primary">{selectedAnalysis.content}</p>
                    </div>
                  </div>

                  {/* Threat Classification */}
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Threat Classification</h3>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getThreatClassColor(selectedAnalysis.threat_class)} bg-surface-light/50`}>
                        <FaExclamationTriangle className="mr-2" />
                        {selectedAnalysis.threat_class}
                      </span>
                      <span className="text-text-tertiary text-sm">
                        Legal Label: {selectedAnalysis.legal_label}
                      </span>
                    </div>
                  </div>

                  {/* Legal Analysis */}
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Legal Implications & Punishments</h3>
                    <div className="bg-gradient-to-br from-warning-500/10 to-warning-600/10 border border-warning-500/20 rounded-lg p-4">
                      <div className="prose prose-invert max-w-none">
                        <p className="text-text-primary whitespace-pre-wrap">{selectedAnalysis.legal_analysis}</p>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border-primary/20">
                    <div>
                      <h4 className="text-sm font-semibold text-text-secondary mb-1">Analysis Date</h4>
                      <p className="text-text-primary">{formatDate(selectedAnalysis.timestamp)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text-secondary mb-1">Analysis ID</h4>
                      <p className="text-text-primary font-mono text-sm">{selectedAnalysis.id}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default LegalAnalysis 