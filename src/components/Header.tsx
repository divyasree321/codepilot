import { Cpu, Terminal, ShieldAlert } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-[#0c1222]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <Cpu size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display tracking-tight text-white">
                CodePilot <span className="text-indigo-400">AI</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded">
                MVP v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">AI-Powered Production Code Review & Vulnerability Scanner</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-mono text-slate-300">SYSTEM: ONLINE</span>
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Terminal size={14} className="text-indigo-400" />
            <span>PORT 3000</span>
          </div>
        </div>
      </div>
    </header>
  );
}
