export enum TaskStatus {
  PLANNED = 'מתוכנן',
  ASSIGNED = 'שויך',
  IN_PROGRESS = 'בעבודה',
  DONE = 'בוצע',
  IMPOSSIBLE = 'לא ניתן לביצוע',
  NEEDS_CHECK = 'דורש בדיקה',
}

export interface Task {
  id: string;
  date: string; // תאריך
  farm: string; // לקוח (מגדל)
  plotName: string; // שם חלקה
  plotCode: string; // קוד/ שם במשק
  vineyard: string; // כרם
  variety: string; // זן
  plantingYear: string; // שנת נטיעה
  area: string; // שטח
  agronomist: string; // אגרונום
  team: string; // צוות דיגום
  samplesCount: string; // מספר דגימות
  note: string; // הערה
  sampleType: string; // סוג דגימה
  color: string; // צבע
  
  // App specific state
  status: TaskStatus;
  workerComment?: string;
  actualSamples?: string;
  executionTime?: string;
}
