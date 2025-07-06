import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { useUser } from '@clerk/clerk-react'
import { 
  FaFilePowerpoint, 
  FaDownload, 
  FaSpinner, 
  FaFileAlt, 
  FaExclamationTriangle,
  FaClipboardCheck,
  FaRobot,
  FaChartBar,
  FaCalendarAlt,
  FaUser,
  FaShieldAlt,
  FaEye,
  FaSync,
  FaBookOpen,
  FaVideo,
  FaPlay,
  FaPause,
  FaExpand,
  FaCompress
} from 'react-icons/fa'
import apiService from '../services/apiService'
import PPTViewer from '../components/PPTViewer'

const Briefing = () => {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [availableReports, setAvailableReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [reportPreview, setReportPreview] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [lastGenerated, setLastGenerated] = useState(null)
  const [pptBlob, setPptBlob] = useState(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [scriptLoading, setScriptLoading] = useState(false)
  const [scriptBlob, setScriptBlob] = useState(null)
  const [scriptText, setScriptText] = useState('')
  const [scriptModalOpen, setScriptModalOpen] = useState(false)
  const [videoBlob, setVideoBlob] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoLoading, setVideoLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoRef, setVideoRef] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  }

  useEffect(() => {
    loadAvailableReports()
  }, [])

  const loadAvailableReports = async () => {
    try {
      const reports = await apiService.getAvailableReports()
      setAvailableReports(reports)
      
      // Auto-select threat report if available
      const threatReport = reports.find(r => r.type === 'threat')
      if (threatReport) {
        setSelectedReport(threatReport)
        setReportPreview(threatReport.preview)
      }
    } catch (error) {
      console.error('Error loading reports:', error)
      toast.error('Failed to load available reports')
    }
  }

  // Helper: accept Blob or object URL string
  const triggerDownload = (data, fileName) => {
    try {
      console.log('triggerDownload called with:', { dataType: typeof data, fileName })
      
      const url = typeof data === 'string' ? data : URL.createObjectURL(data)
      console.log('Created URL:', url)
      
      // Method 1: Standard download
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Method 2: Fallback - open in new tab if download doesn't work
      setTimeout(() => {
        const fallbackWindow = window.open(url, '_blank')
        if (fallbackWindow) {
          console.log('Opened in new tab as fallback')
          toast.info('File opened in new tab. Right-click and "Save As" if download didn\'t start.')
        }
        URL.revokeObjectURL(url)
      }, 2000)
      
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Download failed - check browser console')
    }
  }

  const handleGeneratePresentation = async () => {
    if (!selectedReport) {
      toast.error('Please select a report first')
      return
    }

    setLoading(true)
    setGenerationProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 500)

      const result = await apiService.generatePowerpointPresentation(selectedReport.id)
      
      clearInterval(progressInterval)
      setGenerationProgress(100)
      
      if (result.success) {
        setLastGenerated(new Date())
        setPptBlob(result.blob)
        toast.success('PowerPoint presentation generated successfully!')
        
        triggerDownload(result.objectUrl, result.fileName || `threat_analysis_briefing_${new Date().toISOString().split('T')[0]}.pptx`)
      } else {
        toast.error(result.error || 'Failed to generate presentation')
      }
    } catch (error) {
      console.error('Error generating presentation:', error)
      toast.error('Failed to generate PowerPoint presentation')
    } finally {
      setLoading(false)
      setTimeout(() => setGenerationProgress(0), 2000)
    }
  }

  const handlePreviewReport = (report) => {
    setSelectedReport(report)
    setReportPreview(report.preview)
    setShowPreview(true)
  }

  const getReportIcon = (type) => {
    switch (type) {
      case 'threat':
        return <FaExclamationTriangle className="text-red-400" />
      case 'summary':
        return <FaChartBar className="text-blue-400" />
      case 'analysis':
        return <FaClipboardCheck className="text-green-400" />
      default:
        return <FaFileAlt className="text-gray-400" />
    }
  }

  const getReportTypeDisplay = (type) => {
    switch (type) {
      case 'threat':
        return 'Threat Analysis Report'
      case 'summary':
        return 'Summary Report'
      case 'analysis':
        return 'Analysis Report'
      default:
        return 'Report'
    }
  }

  const handleDownloadScript = async () => {
    if (!selectedReport) return
    setScriptLoading(true)
    try {
      console.log('Starting script download for report:', selectedReport.id)
      const result = await apiService.generatePresenterScript(selectedReport.id)
      console.log('Script generation result:', result)
      if (result.success) {
        console.log('Triggering download with blob size:', result.blob.size)
        triggerDownload(result.blob, result.fileName)
        setScriptBlob(result.blob)
        // cache text for viewer
        const txt = await result.blob.text()
        setScriptText(txt)
        toast.success('Presenter script ready! Check your downloads folder.')
      } else {
        console.error('Script generation failed:', result.error)
        toast.error(result.error || 'Failed to generate presenter script')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to download presenter script')
    } finally {
      setScriptLoading(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (!selectedReport) return
    setVideoLoading(true)
    try {
      console.log('Starting video generation for report:', selectedReport.id)
      const result = await apiService.generateVideoFromPptx(selectedReport.id)
      console.log('Video generation result:', result)
      if (result.success) {
        console.log('Video generated, blob size:', result.blob.size)
        setVideoBlob(result.blob)
        setVideoUrl(result.objectUrl)
        toast.success('Video generated successfully!')
      } else {
        console.error('Video generation failed:', result.error)
        toast.error(result.error || 'Failed to generate video')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate video')
    } finally {
      setVideoLoading(false)
    }
  }

  const handlePlayPause = () => {
    if (videoRef) {
      if (isPlaying) {
        videoRef.pause()
      } else {
        videoRef.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleVideoEnded = () => {
    setIsPlaying(false)
  }

  const handleDownloadVideo = () => {
    if (videoBlob) {
      triggerDownload(videoBlob, `threat_briefing_video_${new Date().toISOString().split('T')[0]}.mp4`)
    }
  }

  const handleToggleFullscreen = () => {
    if (videoRef) {
      if (!isFullscreen) {
        if (videoRef.requestFullscreen) {
          videoRef.requestFullscreen()
        } else if (videoRef.webkitRequestFullscreen) {
          videoRef.webkitRequestFullscreen()
        } else if (videoRef.msRequestFullscreen) {
          videoRef.msRequestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen()
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen()
        }
      }
      setIsFullscreen(!isFullscreen)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-full">
              <FaFilePowerpoint className="text-3xl text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Threat Intelligence Briefing
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Generate professional PowerPoint presentations and video presentations with narration from threat analysis reports using AI-powered structuring and dynamic layouts.
          </p>
        </motion.div>

        {/* Features Banner */}
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-center justify-center space-x-8 text-sm">
            <div className="flex items-center text-blue-400">
              <FaRobot className="mr-2" />
              <span>Gemini 2.0 Flash AI</span>
            </div>
            <div className="flex items-center text-purple-400">
              <FaFilePowerpoint className="mr-2" />
              <span>Dynamic Layouts</span>
            </div>
            <div className="flex items-center text-green-400">
              <FaShieldAlt className="mr-2" />
              <span>Professional Security Brief</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Selection */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <FaFileAlt className="mr-3 text-blue-400" />
                  Select Report for Presentation
                </h2>
              </div>
              
              <div className="p-6">
                {availableReports.length > 0 ? (
                  <div className="space-y-4">
                    {availableReports.map((report) => (
                      <motion.div
                        key={report.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                          selectedReport?.id === report.id
                            ? 'border-blue-500 bg-blue-500/10 shadow-lg'
                            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
                        }`}
                        onClick={() => setSelectedReport(report)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getReportIcon(report.type)}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white">{report.title}</h3>
                              <p className="text-sm text-slate-400 mt-1">{getReportTypeDisplay(report.type)}</p>
                              <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                                <span className="flex items-center">
                                  <FaCalendarAlt className="mr-1" />
                                  {new Date(report.created_at).toLocaleDateString()}
                                </span>
                                <span className="flex items-center">
                                  <FaUser className="mr-1" />
                                  {report.incidents || 0} incidents
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePreviewReport(report)
                              }}
                              className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                            >
                              <FaEye className="mr-1" />
                              Preview
                            </button>
                            {selectedReport?.id === report.id && (
                              <div className="text-blue-400">
                                <FaClipboardCheck />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FaFileAlt className="mx-auto text-4xl text-slate-600 mb-4" />
                    <p className="text-slate-400">No reports available for presentation generation</p>
                    <button
                      onClick={loadAvailableReports}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FaSync className="mr-2" />
                      Refresh Reports
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Generation Controls */}
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Generation Button */}
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <FaFilePowerpoint className="mr-3 text-orange-400" />
                  Generate Presentation
                </h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {selectedReport && (
                    <div className="bg-slate-700 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-2">Selected Report:</h3>
                      <p className="text-sm text-slate-300">{selectedReport.title}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {getReportTypeDisplay(selectedReport.type)}
                      </p>
                    </div>
                  )}
                  
                  {(loading || scriptLoading || videoLoading) && (
                    <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
                      <div className="flex items-center space-x-3 mb-3">
                        <FaSpinner className="animate-spin text-blue-400" />
                        <span className="text-blue-400 font-medium">
                          {scriptLoading ? 'Preparing presenter script...' : 
                           videoLoading ? 'Generating video presentation...' :
                           'Generating presentation...'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {generationProgress < 30 ? 'Fetching report data...' :
                         generationProgress < 60 ? 'Processing with Gemini AI...' :
                         generationProgress < 90 ? 'Generating PowerPoint...' :
                         'Finalizing...'}
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleGeneratePresentation}
                    disabled={!selectedReport || loading}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                      selectedReport && !loading
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg'
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <FaSpinner className="animate-spin mr-2" />
                        Generating...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <FaDownload className="mr-2" />
                        Generate PowerPoint
                      </span>
                    )}
                  </button>
                  
                  {lastGenerated && (
                    <div className="text-center">
                      <p className="text-xs text-slate-400">
                        Last generated: {lastGenerated.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {pptBlob && (
                    <button
                      onClick={() => setViewerOpen(true)}
                      className="w-full mt-2 py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm transition-colors"
                    >
                      View Presentation
                    </button>
                  )}

                  {!loading && pptBlob && (
                    <div className="space-y-3">
                      <button
                        onClick={handleDownloadScript}
                        className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-60"
                        disabled={scriptLoading}
                      >
                        {scriptLoading ? (
                          <FaSpinner className="animate-spin mr-2" />
                        ) : (
                          <FaDownload className="mr-2" />
                        )}
                        Download Presenter Script
                      </button>
                      {scriptBlob && (
                        <button
                          onClick={() => setScriptModalOpen(true)}
                          className="w-full flex items-center justify-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                        >
                          <FaBookOpen className="mr-2" />
                          View Presenter Script
                        </button>
                      )}
                      <button
                        onClick={handleGenerateVideo}
                        className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-60"
                        disabled={videoLoading}
                      >
                        {videoLoading ? (
                          <FaSpinner className="animate-spin mr-2" />
                        ) : (
                          <FaVideo className="mr-2" />
                        )}
                        Generate Video Presentation
                      </button>
                      {videoUrl && (
                        <div className="bg-slate-700 rounded-lg p-4 space-y-3">
                          <h4 className="text-white font-medium flex items-center">
                            <FaVideo className="mr-2" />
                            Video Player
                          </h4>
                          <div className="relative">
                            <video
                              ref={setVideoRef}
                              src={videoUrl}
                              onEnded={handleVideoEnded}
                              className="w-full rounded-lg"
                              controls
                              style={{ maxHeight: '300px' }}
                            />
                            <div className="absolute top-2 right-2">
                              <button
                                onClick={handleToggleFullscreen}
                                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded transition-colors"
                                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                              >
                                {isFullscreen ? <FaCompress /> : <FaExpand />}
                              </button>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handlePlayPause}
                              className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                              {isPlaying ? <FaPause className="mr-1" /> : <FaPlay className="mr-1" />}
                              {isPlaying ? 'Pause' : 'Play'}
                            </button>
                            <button
                              onClick={handleDownloadVideo}
                              className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                            >
                              <FaDownload className="mr-1" />
                              Download
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Features List */}
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white">Features</h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  {[
                    { icon: FaRobot, text: 'AI-powered content structuring', color: 'text-blue-400' },
                    { icon: FaFilePowerpoint, text: 'Professional slide layouts', color: 'text-orange-400' },
                    { icon: FaChartBar, text: 'Threat statistics visualization', color: 'text-green-400' },
                    { icon: FaShieldAlt, text: 'Security-focused templates', color: 'text-purple-400' },
                    { icon: FaVideo, text: 'Video presentation with narration', color: 'text-purple-400' },
                    { icon: FaDownload, text: 'Instant PPTX & MP4 download', color: 'text-red-400' }
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3 text-sm">
                      <feature.icon className={`${feature.color} flex-shrink-0`} />
                      <span className="text-slate-300">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Report Preview Modal */}
        <AnimatePresence>
          {showPreview && reportPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowPreview(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-800 rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Report Preview</h2>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6">
                  <div className="prose prose-invert max-w-none">
                    <pre className="bg-slate-900 p-4 rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(reportPreview, null, 2)}
                    </pre>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {viewerOpen && pptBlob && (
          <PPTViewer blob={pptBlob} onClose={() => setViewerOpen(false)} />
        )}

        {scriptModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800 max-w-3xl w-full max-h-[80vh] rounded-lg overflow-hidden shadow-xl border border-slate-700">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white flex items-center"><FaBookOpen className="mr-2" /> Presenter Script</h3>
                <button onClick={() => setScriptModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="p-6 overflow-y-auto text-slate-200 whitespace-pre-wrap text-sm">
                {scriptText || 'Loading...'}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Briefing 