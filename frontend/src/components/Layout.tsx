'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface Props {
  currentPage?: string;
  children: React.ReactNode;
}

export default function Layout({ currentPage, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/counts?tenant_id=${TENANT_ID}`);
      const data = await res.json();
      setUnreadCount(data.unread || 0);
    } catch (err) {
      // Ignore
    }
  };

  // Navigation items - computed on every render when language changes
  const navItems = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: '📊', active: currentPage === 'dashboard' },
    { href: '/orders', label: t('nav.orders'), icon: '📦', active: currentPage === 'orders' },
    { href: '/revenue', label: t('nav.revenue'), icon: '💰', active: currentPage === 'revenue' },
    { href: '/sync-status', label: t('nav.sync'), icon: '🔄', active: currentPage === 'sync-status' },
    { href: '/activity-logs', label: t('nav.activity'), icon: '📋', active: currentPage === 'activity-logs' },
    { href: '/chat', label: t('nav.chat'), icon: '💬', active: currentPage === 'chat' },
    { href: '/connections', label: t('nav.connections'), icon: '🔗', active: currentPage === 'connections' },
  ];

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'th' ? 'en' : 'th');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900" key={language}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{t('app.name')}</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              ⚙️ {t('nav.settings')}
            </Link>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleLanguage}
                className="px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 text-xs font-bold"
                title={language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นไทย'}
              >
                {language.toUpperCase()}
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400"
                title={`Theme: ${theme}`}
              >
                {resolvedTheme === 'dark' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <span className="text-xl">☰</span>
            </button>

            {/* Page Title (mobile) */}
            <span className="lg:hidden text-lg font-semibold text-gray-900 dark:text-white">
              {navItems.find(i => i.active)?.label || t('app.name')}
            </span>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Language Toggle (desktop) */}
              <button
                onClick={toggleLanguage}
                className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 text-sm font-medium transition-colors"
              >
                {language === 'th' ? '🇬🇧 EN' : '🇹🇭 ไทย'}
              </button>
              
              {/* Notifications */}
              <Link
                href="/notifications"
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Theme Toggle (desktop) */}
              <button
                onClick={toggleTheme}
                className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title={`Theme: ${theme}`}
              >
                <span className="text-xl">{resolvedTheme === 'dark' ? '🌙' : '☀️'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
