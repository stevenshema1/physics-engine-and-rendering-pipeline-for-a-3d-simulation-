
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="h-14 bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-sm transform rotate-45 shadow-[0_0_15px_rgba(6,182,212,0.4)]"></div>
        <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-200">
          NovaForge <span className="text-cyan-500 font-black">X-1</span> Simulation Environment
        </h1>
      </div>
      <div className="flex gap-4">
        <div className="px-3 py-1 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 font-mono">
          KERNEL_VER: 0.9.4-PROTOTYPE
        </div>
      </div>
    </header>
  );
};
