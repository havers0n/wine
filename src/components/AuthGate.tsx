import React, { FormEvent, ReactNode, useState } from 'react';
import { Database, LoaderCircle, Mail, Sprout } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading, isConfigured, message, error, sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white border border-amber-200 rounded-2xl shadow-sm p-6 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
            <Database className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-slate-900">נדרש חיבור ל-Supabase</h1>
          <p className="mt-2 text-sm text-slate-600 leading-6">
            הגדר את כתובת הפרויקט ואת המפתח הציבורי בקובץ <span dir="ltr" className="font-mono">.env.local</span>.
          </p>
          <div className="mt-4 p-3 bg-slate-900 text-slate-100 rounded-lg text-left text-xs font-mono" dir="ltr">
            VITE_SUPABASE_URL=...<br />
            VITE_SUPABASE_PUBLISHABLE_KEY=...
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-emerald-700" dir="rtl">
        <LoaderCircle className="w-8 h-8 animate-spin" aria-label="טוען" />
      </div>
    );
  }

  if (user) return <>{children}</>;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSending(true);
    try {
      await sendMagicLink(email);
    } catch {
      // The provider exposes the localized error state.
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <Sprout className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 text-center">כניסה ל-MAGOF</h1>
        <p className="mt-2 text-sm text-slate-500 text-center">קבל קישור כניסה מאובטח למייל.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label className="block text-xs font-bold text-slate-600">כתובת מייל</label>
          <div className="relative">
            <Mail className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2.5 pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="name@company.com"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={isSending}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 text-sm font-bold transition-colors"
          >
            {isSending ? 'שולח…' : 'שלח קישור כניסה'}
          </button>
        </form>

        {message && <p className="mt-4 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 p-3 rounded-lg">{message}</p>}
        {error && <p className="mt-4 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 p-3 rounded-lg">{error}</p>}
      </div>
    </div>
  );
}
