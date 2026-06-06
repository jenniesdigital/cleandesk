export interface Profile {
  id: string;
  name: string;
  role: string[];
  calendar_allowed: boolean;
  email_allowed: boolean;
  reminder_preferences: {
    before_24h: boolean;
    before_1h: boolean;
    custom_hours: number;
  };
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  is_archived: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description?: string;
  due_date: string | null; // YYYY-MM-DD
  due_time: string | null; // HH:MM
  priority: "High" | "Medium" | "Low";
  status: "To Do" | "In Progress" | "Completed";
  recurring_rule?: {
    type: "daily" | "weekly" | "monthly" | "none";
    days?: string[];
  } | null;
  sort_order?: number;
  google_calendar_event_id?: string | null;
  notes?: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CompletionLog {
  id: string;
  user_id: string;
  task_id: string;
  completed_at: string; // YYYY-MM-DD
}
