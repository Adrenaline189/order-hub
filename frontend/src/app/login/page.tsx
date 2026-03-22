'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        router.push('/dashboard');
      } else {
        setError(language === 'th' ? 'เข้าสู่ระบบไม่สำเร็จ' : 'Login failed');
      }
    } catch (err) {
      setError(language === 'th' ? 'เกิดข้อผิดพลาด' : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">O</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{t('app.name')}</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {language === 'th' ? 'เข้าสู่ระบบเพื่อจัดการออเดอร์' : 'Sign in to manage your orders'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@orderhub.app"
                className="input mt-1"
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input mt-1"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 disabled:opacity-50">
              {loading ? t('auth.logging_in') : t('auth.login_btn')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('auth.no_account')}{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                {t('auth.register')}
              </Link>
            </p>
          </div>

          {/* Demo login */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
            <button
              onClick={() => {
                setEmail('demo@orderhub.app');
                setPassword('demo123');
              }}
              className="btn btn-secondary w-full text-sm"
            >
              {t('auth.demo')}
            </button>
          </div>
        </div>

        {/* Language & Theme */}
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-medium"
          >
            {language === 'th' ? '🇬🇧 English' : '🇹🇭 ไทย'}
          </button>
          <button onClick={toggleTheme} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            {resolvedTheme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </div>
  );
}
