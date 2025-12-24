
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

export const TechnicalControlCenter: React.FC = () => {
  const [query, setQuery] = useState('Generate a technical design document for the PBR rendering pipeline');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const generateTechDoc = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${query}. Focus on SIMD optimizations, Memory Alignment (AoS vs SoA), and specific BRDF implementation details for a real-time game engine. Output in professional markdown format.`,
        config: {
            thinkingConfig: { thinkingBudget: 1000 }
        }
      });
      setReport(response.text);
    } catch (error) {
      console.error(error);
      setReport("## Error Generating Technical Document\nCheck console for details or verify API access.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-zinc-950 p-10 overflow-y-auto font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-zinc-800 pb-6">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest">Engineering Documentation</h2>
          <p className="text-zinc-500 mt-2 text-sm leading-relaxed">
            Generate high-level architecture designs, UML specifications, and optimization strategies using the integrated technical kernel.
          </p>
        </header>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Instruction Set / Prompt</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-zinc-300 text-sm focus:outline-none focus:border-cyan-500 transition-colors min-h-[100px]"
              placeholder="Enter engineering request..."
            />
          </div>
          <button
            onClick={generateTechDoc}
            disabled={loading}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 text-white rounded-lg font-bold uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Compiling Architecture...
              </>
            ) : (
              'Synthesize Technical Design'
            )}
          </button>
        </div>

        {report && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 prose prose-invert prose-zinc max-w-none text-sm leading-relaxed whitespace-pre-wrap">
             <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
               <span className="text-xs text-cyan-500 font-bold tracking-widest uppercase">Kernel Output [DesignDoc_v1]</span>
               <button 
                 onClick={() => window.print()}
                 className="text-[10px] text-zinc-500 hover:text-white underline uppercase"
               >
                 Export PDF
               </button>
             </div>
             {report}
          </div>
        )}

        {!report && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-zinc-800 rounded-lg bg-zinc-900/40 hover:bg-zinc-900 transition-colors cursor-pointer" onClick={() => { setQuery('Generate a UML class diagram for a modular physics engine with collision dispatcher'); }}>
              <h4 className="text-xs font-bold text-white mb-1 tracking-wider uppercase">Physics Core UML</h4>
              <p className="text-[10px] text-zinc-500">Modular collision resolution system.</p>
            </div>
            <div className="p-4 border border-zinc-800 rounded-lg bg-zinc-900/40 hover:bg-zinc-900 transition-colors cursor-pointer" onClick={() => { setQuery('Describe the SIMD optimization strategy for particle integration (AoS vs SoA)'); }}>
               <h4 className="text-xs font-bold text-white mb-1 tracking-wider uppercase">SIMD Memory Layout</h4>
               <p className="text-[10px] text-zinc-500">Cache-aware optimization techniques.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
