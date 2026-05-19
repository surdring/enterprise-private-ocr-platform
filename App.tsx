import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Workbench } from './components/Workbench';
import { Login } from './components/Login';
import { AppView } from './types';
import { UserRole, User } from './auth';
import { Layers, Globe, LogOut, Shield, User as UserIcon } from 'lucide-react';

// localStorage key for auth persistence
const AUTH_STORAGE_KEY = 'ocr_auth_user';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.WORKBENCH);
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const { t, i18n } = useTranslation();

  // 页面加载时从 localStorage 恢复登录状态
  useEffect(() => {
    const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedUser) {
      try {
        const parsedUser: User = JSON.parse(savedUser);
        setUser(parsedUser);
        // 如果是管理员，自动跳转到仪表盘
        if (parsedUser.role === UserRole.ADMIN) {
          setCurrentView(AppView.DASHBOARD);
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  // 匿名用户也被视为普通用户，只有明确登录的管理员才是管理员
  const isAdmin = user?.role === UserRole.ADMIN;
  const isAnonymous = user === null;

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh-CN' ? 'en' : 'zh-CN';
    i18n.changeLanguage(newLang);
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
    setShowLogin(false);
    // 登录后如果是管理员，自动跳转到仪表盘
    if (loggedInUser.role === UserRole.ADMIN) {
      setCurrentView(AppView.DASHBOARD);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setCurrentView(AppView.WORKBENCH);
  };

  const handleAdminLoginClick = () => {
    setShowLogin(true);
  };

  const handleCloseLogin = () => {
    setShowLogin(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        userRole={user?.role ?? UserRole.USER}
        onAdminLoginClick={handleAdminLoginClick}
        isAnonymous={isAnonymous}
      />

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
                {t('app.title')}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {t('app.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-100">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {t('app.systemOnline')}
             </div>
             <button
                onClick={toggleLanguage}
                className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors"
                title={i18n.language === 'zh-CN' ? 'Switch to English' : '切换到中文'}
             >
                <Globe className="w-3 h-3" />
                {i18n.language === 'zh-CN' ? 'EN' : '中文'}
             </button>

             {/* 用户角色标签 - 匿名用户也显示为普通用户 */}
             <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
               isAdmin 
                 ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                 : 'bg-blue-100 text-blue-700 border border-blue-200'
             }`}>
               {isAdmin ? (
                 <>
                   <Shield className="w-3 h-3" />
                   {t('app.admin')}
                 </>
               ) : (
                 <>
                   <UserIcon className="w-3 h-3" />
                   {t('app.user')}
                 </>
               )}
             </div>

             {/* 登出按钮 - 仅已登录用户显示 */}
             {!isAnonymous && (
               <button
                 onClick={handleLogout}
                 className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors"
                 title={t('app.logout')}
               >
                 <LogOut className="w-3 h-3" />
                 {t('app.logout')}
               </button>
             )}

             <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold ${
               isAdmin 
                 ? 'bg-purple-100 border-purple-300 text-purple-700' 
                 : isAnonymous
                   ? 'bg-slate-100 border-slate-300 text-slate-500'
                   : 'bg-slate-200 border-slate-300 text-slate-600'
             }`}>
                {isAnonymous ? '?' : user?.username.charAt(0).toUpperCase()}
             </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-6 relative">
          {/* 只有管理员可以访问仪表盘 */}
          {currentView === AppView.DASHBOARD && isAdmin && <Dashboard />}
          {currentView === AppView.DASHBOARD && !isAdmin && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm">
                <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('app.accessDenied')}</h3>
                <p className="text-slate-500">{t('app.adminOnly')}</p>
              </div>
            </div>
          )}
          {/* 所有用户都可以访问工作台 */}
          {currentView === AppView.WORKBENCH && <Workbench />}
        </div>
      </main>

      {/* 管理员登录弹窗 */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative">
            <button
              onClick={handleCloseLogin}
              className="absolute -top-12 right-0 text-white hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
            <Login onLogin={handleLogin} />
          </div>
        </div>
      )}
    </div>
  );
}