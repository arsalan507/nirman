'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, Users, FileText, Settings, Plus } from 'lucide-react';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/vendors', label: 'Vendors', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 pb-safe backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pt-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center py-2 text-[10px] font-semibold transition-colors ${
                active ? 'text-yellow-600' : 'text-gray-400'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className="mt-0.5">{tab.label}</span>
              {active && (
                <div className="mt-0.5 h-1 w-5 rounded-full bg-yellow-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
