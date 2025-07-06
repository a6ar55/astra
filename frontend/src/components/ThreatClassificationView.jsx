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
    if (!result) return;

    // Stage 1 data (binary classification)
    if (result.stage1_prediction || result.stage1_result || result.model_used === 'astra') {
      let stage1Result = result.stage1_prediction || result.stage1_result;
      let confidence;
      
      // For Astra model, use the overall confidence
      if (result.model_used === 'astra') {
        confidence = result.confidence || 0;
        stage1Result = { confidence: confidence };
      } else {
        confidence = stage1Result?.confidence || 0;
      }
      
      setStage1Data({
        labels: ['Not a Threat', 'Threat'],
        datasets: [
          {
            label: 'Binary Classification',
            data: result.threat ? [0, (confidence * 100).toFixed(1)] : [(confidence * 100).toFixed(1), 0],
            backgroundColor: result.threat ? ['rgba(34, 197, 94, 0.7)', 'rgba(239, 68, 68, 0.7)'] : ['rgba(34, 197, 94, 0.7)', 'rgba(239, 68, 68, 0.7)'],
            borderColor: result.threat ? ['rgb(34, 197, 94)', 'rgb(239, 68, 68)'] : ['rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
            borderWidth: 1,
          },
        ],
      });
    }

    // Stage 2 data (threat type classification) - simplified for now
    if (result.stage2_prediction || result.stage2_result || result.astra_prediction) {
      let stage2Result = result.stage2_prediction || result.stage2_result;
      let threatTypes = ['Hate Speech/Extremism', 'Direct Violence Threats', 'Harassment and Intimidation', 'Criminal Activity', 'Child Safety Threats'];
      let confidenceData;
      
      // Handle Astra model predictions (single stage with all classes)
      if (result.astra_prediction && result.class_probabilities) {
        threatTypes = Object.keys(result.class_probabilities).filter(type => type !== 'Not a Threat');
        confidenceData = threatTypes.map(type => (result.class_probabilities[type] * 100).toFixed(1));
      } else if (stage2Result) {
        // Handle DistilBERT stage 2 predictions
        confidenceData = threatTypes.map(type => 
          type === stage2Result.class ? (stage2Result.confidence * 100).toFixed(1) : 0
        );
      } else {
        return; // No valid stage 2 data
      }
      
      setStage2Data({
        labels: threatTypes,
        datasets: [
          {
            label: result.model_used === 'astra' ? 'Threat Classification (Astra)' : 'Threat Type (DistilBERT)',
            data: confidenceData,
            backgroundColor: threatTypes.map(label => getThreatColor(label, 0.7)),
            borderColor: threatTypes.map(label => getThreatColor(label)),
            borderWidth: 1,
          },
        ],
      });
    }
    
    // Auto-show stage 2/classification details if this is a threat
    if (result.threat && (result.stage2_prediction || result.astra_prediction || result.model_used === 'astra')) {
      setShowStage2(true);
    } else {
      setShowStage2(false);
    }
  }, [result]);

  if (!result) return null;

  // Get the severity color
  const getSeverityColor = (confidence) => {
    if (!confidence) return 'bg-gray-500';
    const confValue = confidence * 100;
    if (confValue > 90) return 'bg-red-500';
    if (confValue > 70) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4 p-4 bg-slate-800 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">
              {result.model_used === 'astra' ? 'Astra Single-Stage Classification' : 'DistilBERT Two-Stage Classification'}
            </h3>
            <div className="text-sm text-slate-400">
              Model: {result.model_used === 'astra' ? 'Astra' : 'DistilBERT'} • 
              Type: {result.model_type === 'single_stage' ? 'Single Stage' : 'Two Stage'}
            </div>
          </div>
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
                  className={getSeverityColor((result.stage1_prediction || result.stage1_result)?.confidence || result.confidence)}
                  style={{ width: `${((result.stage1_prediction || result.stage1_result)?.confidence || result.confidence) * 100}%` }}
                />
              </div>
              <span className="text-white font-medium ml-2">
                {(((result.stage1_prediction || result.stage1_result)?.confidence || result.confidence) * 100).toFixed(1)}%
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

        {/* Stage 2 Results or Astra Classification Details */}
        {(result.threat && (result.stage2_prediction || result.astra_prediction)) && (
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">
                {result.model_used === 'astra' ? 'Classification Details' : 'Stage 2: Threat Type Classification'}
              </h4>
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
                  <div className="font-medium text-white">{(result.stage2_prediction || result.stage2_result)?.class || result.predicted_class}</div>
                </div>
                
                <div className="mb-4">
                  <div className="text-sm text-slate-400">Confidence</div>
                  <div className="flex items-center mt-1">
                    <div className="flex-grow h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={getSeverityColor((result.stage2_prediction || result.stage2_result)?.confidence || result.confidence)}
                        style={{ width: `${((result.stage2_prediction || result.stage2_result)?.confidence || result.confidence) * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-medium ml-2">
                      {(((result.stage2_prediction || result.stage2_result)?.confidence || result.confidence) * 100).toFixed(1)}%
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
                style={{ width: `${(result.confidence || 0) * 100}%` }}
              />
            </div>
            <span className="text-white font-medium ml-2 text-lg">
              {((result.confidence || 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatClassificationView; 