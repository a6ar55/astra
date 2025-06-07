import React from 'react';
import { FaBrain, FaInfoCircle } from 'react-icons/fa';

/**
 * Toggle component for enabling/disabling psycholinguistic profiling
 */
const ProfilingToggle = ({ enabled, onChange, className = "" }) => {
  return (
    <div className={`flex items-center bg-navy-800 border border-gray-700 rounded-lg p-3 ${className}`}>
      <div className="mr-2 text-blue-400">
        <FaBrain />
      </div>
      <div className="flex-grow">
        <label htmlFor="profiling-toggle" className="flex items-center cursor-pointer">
          <div className="mr-3 text-sm font-medium text-gray-300">
            Enable Psycholinguistic Profiling
            <span 
              className="ml-1 text-gray-500 cursor-help" 
              title="Adds additional psychological and linguistic analysis using Empath and VADER"
            >
              <FaInfoCircle />
            </span>
          </div>
          <div className="relative">
            <input
              id="profiling-toggle"
              type="checkbox"
              className="sr-only"
              checked={enabled}
              onChange={e => onChange(e.target.checked)}
            />
            <div className="w-10 h-5 bg-gray-700 rounded-full shadow-inner"></div>
            <div
              className={`absolute w-5 h-5 transition rounded-full shadow -left-1 -top-0 transform ${
                enabled ? 'translate-x-6 bg-blue-500' : 'bg-gray-500'
              }`}
            ></div>
          </div>
        </label>
      </div>
    </div>
  );
};

export default ProfilingToggle; 