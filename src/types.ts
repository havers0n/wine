export enum PlanItemStatus {
  PLANNED = 'מתוכנן',
  ASSIGNED = 'שויך לצוות',
  DEFERRED = 'נדחה',
  CANCELLED = 'בוטל',
}

export enum WorkPlanStatus {
  DRAFT = 'טיוטה',
  PUBLISHED = 'פורסם',
  CLOSED = 'נסגר',
  CANCELLED = 'בוטל',
}

export interface PlanItem {
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
  plannedSamples: string; // מספר דגימות מתוכנן
  sector: string; // מגוף / אזור
  sampleType: string; // סוג דגימה
  color: string; // צבע
  coordinatorNote?: string;
  status: PlanItemStatus;
}

export interface WorkPlan {
  id: string;
  name: string;
  status: WorkPlanStatus;
  itemIds: string[];
  createdAt: string;
  updatedAt: string;
}
