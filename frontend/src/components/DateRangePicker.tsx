'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  maxDate?: string;
}

type QuickSelect = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'quarter' | 'year' | 'custom';

export default function DateRangePicker({ value, onChange, maxDate }: DateRangePickerProps) {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [quickSelect, setQuickSelect] = useState<QuickSelect>('month');
  const [customFrom, setCustomFrom] = useState(value.from.split('T')[0]);
  const [customTo, setCustomTo] = useState(value.to.split('T')[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDateRange = (select: QuickSelect): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (select) {
      case 'today': {
        const start = new Date(today);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { from: start.toISOString(), to: end.toISOString() };
      }
      case 'yesterday': {
        const start = new Date(today);
        start.setDate(start.getDate() - 1);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { from: start.toISOString(), to: end.toISOString() };
      }
      case 'week': {
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { from: start.toISOString(), to: end.toISOString() };
      }
      case 'month': {
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { from: start.toISOString(), to: end.toISOString() };
      }
      case 'last_month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { from: start.toISOString(), to: end.toISOString() };
      }
      case 'quarter': {
        const start = new Date(today);
        start.setDate(start.getDate() - 89);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { from: start.toISOString(), to: end.toISOString() };
      }
      case 'year': {
        const start = new Date(today);
        start.setDate(start.getDate() - 364);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { from: start.toISOString(), to: end.toISOString() };
      }
      default:
        return value;
    }
  };

  const handleQuickSelect = (select: QuickSelect) => {
    setQuickSelect(select);
    if (select !== 'custom') {
      const range = getDateRange(select);
      onChange(range);
      setIsOpen(false);
    }
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(customTo);
      to.setHours(23, 59, 59, 999);
      onChange({ from: from.toISOString(), to: to.toISOString() });
      setIsOpen(false);
    }
  };

  const formatDisplay = () => {
    const fromDate = new Date(value.from);
    const toDate = new Date(value.to);
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    const fromStr = fromDate.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', opts);
    const toStr = toDate.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', opts);
    return `${fromStr} - ${toStr}`;
  };

  const quickSelects: { key: QuickSelect; label: string }[] = [
    { key: 'today', label: t('daterange.today') },
    { key: 'yesterday', label: t('daterange.yesterday') },
    { key: 'week', label: t('daterange.last_7_days') },
    { key: 'month', label: t('daterange.last_30_days') },
    { key: 'last_month', label: t('daterange.last_month') },
    { key: 'quarter', label: t('daterange.last_90_days') },
    { key: 'year', label: t('daterange.last_year') },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-gray-700 dark:text-gray-200">{formatDisplay()}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg overflow-hidden w-80">
          {/* Quick Select */}
          <div className="p-3 border-b border-gray-100 dark:border-slate-700">
            <p className="text-xs font-medium text-gray-400 uppercase mb-2">{t('daterange.quick_select')}</p>
            <div className="grid grid-cols-2 gap-1">
              {quickSelects.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleQuickSelect(key)}
                  className={`px-3 py-2 text-sm rounded-lg text-left transition ${
                    quickSelect === key && quickSelect !== 'custom'
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Range */}
          <div className="p-3">
            <button
              onClick={() => setQuickSelect('custom')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg mb-3 transition ${
                quickSelect === 'custom'
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('daterange.custom_range')}
            </button>

            {quickSelect === 'custom' && (
              <div className="space-y-3 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('daterange.from')}</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    max={customTo || maxDate}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('daterange.to')}</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    min={customFrom}
                    max={maxDate}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200"
                  />
                </div>
                <button
                  onClick={handleCustomApply}
                  disabled={!customFrom || !customTo}
                  className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('daterange.apply')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
