import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { Cpu, Zap, FileText, Clock, Server } from 'lucide-react';
import { GPU_MODEL_NAME, GPU_TOTAL_MEMORY } from '../constants';
import { GPUStats } from '../types';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  // Simulate realtime GPU data
  const [gpuStats, setGpuStats] = useState<GPUStats>({
    model: GPU_MODEL_NAME,
    totalMemory: GPU_TOTAL_MEMORY,
    usedMemory: 4.2,
    utilization: 12,
    temperature: 42,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setGpuStats(prev => ({
        ...prev,
        usedMemory: Math.min(GPU_TOTAL_MEMORY, Math.max(2, prev.usedMemory + (Math.random() - 0.5) * 2)),
        utilization: Math.min(100, Math.max(0, prev.utilization + (Math.random() - 0.5) * 10)),
        temperature: Math.min(90, Math.max(30, prev.temperature + (Math.random() - 0.5) * 2)),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const data = [
    { name: '08:00', docs: 120 }, { name: '09:00', docs: 250 },
    { name: '10:00', docs: 450 }, { name: '11:00', docs: 380 },
    { name: '12:00', docs: 150 }, { name: '13:00', docs: 320 },
    { name: '14:00', docs: 540 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t('dashboard.todayProcessed')} 
          value="2,482" 
          unit={t('dashboard.docs')}
          trend="+12%" 
          icon={FileText} 
          color="blue"
        />
        <StatCard 
          title={t('dashboard.timeSaved')} 
          value="18.5" 
          unit={t('dashboard.hours')}
          trend={t('dashboard.vsManual')} 
          icon={Clock} 
          color="indigo"
        />
        <StatCard 
          title={t('dashboard.gpuMemory')} 
          value={gpuStats.usedMemory.toFixed(1)} 
          unit={`/ ${gpuStats.totalMemory} ${t('dashboard.gb')}`}
          trend={`${Math.round((gpuStats.usedMemory / gpuStats.totalMemory) * 100)}% ${t('dashboard.used')}`}
          icon={Cpu} 
          color="green"
        />
        <StatCard 
          title={t('dashboard.computeLoad')} 
          value={Math.round(gpuStats.utilization).toString()} 
          unit="%"
          trend={`${Math.round(gpuStats.temperature)}°C`} 
          icon={Zap} 
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">{t('dashboard.throughput')}</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="docs" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorDocs)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Status Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{t('dashboard.computeNodeStatus')}</h3>
          
          <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200 rounded text-slate-700">
                    <Server size={20} />
                </div>
                <div>
                    <div className="font-semibold text-sm text-slate-900">localhost:8000</div>
                    <div className="text-xs text-slate-500">{t('dashboard.internalNetwork')}</div>
                </div>
             </div>
             <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">{t('dashboard.active')}</span>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 font-medium">{t('dashboard.vramUsage')}</span>
                <span className="text-slate-900 font-bold">{gpuStats.usedMemory.toFixed(1)} {t('dashboard.gb')}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${(gpuStats.usedMemory / gpuStats.totalMemory) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 font-medium">{t('dashboard.gpuUtilization')}</span>
                <span className="text-slate-900 font-bold">{Math.round(gpuStats.utilization)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                    className="bg-orange-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${gpuStats.utilization}%` }}
                ></div>
              </div>
            </div>

             <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 font-medium">{t('dashboard.paddleOcrModel')}</span>
                <span className="text-slate-900 font-bold">{t('dashboard.loaded')}</span>
              </div>
               <div className="flex items-center gap-2 mt-1">
                 <span className="h-2 w-2 rounded-full bg-green-500"></span>
                 <span className="text-xs text-slate-500">ch_PP-OCRv4_server_rec</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{title: string, value: string, unit: string, trend: string, icon: any, color: string}> = ({
    title, value, unit, trend, icon: Icon, color
}) => {
    const colorClasses: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600",
        indigo: "bg-indigo-50 text-indigo-600",
        green: "bg-green-50 text-green-600",
        orange: "bg-orange-50 text-orange-600",
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    <Icon size={20} />
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend.includes('+') ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {trend}
                </span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <div className="flex items-baseline gap-1 mt-1">
                    <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
                    <span className="text-xs text-slate-400 font-medium">{unit}</span>
                </div>
            </div>
        </div>
    )
}