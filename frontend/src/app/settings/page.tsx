'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getThemeLabel = (mode: string) => {
    if (mode === 'light') return t('settings.light');
    if (mode === 'dark') return t('settings.dark');
    return t('settings.system');
  };

  return (
    <Layout currentPage="settings">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Language */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">🌐 {t('settings.language')}</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setLanguage('th')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                language === 'th' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              🇹🇭 {t('settings.thai')}
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              🇬🇧 {t('settings.english')}
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">🎨 {t('settings.theme')}</h2>
          <div className="flex gap-3">
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  theme === mode ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {getThemeLabel(mode)}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t('settings.current')}: {resolvedTheme === 'dark' ? (language === 'th' ? 'โหมดมืด' : 'Dark mode') : (language === 'th' ? 'โหมดสว่าง' : 'Light mode')}
          </p>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">🔔 {t('settings.notifications')}</h2>
          <div className="space-y-3">
            {[
              { id: 'order_new', labelKey: 'settings.order_new', defaultChecked: true },
              { id: 'order_status', labelKey: 'settings.order_status', defaultChecked: true },
              { id: 'sync_error', labelKey: 'settings.sync_error', defaultChecked: true },
              { id: 'daily_report', labelKey: 'settings.daily_report', defaultChecked: false },
            ].map((item) => (
              <label key={item.id} className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700 dark:text-gray-300">{t(item.labelKey)}</span>
                <input type="checkbox" defaultChecked={item.defaultChecked} className="w-5 h-5 rounded text-blue-600" />
              </label>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">👤 {t('settings.account')}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('settings.email')}</label>
              <input type="email" defaultValue="demo@orderhub.app" className="input mt-1" />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('settings.shop_name')}</label>
              <input type="text" defaultValue="Demo Shop" className="input mt-1" />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
          <h2 className="font-semibold text-red-600 mb-4">⚠️ {t('settings.danger_zone')}</h2>
          <button className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-200 dark:hover:bg-red-900/50">
            {t('settings.delete_all')}
          </button>
        </div>

        <button onClick={handleSave} className="btn btn-primary w-full">
          {saved ? `✓ ${t('settings.saved')}` : t('settings.save')}
        </button>
      </div>
    </Layout>
  );
}
