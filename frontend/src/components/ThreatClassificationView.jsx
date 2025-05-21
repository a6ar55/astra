import React, { useState, useEffect } from 'react';
import { Bar, Pie, Radar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, ChartDataLabels);

// Function to get threat color based on class name
const getThreatColor = (className, alpha = 1.0) => {
  const colorMap = {
    'Threat': `rgba(244, 63, 94, ${alpha})`,
    'Non-threat': `rgba(34, 197, 94, ${alpha})`,
    'Non-threat/Neutral': `rgba(34, 197, 94, ${alpha})`,
    'Hate Speech/Extremism': `rgba(249, 115, 22, ${alpha})`,
    'Direct Violence Threats': `rgba(239, 68, 68, ${alpha})`,
    'Harassment and Intimidation': `rgba(168, 85, 247, ${alpha})`,
    'Criminal Activity': `rgba(59, 130, 246, ${alpha})`,
    'Child Safety Threats': `rgba(236, 72, 153, ${alpha})`
  };

  return colorMap[className] || `rgba(75, 85, 99, ${alpha})`;
};

const ThreatClassificationView = ({ result }) => {
  const [viewMode, setViewMode] = useState('bar');
  const [showStage2, setShowStage2] = useState(false);
  const [stage1Data, setStage1Data] = useState(null);
  const [stage2Data, setStage2Data] = useState(null);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        formatter: (value) => `${value}%`,
        color: '#fff',
        font: {
          weight: 'bold',
          size: 11,
        },
      },
      legend: {
        position: 'bottom',
        labels: {
          color: '#e5e7eb',
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.raw}%`;
          }
        }
      }
    },
    scales: viewMode === 'bar' ? {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#e5e7eb',
        },
        title: {
          display: true,
          text: 'Confidence (%)',
          color: '#e5e7eb',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#e5e7eb',
        },
      },
    } : {},
  };

  // Process result data for charts
  useEffect(() => {
    if (!result || !result.visualization_data) return;

    // Stage 1 data (binary classification)
    if (result.visualization_data.stage1) {
      const stage1 = result.visualization_data.stage1;
      setStage1Data({
        labels: stage1.labels,
        datasets: [
          {
            label: 'Binary Classification',
            data: stage1.values.map(v => (v * 100).toFixed(1)),
            backgroundColor: stage1.labels.map(label => getThreatColor(label, 0.7)),
            borderColor: stage1.labels.map(label => getThreatColor(label)),
            borderWidth: 1,
          },
        ],
      });
    }

    // Stage 2 data (threat type classification)
    if (result.visualization_data.stage2) {
      const stage2 = result.visualization_data.stage2;
      setStage2Data({
        labels: stage2.labels,
        datasets: [
          {
            label: 'Threat Type',
            data: stage2.values.map(v => (v * 100).toFixed(1)),
            backgroundColor: stage2.labels.map(label => getThreatColor(label, 0.7)),
            borderColor: stage2.labels.map(label => getThreatColor(label)),
            borderWidth: 1,
          },
        ],
      });
    }
    
    // Auto-show stage 2 if this is a threat
    if (result.threat && result.stage === 2) {
      setShowStage2(true);
    } else {
      setShowStage2(false);
    }
  }, [result]);

  if (!result) return null;

  // Get the severity color
  const getSeverityColor = (confidence) => {
    const confValue = confidence * 100;
    if (confValue > 90) return 'bg-red-500';
    if (confValue > 70) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4 p-4 bg-slate-800 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Two-Stage Classification Results</h3>
          <div className="flex space-x-2">
            <button
              className={`px-2 py-1 rounded text-xs ${viewMode === 'bar' ? 'bg-indigo-600' : 'bg-slate-700'}`}
              onClick={() => setViewMode('bar')}
            >
              Bar
            </button>
            <button
              className={`px-2 py-1 rounded text-xs ${viewMode === 'pie' ? 'bg-indigo-600' : 'bg-slate-700'}`}
              onClick={() => setViewMode('pie')}
            >
              Pie
            </button>
          </div>
        </div>

        {/* Stage 1 Results */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Stage 1: Threat Detection</h4>
            <div className={`px-2 py-1 rounded text-xs ${result.threat ? 'bg-red-600' : 'bg-green-600'}`}>
              {result.threat ? 'Threat Detected' : 'No Threat'}
            </div>
          </div>
          
          <div className="mb-2">
            <div className="text-sm text-slate-400">Confidence</div>
            <div className="flex items-center mt-1">
              <div className="flex-grow h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={getSeverityColor(result.stage1_result.confidence)}
                  style={{ width: `${result.stage1_result.confidence * 100}%` }}
                />
              </div>
              <span className="text-white font-medium ml-2">
                {(result.stage1_result.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Stage 1 Chart */}
          <div className="mt-4" style={{ height: '200px' }}>
            {stage1Data && (
              viewMode === 'bar' ? 
                <Bar data={stage1Data} options={chartOptions} /> : 
                <Pie data={stage1Data} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Stage 2 Results */}
        {result.threat && (
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Stage 2: Threat Type Classification</h4>
              <button
                className={`px-2 py-1 rounded text-xs ${showStage2 ? 'bg-indigo-600' : 'bg-slate-700'}`}
                onClick={() => setShowStage2(!showStage2)}
              >
                {showStage2 ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            {showStage2 && (
              <>
                <div className="mb-2">
                  <div className="text-sm text-slate-400 mb-1">Threat Type</div>
                  <div className="font-medium text-white">{result.stage2_result.predicted_class}</div>
                </div>
                
                <div className="mb-4">
                  <div className="text-sm text-slate-400">Confidence</div>
                  <div className="flex items-center mt-1">
                    <div className="flex-grow h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={getSeverityColor(result.stage2_result.confidence)}
                        style={{ width: `${result.stage2_result.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-medium ml-2">
                      {(result.stage2_result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Stage 2 Chart */}
                <div className="mt-4" style={{ height: '250px' }}>
                  {stage2Data && (
                    viewMode === 'bar' ? 
                      <Bar data={stage2Data} options={chartOptions} /> : 
                      <Pie data={stage2Data} options={chartOptions} />
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Final Classification Summary */}
      <div className="p-4 bg-slate-800 rounded-lg">
        <h3 className="text-lg font-medium mb-3">Final Classification</h3>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-slate-400">Classification</div>
            <div className="font-medium text-white text-lg">{result.predicted_class}</div>
          </div>
          <div className={`px-3 py-1 rounded ${result.threat ? 'bg-red-600' : 'bg-green-600'}`}>
            {result.threat ? 'Threat' : 'Safe'}
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm text-slate-400">Overall Confidence</div>
          <div className="flex items-center mt-1">
            <div className="flex-grow h-3 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={getSeverityColor(result.confidence)}
                style={{ width: `${result.confidence * 100}%` }}
              />
            </div>
            <span className="text-white font-medium ml-2 text-lg">
              {(result.confidence * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatClassificationView; 