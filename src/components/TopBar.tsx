import React from 'react';
import { Users, HelpCircle, BellRing, HeartHandshake } from 'lucide-react';
import { FAMILY_MEMBERS } from '../data/mockData';

interface TopBarProps {
  onOpenReviewPanel: () => void;
  onSelectMember?: (memberId: string | null) => void;
  selectedMemberId?: string | null;
  conflictCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenReviewPanel,
  onSelectMember,
  selectedMemberId,
  conflictCount,
}) => {
  return (
    <header
      id="app-top-bar"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 pt-3 pb-2.5 transition-colors"
    >
      <div className="flex items-center justify-between">
        {/* Left: Brand & Family Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
              Famiglia Insieme
              <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-sky-100 text-sky-700 rounded-md">
                Prototipo
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-none">
              Famiglia Rossi • Settembre 2026
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Conflict Indicator Button */}
          {conflictCount > 0 && (
            <div
              className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-full text-[11px] font-medium"
              title={`${conflictCount} sovrapposizione rilevata oggi`}
            >
              <BellRing className="w-3 h-3 text-amber-600 animate-bounce" />
              <span className="font-semibold">{conflictCount} Conflitto</span>
            </div>
          )}

          {/* Discussion guide button */}
          <button
            id="btn-family-review-guide"
            onClick={onOpenReviewPanel}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-full transition-colors active:scale-95"
            title="Guida di discussione con la famiglia"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Note Famiglia</span>
            <span className="sm:hidden">Guida</span>
          </button>
        </div>
      </div>

      {/* Member quick filters / badges */}
      <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={() => onSelectMember && onSelectMember(null)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
            selectedMemberId === null || selectedMemberId === undefined
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="w-3 h-3" />
          <span>Tutti</span>
        </button>

        {FAMILY_MEMBERS.map((member) => {
          const isSelected = selectedMemberId === member.id;
          return (
            <button
              key={member.id}
              onClick={() => onSelectMember && onSelectMember(isSelected ? null : member.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium shrink-0 transition-all border ${
                isSelected
                  ? 'ring-2 ring-offset-1 ring-sky-500 bg-white shadow-xs font-semibold'
                  : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              style={{
                borderColor: isSelected ? member.color : undefined,
                color: isSelected ? member.color : undefined,
              }}
            >
              <span className="text-sm leading-none">{member.avatar}</span>
              <span>{member.name.split(' ')[0]}</span>
              {member.isDoctor && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" title="Medico" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
