import React, { useState } from 'react';
import { Maximize2, ZoomIn, Info } from 'lucide-react';

export default function HeatmapViewer({ originalImage, heatmapImage, prediction }) {
  const [showHeatmap, setShowHeatmap] = useState(true);

  return (
    <div className="heatmap-viewer glass-card p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ZoomIn className="text-indigo-400" size={20} />
            Diagnostic Visualization
          </h3>
          <p className="text-slate-400 text-sm">Grad-CAM highlights regions of interest</p>
        </div>
        <div className="toggle-container bg-slate-800 p-1 rounded-lg flex gap-1">
          <button 
            className={`px-3 py-1 rounded text-xs transition-colors ${!showHeatmap ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}
            onClick={() => setShowHeatmap(false)}
          >
            Original
          </button>
          <button 
            className={`px-3 py-1 rounded text-xs transition-colors ${showHeatmap ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}
            onClick={() => setShowHeatmap(true)}
          >
            AI Heatmap
          </button>
        </div>
      </div>

      <div className="relative aspect-square rounded-xl overflow-hidden bg-black flex-center">
        <img 
          src={originalImage} 
          alt="Retinal Scan" 
          className="absolute inset-0 w-full h-full object-contain"
        />
        <img 
          src={heatmapImage} 
          alt="AI Heatmap Overlay" 
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${showHeatmap ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] text-white flex items-center gap-1 border border-white/10">
          <Info size={10} /> AI Assisted Diagnosis
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">AI Prediction</div>
          <div className="text-xl font-bold text-indigo-400">{prediction.result}</div>
        </div>
        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Confidence Score</div>
          <div className="text-xl font-bold text-emerald-400">{prediction.confidence?.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}
