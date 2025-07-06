import React, { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { init } from 'pptx-preview'

/**
 * PPTViewer renders a PowerPoint file (PPTX) inside a scrollable container.
 * It relies on the "pptx-preview" library which converts PPTX to HTML on the client.
 *
 * Props:
 *   - blob: Blob of the PPTX file to render
 *   - onClose: function to call when user closes the viewer
 */
const PPTViewer = ({ blob, onClose }) => {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!blob) return

    const renderPpt = async () => {
      if (!containerRef.current) return

      // Clean previous content if any
      containerRef.current.innerHTML = ''

      const arrayBuffer = await blob.arrayBuffer()

      try {
        // Initialize viewer and render
        const viewer = init(containerRef.current, {
          width: 960,
          height: 540
        })
        await viewer.preview(arrayBuffer)
      } catch (err) {
        console.error('Error rendering PPTX:', err)
      }
    }

    renderPpt()
  }, [blob])

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-700 relative" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute top-2 right-3 text-slate-400 hover:text-white text-xl"
          onClick={onClose}
        >
          ×
        </button>
        <div ref={containerRef} className="p-4 pptx-viewer" />
      </div>
    </div>
  )
}

PPTViewer.propTypes = {
  blob: PropTypes.instanceOf(Blob).isRequired,
  onClose: PropTypes.func.isRequired
}

export default PPTViewer 