import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Workbench } from './components/Workbench';
import { AppView } from './types';
import { Layers } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 leading-tight">
                Enterprise OCR Platform
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                GPU Accelerated • Private Cloud
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-100">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                System Online
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-600">
                AD
             </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-6 relative">
          {currentView === AppView.DASHBOARD && <Dashboard />}
          {currentView === AppView.WORKBENCH && <Workbench />}
        </div>
      </main>
    </div>
  );
}