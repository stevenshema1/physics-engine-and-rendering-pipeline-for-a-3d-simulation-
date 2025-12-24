
import React from 'react';

interface SidebarProps {
  activeTab: 'simulation' | 'benchmarks' | 'docs';
  setActiveTab: (tab: 'simulation' | 'benchmarks' | 'docs') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'simulation' as const, label: 'Simulation View', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'benchmarks' as const, label: 'Benchmarks', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'docs' as const, label: 'Tech Design', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
  ];

  return (
    <aside className="w-20 lg:w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col py-6 z-50 transition-all">
      <div className="flex-1 flex flex-col gap-2 px-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all group ${
              activeTab === tab.id 
              ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.05)]' 
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <svg 
              className="w-5 h-5 flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            <span className="hidden lg:block font-medium text-sm tracking-wide">{tab.label}</span>
          </button>
        ))}
      </div>
      
      <div className="px-6 py-4 border-t border-zinc-900 mt-auto">
        <div className="hidden lg:block text-[10px] text-zinc-600 font-mono space-y-1">
          <p>ENGINE_ID: NF-0X2FF</p>
          <p>API_GATEWAY: ACTIVE</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-emerald-500">SYSTEM_OPTIMAL</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
