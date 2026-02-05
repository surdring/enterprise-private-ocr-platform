import React from 'react';
import { LayoutDashboard, ScanLine, Settings, Database, Activity } from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.WORKBENCH, label: 'Workbench', icon: ScanLine },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl flex-shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <span className="font-bold text-xl text-white tracking-tight">OCR Core<span className="text-blue-500">.ai</span></span>
      </div>

      <div className="p-4 flex-1 space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
          System
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
          <Database className="w-5 h-5 text-slate-400" />
          <span>Model Registry</span>
        </button>
         <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
          <Activity className="w-5 h-5 text-slate-400" />
          <span>Logs & Audit</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
          <Settings className="w-5 h-5 text-slate-400" />
          <span>Settings</span>
        </button>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <div className="text-xs">
            <p className="text-white font-medium">PaddleOCR Server</p>
            <p className="text-slate-500">v2.6.0 (GPU)</p>
          </div>
        </div>
      </div>
    </aside>
  );
};