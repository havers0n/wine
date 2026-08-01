import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useTasks } from '../store/TaskContext';
import { Task, TaskStatus } from '../types';
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { cn } from '../lib/utils';

export default function UploadPage() {
  const { tasks, setTasks, clearTasks } = useTasks();
  const [error, setError] = useState<string | null>(null);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '', raw: true });

        if (data.length === 0) {
          setError('הקובץ ריק');
          return;
        }

        // Helper to parse and format date from Excel
        const formatDate = (rawDate: any): string => {
          if (!rawDate) return 'ללא תאריך';
          const strDate = String(rawDate).trim();
          
          // Handle '#####' from Excel which means unformatted or too wide column
          if (strDate.includes('#')) {
            return 'ללא תאריך';
          }

          let dateObj: Date | null = null;

          if (rawDate instanceof Date) {
            dateObj = rawDate;
          } else if (/^\d{5}(\.\d+)?$/.test(strDate)) {
             // Excel serial date number (e.g. 46236)
             const serial = parseFloat(strDate);
             dateObj = new Date(Math.round((serial - 25569) * 86400 * 1000));
          } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(strDate)) {
             // Handle "8/2/26" legacy format that might be cached
             const parts = strDate.split('/');
             let m = parseInt(parts[0], 10);
             let d = parseInt(parts[1], 10);
             let y = parseInt(parts[2], 10);
             if (y < 100) y += 2000;
             if (m > 12) {
               const temp = m;
               m = d;
               d = temp;
             }
             dateObj = new Date(y, m - 1, d);
          }

          if (dateObj && !isNaN(dateObj.getTime())) {
             const d = String(dateObj.getDate()).padStart(2, '0');
             const m = String(dateObj.getMonth() + 1).padStart(2, '0');
             const y = dateObj.getFullYear();
             return `${d}.${m}.${y}`;
          }

          return strDate;
        };

        // Map Excel columns to Task interface
        const parsedTasks: Task[] = data.map((row, index) => ({
          id: `task-${Date.now()}-${index}`,
          date: formatDate(row['תאריך']),
          farm: String(row['לקוח (מגדל)'] || '').trim(),
          plotName: String(row['שם חלקה'] || '').trim(),
          plotCode: String(row['קוד/ שם במשק'] || '').trim(),
          vineyard: String(row['כרם'] || '').trim(),
          variety: String(row['זן'] || '').trim(),
          plantingYear: String(row['שנת נטיעה'] || '').trim(),
          area: String(row['שטח'] || '').trim(),
          agronomist: String(row['אגרונום'] || '').trim(),
          team: String(row['צוות דיגום'] || '').trim(),
          samplesCount: String(row['מספר דגימות'] || '').trim(),
          note: String(row['הערה'] || '').trim(),
          sampleType: String(row['סוג דגימה'] || '').trim(),
          color: String(row['צבע'] || '').trim(),
          status: TaskStatus.PLANNED,
        })).filter(t => t.date && t.plotName); // basic validation

        if (parsedTasks.length === 0) {
          setError('לא נמצאו נתונים תקינים. יש לוודא שהעמודות תואמות לפורמט (תאריך, שם חלקה וכו\').');
          return;
        }

        setPendingTasks(parsedTasks);
      } catch (err) {
        setError('אירעה שגיאה בקריאת הקובץ. אנא ודא שזהו קובץ Excel תקין.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmImport = () => {
    setTasks(pendingTasks);
    setPendingTasks([]);
  };

  const cancelImport = () => {
    setPendingTasks([]);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 text-right uppercase" dir="rtl">העלאת נתוני אקסל</h1>
        <p className="text-slate-500 text-right text-xs font-bold uppercase" dir="rtl">ייבוא משימות דיגום לקואורדינטור</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="bg-emerald-50 p-4 rounded-xl">
            <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
          </div>
          
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-slate-900 uppercase" dir="rtl">בחר קובץ Excel</h3>
            <p className="text-xs text-slate-500" dir="rtl">תומך בפורמטים xlsx, xls, csv</p>
          </div>

          <label className="relative cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-bold uppercase transition-colors focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>העלה קובץ</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="sr-only"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {error && (
          <div className="mt-6 bg-rose-50 text-rose-700 p-3 rounded-lg flex items-start gap-2 border border-rose-100" dir="rtl">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        {pendingTasks.length > 0 && (
          <div className="mt-6 bg-emerald-50 rounded-lg p-4 border border-emerald-100" dir="rtl">
            <div className="flex items-center gap-2 text-emerald-900 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm uppercase">קובץ נקרא בהצלחה</h3>
            </div>
            <p className="text-emerald-800 mb-4 text-xs font-medium">
              נמצאו {pendingTasks.length} משימות דיגום תקינות
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={confirmImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-bold text-xs uppercase transition-colors flex-1"
              >
                אשר ייבוא
              </button>
              <button
                onClick={cancelImport}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded font-bold text-xs uppercase transition-colors flex-1"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>
      
      {tasks.length > 0 && !pendingTasks.length && (
        <div className="bg-slate-800 text-white p-4 rounded-xl flex items-center justify-between" dir="rtl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wide">יש כרגע {tasks.length} משימות פעילות במערכת.</span>
          </div>
          <button
            onClick={() => {
              if (isConfirmingClear) {
                clearTasks();
                setIsConfirmingClear(false);
              } else {
                setIsConfirmingClear(true);
                setTimeout(() => setIsConfirmingClear(false), 3000);
              }
            }}
            className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded transition-colors", isConfirmingClear ? "bg-rose-500 text-white" : "text-slate-300 hover:text-white bg-white/10")}
          >
            {isConfirmingClear ? 'לחץ שוב לאישור' : 'נקה משימות'}
          </button>
        </div>
      )}
    </div>
  );
}
