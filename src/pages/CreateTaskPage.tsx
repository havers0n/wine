import React, { useState } from 'react';
import { useTasks } from '../store/TaskContext';
import { TaskStatus } from '../types';
import { PlusCircle, Calendar as CalendarIcon, Map, Leaf, Users, CheckCircle2 } from 'lucide-react';

export default function CreateTaskPage() {
  const { tasks, setTasks } = useTasks();
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    farm: '',
    plotName: '',
    plotCode: '',
    vineyard: '',
    variety: '',
    plantingYear: '',
    area: '',
    team: '',
    agronomist: '',
    samplesCount: '1',
    sampleType: 'הבשלה',
    note: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format date from YYYY-MM-DD to DD.MM.YYYY
    let formattedDate = formData.date;
    if (formattedDate) {
      const parts = formattedDate.split('-');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
    } else {
      formattedDate = 'ללא תאריך';
    }

    const newTask = {
      id: `manual-${crypto.randomUUID()}`,
      date: formattedDate,
      farm: formData.farm,
      plotName: formData.plotName,
      plotCode: formData.plotCode,
      vineyard: formData.vineyard,
      variety: formData.variety,
      plantingYear: formData.plantingYear,
      area: formData.area,
      agronomist: formData.agronomist,
      team: formData.team,
      samplesCount: formData.samplesCount,
      note: formData.note,
      sampleType: formData.sampleType,
      color: '',
      status: TaskStatus.PLANNED,
    };

    setTasks([...tasks, newTask]);
    setSuccess(true);
    
    // Reset partial form (keep date, farm, team same to make it easy to add multiple)
    setFormData(prev => ({
      ...prev,
      plotName: '',
      plotCode: '',
      variety: '',
      plantingYear: '',
      area: '',
      samplesCount: '1',
      note: ''
    }));

    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 text-right uppercase">יצירת משימה חדשה</h1>
        <p className="text-slate-500 text-right text-xs font-bold uppercase">הוספה ידנית של משימות למערכת במקום קובץ אקסל</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="font-bold text-sm">המשימה נוצרה בהצלחה ונוספה ללוח התכנון!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Step 1: Day & General Info */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-4 text-emerald-700">
            <CalendarIcon className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-tight text-sm">1. תאריך וצוות</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">תאריך</label>
              <input 
                type="date" 
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">צוות דיגום</label>
              <input 
                type="text" 
                name="team"
                placeholder="לדוגמה: השרון"
                value={formData.team}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Farm & Plot */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-4 text-emerald-700">
            <Map className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-tight text-sm">2. פרטי משק וחלקה</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">משק / לקוח <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                name="farm"
                required
                placeholder="לדוגמה: מענית"
                value={formData.farm}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">שם כרם</label>
              <input 
                type="text" 
                name="vineyard"
                placeholder="לדוגמה: מענית - כרמל"
                value={formData.vineyard}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">שם חלקה <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                name="plotName"
                required
                placeholder="לדוגמה: מענית - ארגמן 11"
                value={formData.plotName}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">קוד חלקה <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                name="plotCode"
                required
                placeholder="לדוגמה: 40253"
                value={formData.plotCode}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Agriculture Info */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-4 text-emerald-700">
            <Leaf className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-tight text-sm">3. נתונים חקלאיים</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">זן</label>
              <input 
                type="text" 
                name="variety"
                placeholder="לדוגמה: ארגמן"
                value={formData.variety}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">שנת נטיעה</label>
              <input 
                type="text" 
                name="plantingYear"
                placeholder="2011"
                value={formData.plantingYear}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">שטח (דונם)</label>
              <input 
                type="text" 
                name="area"
                placeholder="12.0"
                value={formData.area}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">אגרונום</label>
              <input 
                type="text" 
                name="agronomist"
                placeholder="שם אגרונום"
                value={formData.agronomist}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Task Details */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4 text-emerald-700">
            <Users className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-tight text-sm">4. פרטי דיגום</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">מספר דגימות <span className="text-rose-500">*</span></label>
              <input 
                type="number" 
                name="samplesCount"
                min="1"
                required
                value={formData.samplesCount}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">סוג דגימה</label>
              <select 
                name="sampleType"
                value={formData.sampleType}
                onChange={handleChange}
                className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="הבשלה">הבשלה</option>
                <option value="אחר">אחר</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">הערה לצוות</label>
            <textarea 
              name="note"
              placeholder="הערות מיוחדות לצוות הדיגום..."
              value={formData.note}
              onChange={handleChange}
              rows={2}
              className="w-full p-2.5 rounded bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            צור משימה
          </button>
        </div>
      </form>
    </div>
  );
}
