import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, ScanLine, Shield } from 'lucide-react';
import { AppView } from '../types';
import { UserRole } from '../auth';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  userRole: UserRole;
  onAdminLoginClick: () => void;
  isAnonymous: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, userRole, onAdminLoginClick, isAnonymous }) => {
  const { t } = useTranslation();
  const isAdmin = userRole === UserRole.ADMIN;

  // 根据用户角色过滤导航项
  const navItems = [
    // 只有管理员可以看到仪表盘
    ...(isAdmin ? [{ id: AppView.DASHBOARD, label: t('sidebar.dashboard'), icon: LayoutDashboard }] : []),
    // 所有用户都可以使用工作台
    { id: AppView.WORKBENCH, label: t('sidebar.workbench'), icon: ScanLine },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl flex-shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <span className="font-bold text-xl text-white tracking-tight">OCR Core<span className="text-blue-500">.ai</span></span>
      </div>

      <div className="p-4 flex-1 space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
          {t('sidebar.mainMenu')}
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

        {/* 暂时隐藏系统菜单
        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
          {t('sidebar.system')}
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
          <Database className="w-5 h-5 text-slate-400" />
          <span>{t('sidebar.modelRegistry')}</span>
        </button>
         <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
          <Activity className="w-5 h-5 text-slate-400" />
          <span>{t('sidebar.logsAndAudit')}</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
          <Settings className="w-5 h-5 text-slate-400" />
          <span>{t('sidebar.settings')}</span>
        </button>
        */}
      </div>

      {/* 底部区域：匿名用户显示管理员登录按钮 */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-2">
        {/* 匿名用户显示管理员登录入口 */}
        {isAnonymous && (
          <button
            onClick={onAdminLoginClick}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-slate-400 hover:bg-slate-800 hover:text-white"
            title={t('sidebar.adminLogin')}
          >
            <Shield className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
            <span className="text-sm font-medium">{t('sidebar.adminLogin')}</span>
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <div className="text-xs">
            <p className="text-white font-medium">{t('sidebar.serverStatus')}</p>
            <p className="text-slate-500">{t('sidebar.version')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};