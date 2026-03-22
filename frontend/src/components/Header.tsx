'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

interface Props {
  currentPage: string;
}

export default function Header({ currentPage }: Props) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/counts?tenant_id=${TENANT_ID}`);
      const data = await res.json();
      setUnreadCount(data.unread || 0);
    } catch (err) {
      // Ignore errors
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', active: currentPage === 'dashboard' },
    { href: '/orders', label: 'Orders', active: currentPage === 'orders' },
    { href: '/revenue', label: 'Revenue', active: currentPage === 'revenue' },
    { href: '/integrations', label: 'Integrations', active: currentPage === 'integrations' },
  ];

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl md:text-2xl font-bold text-blue-600">
            Order Hub
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Navigation */}
            <nav className="hidden md:flex gap-4 text-sm md:text-base">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={item.active ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Mobile Nav */}
            <nav className="flex md:hidden gap-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2 py-1 rounded ${item.active ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Notifications Bell */}
            <Link 
              href="/notifications" 
              className="relative p-2 hover:bg-gray-100 rounded-full"
            >
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Settings */}
            <Link href="/settings" className="p-2 hover:bg-gray-100 rounded-full">
              <span className="text-xl">⚙️</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
