import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserRole, ADMIN_CREDENTIALS, USER_CREDENTIALS, User } from '../auth';
import { Shield, User as UserIcon, Lock, Eye, EyeOff, Zap } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(username, password);
  };

  const performLogin = async (inputUsername: string, inputPassword: string) => {
    setError(null);
    setIsLoading(true);

    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    let role: UserRole | null = null;

    // 检查管理员凭据
    if (inputUsername === ADMIN_CREDENTIALS.username && inputPassword === ADMIN_CREDENTIALS.password) {
      role = UserRole.ADMIN;
    } else if (inputUsername === USER_CREDENTIALS.username && inputPassword === USER_CREDENTIALS.password) {
      role = UserRole.USER;
    }

    if (role) {
      onLogin({
        id: role === UserRole.ADMIN ? '1' : '2',
        username: inputUsername,
        role,
      });
    } else {
      setError(t('login.errorInvalidCredentials'));
    }

    setIsLoading(false);
  };

  // 一键登录普通用户
  const handleQuickLogin = async () => {
    await performLogin(USER_CREDENTIALS.username, USER_CREDENTIALS.password);
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-3">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-1">OCR Core<span className="text-blue-500">.ai</span></h1>
        <p className="text-slate-500 text-sm">{t('login.subtitle')}</p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">{t('login.title')}</h2>

        {/* 一键登录按钮 */}
        <button
          onClick={handleQuickLogin}
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mb-5 group"
        >
          <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
          {t('login.quickLogin')}
        </button>

        {/* 分隔线 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs text-slate-400">{t('login.orUseCredentials')}</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('login.username')}</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <UserIcon size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800"
                placeholder={t('login.usernamePlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('login.password')}</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800"
                placeholder={t('login.passwordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* 记住我和忘记密码 */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-slate-600 group-hover:text-slate-800 transition-colors">{t('login.rememberMe')}</span>
            </label>
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {t('login.forgotPassword')}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {t('login.loggingIn')}
              </>
            ) : (
              t('login.loginButton')
            )}
          </button>
        </form>
      </div>
      </div>
  );
};
