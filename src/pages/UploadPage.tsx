import React, { useEffect, useRef, useState } from 'react';
import { usePlanning } from '../store/PlanningContext';
import { PlanItem } from '../types';
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { cn } from '../lib/utils';
import { ExcelImportError, parseExcelWorkbook } from '../services/excelParser';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export default function UploadPage() {
  const { planItems, mergePlanItems, clearPlanItems } = usePlanning();
  const [error, setError] = useState<string | null>(null);
  const [pendingPlanItems, setPendingPlanItems] = useState<PlanItem[]>([]);
  const [droppedRows, setDroppedRows] = useState(0);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clearConfirmationTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (clearConfirmationTimeoutRef.current !== null) {
      window.clearTimeout(clearConfirmationTimeoutRef.current);
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new ExcelImportError('הקובץ גדול מדי. הגודל המרבי הוא 10MB');
      }

      const result = parseExcelWorkbook(await file.arrayBuffer());
      setPendingPlanItems(result.planItems);
      setDroppedRows(result.droppedRows);
    } catch (uploadError) {
      const message = uploadError instanceof ExcelImportError
        ? uploadError.message
        : 'אירעה שגיאה בקריאת הקובץ. אנא ודא שזהו קובץ Excel תקין.';
      setError(message);
      console.error(uploadError);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImport = () => {
    mergePlanItems(pendingPlanItems);
    setPendingPlanItems([]);
    setDroppedRows(0);
  };

  const cancelImport = () => {
    setPendingPlanItems([]);
    setDroppedRows(0);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 text-right uppercase" dir="rtl">העלאת נתוני אקסל</h1>
        <p className="text-slate-500 text-right text-xs font-bold uppercase" dir="rtl">ייבוא נקודות עבודה לתוכנית</p>
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

        {pendingPlanItems.length > 0 && (
          <div className="mt-6 bg-emerald-50 rounded-lg p-4 border border-emerald-100" dir="rtl">
            <div className="flex items-center gap-2 text-emerald-900 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm uppercase">קובץ נקרא בהצלחה</h3>
            </div>
            <p className="text-emerald-800 mb-4 text-xs font-medium">
              נמצאו {pendingPlanItems.length} נקודות תכנון תקינות
            </p>
            {droppedRows > 0 && (
              <p className="text-amber-800 mb-4 text-xs font-medium">
                {droppedRows} שורות ללא תאריך או שם חלקה לא ייובאו
              </p>
            )}
            {planItems.length > 0 && (
              <p className="text-emerald-800 mb-4 text-xs">
                נקודות קיימות עם אותו מזהה יעודכנו בלי למחוק את מצב התכנון שלהן.
              </p>
            )}
            
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
      
      {planItems.length > 0 && !pendingPlanItems.length && (
        <div className="bg-slate-800 text-white p-4 rounded-xl flex items-center justify-between" dir="rtl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wide">יש כרגע {planItems.length} נקודות בתוכנית.</span>
          </div>
          <button
            onClick={() => {
              if (isConfirmingClear) {
                clearPlanItems();
                setIsConfirmingClear(false);
              } else {
                setIsConfirmingClear(true);
                if (clearConfirmationTimeoutRef.current !== null) {
                  window.clearTimeout(clearConfirmationTimeoutRef.current);
                }
                clearConfirmationTimeoutRef.current = window.setTimeout(
                  () => setIsConfirmingClear(false),
                  3000,
                );
              }
            }}
            className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded transition-colors", isConfirmingClear ? "bg-rose-500 text-white" : "text-slate-300 hover:text-white bg-white/10")}
          >
            {isConfirmingClear ? 'לחץ שוב לאישור' : 'נקה תוכנית'}
          </button>
        </div>
      )}
    </div>
  );
}
