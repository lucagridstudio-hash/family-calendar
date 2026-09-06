import React from 'react';
import { Home, Calendar, Stethoscope, PlusCircle, Sparkles } from 'lucide-react';
import { ActiveTab } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  conflictCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  conflictCount = 1,
}) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number }[] = [
    { id: 'home', label: 'Home', icon: Home, badge: conflictCount > 0 ? '!' : undefined },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'add', label: 'Aggiungi', icon: PlusCircle },
    { id: 'shifts', label: 'Turni Papà', icon: Stethoscope },
    { id: 'ai', label: 'Assistente AI', icon: Sparkles },
  ];

  return (
    <nav
      id="bottom-mobile-navigation"
      className="sticky bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 shadow-lg"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isAdd = tab.id === 'add';
          const Icon = tab.icon;

          if (isAdd) {
            return (
              <button
                key={tab.id}
                id={`nav-btn-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className="group relative -top-3 flex flex-col items-center justify-center focus:outline-none transition-transform active:scale-95"
                title="Aggiungi nuovo impegno"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white ring-4 ring-slate-100'
                    : 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white ring-4 ring-white group-hover:shadow-lg'
                }`}>
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-semibold text-slate-700 mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              id={`nav-btn-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                isActive
                  ? 'text-sky-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 tracking-tight ${isActive ? 'font-bold text-sky-700' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-sky-600 rounded-full mt-0.5 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
