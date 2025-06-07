import React from 'react';
import { FaBrain, FaChartPie, FaTable } from 'react-icons/fa';
import { Radar } from 'react-chartjs-2';

/**
 * Displays psycholinguistic profiling results using Empath and VADER
 */
const ProfilingResult = ({ profilingData, isLoading, error, className = "" }) => {
  if (isLoading) {
    return (
      <div className={`bg-navy-800 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center p-6 text-gray-400">
          <div className="animate-pulse flex space-x-2 items-center">
            <FaBrain className="text-xl" />
            <span>Analyzing psychological patterns...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-navy-800 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="text-red-400 p-3 border border-red-800 bg-red-900/20 rounded-md">
          <p className="font-medium">Profiling Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!profilingData || (!profilingData.empath && !profilingData.vader)) {
    return (
      <div className={`bg-navy-800 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="text-gray-400 text-center p-4">
          No profiling data available
        </div>
      </div>
    );
  }

  // Extract and prepare Empath data
  const empathData = profilingData.empath || {};
  const topCategories = Object.entries(empathData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Extract VADER data
  const vaderData = profilingData.vader || {
    compound: 0,
    pos: 0,
    neu: 0,
    neg: 0
  };

  // Prepare data for radar chart if we have react-chartjs-2
  const radarData = {
    labels: topCategories.map(([category]) => category),
    datasets: [
      {
        label: 'Psychological Features',
        data: topCategories.map(([_, value]) => value * 100), // Scale to 0-100
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Options for radar chart
  const radarOptions = {
    scales: {
      r: {
        angleLines: {
          display: true,
          color: 'rgba(100, 100, 100, 0.3)',
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          color: 'rgba(200, 200, 200, 0.8)',
          backdropColor: 'transparent',
          font: {
            size: 10
          }
        },
        pointLabels: {
          color: 'rgba(200, 200, 200, 0.8)',
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(100, 100, 100, 0.3)',
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    },
    maintainAspectRatio: false
  };

  // Helper function to get the color class based on the sentiment score
  const getSentimentColor = (score) => {
    if (score > 0.05) return "text-green-400";
    if (score < -0.05) return "text-red-400";
    return "text-yellow-400";
  };

  return (
    <div className={`bg-navy-800 border border-gray-700 rounded-lg ${className}`}>
      <div className="px-4 py-3 bg-navy-900 border-b border-gray-700 flex items-center">
        <FaBrain className="mr-2 text-blue-400" />
        <h3 className="text-md font-semibold text-white">Psycholinguistic Profiling Insights</h3>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Empath Categories Section */}
        <div className="bg-navy-700 border border-gray-600 rounded-lg p-3">
          <div className="mb-2 pb-2 border-b border-gray-600 flex items-center">
            <FaTable className="mr-2 text-yellow-500" />
            <h4 className="text-sm font-medium text-gray-300">Top Psychological Categories</h4>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase">
                <tr>
                  <th className="px-2 py-2 text-left">Category</th>
                  <th className="px-2 py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {topCategories.length > 0 ? (
                  topCategories.map(([category, score], index) => (
                    <tr key={category} className={index % 2 === 0 ? "bg-navy-750" : ""}>
                      <td className="px-2 py-1.5 text-gray-300 capitalize">{category.replace(/_/g, ' ')}</td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex items-center justify-end">
                          <div className="w-32 bg-navy-900 rounded-full h-1.5 mr-2">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full" 
                              style={{ width: `${Math.round(score * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-300 text-xs">{(score * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-2 py-2 text-center text-gray-500">
                      No significant categories detected
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* VADER Sentiment Analysis Section */}
        <div className="bg-navy-700 border border-gray-600 rounded-lg p-3">
          <div className="mb-2 pb-2 border-b border-gray-600 flex items-center">
            <FaChartPie className="mr-2 text-yellow-500" />
            <h4 className="text-sm font-medium text-gray-300">Sentiment Analysis (VADER)</h4>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Overall Sentiment</span>
              <span className={`text-sm font-medium ${getSentimentColor(vaderData.compound)}`}>
                {vaderData.compound > 0.05 ? "Positive" : vaderData.compound < -0.05 ? "Negative" : "Neutral"}
                {" "}({vaderData.compound.toFixed(2)})
              </span>
            </div>
            <div className="w-full h-2 bg-navy-900 rounded-full flex overflow-hidden">
              <div className="bg-red-500 h-2" style={{ width: `${vaderData.neg * 100}%` }}></div>
              <div className="bg-yellow-500 h-2" style={{ width: `${vaderData.neu * 100}%` }}></div>
              <div className="bg-green-500 h-2" style={{ width: `${vaderData.pos * 100}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Negative: {(vaderData.neg * 100).toFixed(1)}%</span>
              <span>Neutral: {(vaderData.neu * 100).toFixed(1)}%</span>
              <span>Positive: {(vaderData.pos * 100).toFixed(1)}%</span>
            </div>
          </div>
          
          {/* Radar Chart */}
          {topCategories.length > 0 && (
            <div className="h-48 mt-4">
              <Radar data={radarData} options={radarOptions} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilingResult; 