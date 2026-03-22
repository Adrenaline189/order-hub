'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export default function HomePage() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const features = [
    { icon: '🔗', titleKey: 'home.feature.connect.title', descKey: 'home.feature.connect.desc' },
    { icon: '📊', titleKey: 'home.feature.dashboard.title', descKey: 'home.feature.dashboard.desc' },
    { icon: '🔔', titleKey: 'home.feature.alert.title', descKey: 'home.feature.alert.desc' },
    { icon: '📥', titleKey: 'home.feature.export.title', descKey: 'home.feature.export.desc' },
  ];

  const plans = [
    { name: 'Free', price: '$0', orders: '100/mo', channels: 1 },
    { name: 'Starter', price: '$9', orders: '1,000/mo', channels: 2 },
    { name: 'Pro', price: '$29', orders: '10,000/mo', channels: 5, popular: true },
    { name: 'Business', price: '$99', orders: language === 'th' ? 'ไม่จำกัด' : 'Unlimited', channels: language === 'th' ? 'ไม่จำกัด' : 'Unlimited' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-gray-100 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{t('app.name')}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
              className="px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 text-sm font-medium"
            >
              {language === 'th' ? '🇬🇧 EN' : '🇹🇭 ไทย'}
            </button>
            <Link href="/dashboard" className="btn btn-primary">
              {t('auth.login')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400 text-sm font-medium mb-6">
            <span>✨</span>
            <span>{t('app.tagline')}</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            {t('home.hero.title')}
            <span className="gradient-text">{t('home.hero.highlight')}</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            {t('home.hero.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="btn btn-primary px-8 py-3 text-base">
              {t('home.start')}
            </Link>
            <Link href="/integrations" className="btn btn-secondary px-8 py-3 text-base">
              {t('home.features')}
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-6 mt-20">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700 card-hover"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t(feature.titleKey)}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t(feature.descKey)}
              </p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="mt-24">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            {t('home.pricing.title')}
          </h2>
          
          <div className="grid md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`relative bg-white dark:bg-slate-800 rounded-xl p-6 border ${
                  plan.popular 
                    ? 'border-blue-500 ring-2 ring-blue-500/20' 
                    : 'border-gray-100 dark:border-slate-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                    {t('home.pricing.popular')}
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {plan.price}
                  <span className="text-base font-normal text-gray-500">/mo</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>📦 {plan.orders} {t('home.pricing.orders')}</li>
                  <li>🔗 {plan.channels} {t('home.pricing.channels')}</li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-slate-700 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>{t('home.footer')}</p>
        </div>
      </footer>
    </div>
  );
}
