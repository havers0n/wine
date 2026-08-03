import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, MapPin, Save, Trash2, X } from 'lucide-react';
import { PlanItem } from '../types';

export interface PlanItemEditorUpdates {
  date: string;
  team: string;
  coordinatorNote?: string;
}

interface PlanItemEditorProps {
  item: PlanItem;
  teams: string[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (updates: PlanItemEditorUpdates) => Promise<void>;
  onDelete: () => Promise<void>;
}

function toInputDate(displayDate: string): string {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(displayDate);
  if (!match) return '';
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function toDisplayDate(inputDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inputDate);
  if (!match) return inputDate;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export default function PlanItemEditor({
  item,
  teams,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: PlanItemEditorProps) {
  const [date, setDate] = useState(toInputDate(item.date));
  const [team, setTeam] = useState(item.team);
  const [coordinatorNote, setCoordinatorNote] = useState(item.coordinatorNote ?? '');

  useEffect(() => {
    setDate(toInputDate(item.date));
    setTeam(item.team);
    setCoordinatorNote(item.coordinatorNote ?? '');
  }, [item]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await onSave({
        date: toDisplayDate(date),
        team: team.trim(),
        coordinatorNote: coordinatorNote.trim() || undefined,
      });
    } catch {
      // PlanningContext exposes the persisted error in the application banner.
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete();
    } catch {
      // PlanningContext exposes the persisted error in the application banner.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
      dir="rtl"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-item-editor-title"
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
      >
        <header className="bg-emerald-900 text-white p-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-white/60 uppercase">עריכת נקודת תכנון</p>
            <h2 id="plan-item-editor-title" className="font-black text-lg mt-1 truncate">{item.plotName}</h2>
            <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> חלקה {item.plotCode} • {item.sector || 'ללא מגוף'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
            aria-label="סגירה"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={(event) => void handleSubmit(event)} className="p-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> תאריך עבודה</span>
              <input
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                dir="ltr"
              />
            </label>

            <label className="space-y-1.5 text-xs font-bold text-slate-600">
              <span>צוות</span>
              <input
                list="plan-team-options"
                value={team}
                onChange={(event) => setTeam(event.target.value)}
                placeholder="ללא שיוך"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="plan-team-options">
                {teams.map((teamOption) => <option key={teamOption} value={teamOption} />)}
              </datalist>
            </label>
          </div>

          <label className="block space-y-1.5 text-xs font-bold text-slate-600">
            <span>הערת מתכנן לצוות</span>
            <textarea
              value={coordinatorNote}
              onChange={(event) => setCoordinatorNote(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="מידע חשוב לפני ההגעה לחלקה"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>

          <div className="flex gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 px-4 py-2.5 text-sm font-bold"
            >
              <Trash2 className="w-4 h-4" /> מחיקת משימה
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 min-w-40 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 text-sm font-bold"
            >
              <Save className="w-4 h-4" /> {isSaving ? 'שומר…' : 'שמור שינויים'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 px-4 py-2.5 text-sm font-bold"
            >
              ביטול
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
