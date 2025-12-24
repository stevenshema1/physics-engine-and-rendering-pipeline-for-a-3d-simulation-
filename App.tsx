
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EngineView } from './components/EngineView';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { TechnicalControlCenter } from './components/TechnicalControlCenter';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'simulation' | 'benchmarks' | 'docs'>('simulation');
  const [engineState, setEngineState] = useState({
    fps: 0,
    latency: 0,
    particles: 1000,
    physicsStep: 16.67,
    memoryUsage: 0
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Header />
        
        <div className="flex-1 relative">
          {activeTab === 'simulation' && (
            <EngineView onStatsUpdate={setEngineState} particleCount={engineState.particles} />
          )}
          {activeTab === 'benchmarks' && (
            <PerformanceDashboard stats={engineState} />
          )}
          {activeTab === 'docs' && (
            <TechnicalControlCenter />
          )}
        </div>
        
        {/* Footer HUD */}
        <div className="h-8 bg-zinc-900 border-t border-zinc-800 flex items-center px-4 justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          <div className="flex gap-4">
            <span>CORE_LOAD: {(Math.random() * 40 + 20).toFixed(1)}%</span>
            <span>VRAM: 1.2GB / 8GB</span>
            <span>SIMD_STATE: AVX2_OPTIMIZED</span>
          </div>
          <div className="flex gap-4">
            <span className={engineState.fps > 55 ? "text-emerald-500" : "text-amber-500"}>
              {engineState.fps} FPS
            </span>
            <span>{engineState.latency.toFixed(2)}ms LATENCY</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
