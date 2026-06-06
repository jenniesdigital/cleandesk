import { supabase, isSupabaseConfigured } from "./supabase";
import { Profile, Project, Task, Note } from "./types";

const LOCAL_USER_ID = "local-user";

// Helper to check if client-side localStorage is available
const isBrowser = typeof window !== "undefined";

// Mock data generator for initial run
const getInitialProjects = (): Project[] => [
  {
    id: "proj-1",
    user_id: LOCAL_USER_ID,
    title: "Portfolio Website",
    description: "Build a sleek personal portfolio showcase",
    is_archived: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "proj-2",
    user_id: LOCAL_USER_ID,
    title: "Law Assignment",
    description: "Write paper on intellectual property in tech",
    is_archived: false,
    created_at: new Date().toISOString(),
  }
];

const getInitialTasks = (): Task[] => [
  {
    id: "task-1",
    user_id: LOCAL_USER_ID,
    project_id: "proj-1",
    title: "Draft case studies",
    description: "Write up descriptions for the 3 main marketing projects.",
    due_date: new Date().toISOString().split("T")[0],
    due_time: "14:00",
    priority: "High",
    status: "In Progress",
    created_at: new Date().toISOString(),
  },
  {
    id: "task-2",
    user_id: LOCAL_USER_ID,
    project_id: "proj-2",
    title: "Research tech law precedents",
    description: "Look up recent judgments related to software copyrights.",
    due_date: new Date().toISOString().split("T")[0],
    due_time: "10:00",
    priority: "Medium",
    status: "To Do",
    created_at: new Date().toISOString(),
  },
  {
    id: "task-3",
    user_id: LOCAL_USER_ID,
    project_id: null,
    title: "Weekly planning session",
    description: "Clean up the desk and organize upcoming deadlines.",
    due_date: new Date().toISOString().split("T")[0],
    due_time: "09:00",
    priority: "Low",
    status: "Completed",
    created_at: new Date().toISOString(),
  }
];

// LocalStorage helpers
const getLocalData = <T>(key: string, defaultValue: T): T => {
  if (!isBrowser) return defaultValue;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocalData = <T>(key: string, value: T): void => {
  if (isBrowser) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Profile APIs
export async function getProfile(): Promise<Profile | null> {
  if (isSupabaseConfigured && supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!error) return data;
    }
  }
  
  return getLocalData<Profile | null>("cleandesk_profile", null);
}

export async function saveProfile(profile: Omit<Profile, "id" | "created_at">): Promise<Profile> {
  if (isSupabaseConfigured && supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const updatedProfile = {
        id: user.id,
        ...profile,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("profiles")
        .upsert(updatedProfile)
        .select()
        .single();
      if (!error) return data;
    }
  }

  const newProfile: Profile = {
    id: LOCAL_USER_ID,
    ...profile,
    created_at: new Date().toISOString(),
  };
  setLocalData("cleandesk_profile", newProfile);
  return newProfile;
}

// Projects APIs
export async function getProjects(): Promise<Project[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) return data || [];
  }

  return getLocalData<Project[]>("cleandesk_projects", getInitialProjects());
}

export async function createProject(title: string, description?: string): Promise<Project> {
  if (isSupabaseConfigured && supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("projects")
        .insert({ title, description, user_id: user.id })
        .select()
        .single();
      if (!error) return data;
    }
  }

  const projects = await getProjects();
  const newProj: Project = {
    id: `proj-${Date.now()}`,
    user_id: LOCAL_USER_ID,
    title,
    description,
    is_archived: false,
    created_at: new Date().toISOString(),
  };
  setLocalData("cleandesk_projects", [newProj, ...projects]);
  return newProj;
}

export async function deleteProject(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("projects").delete().eq("id", id);
    return;
  }

  const projects = await getProjects();
  setLocalData("cleandesk_projects", projects.filter(p => p.id !== id));
}

// Tasks APIs
export async function getTasks(): Promise<Task[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) return data || [];
  }

  return getLocalData<Task[]>("cleandesk_tasks", getInitialTasks());
}

export async function createTask(task: Omit<Task, "id" | "user_id" | "created_at">): Promise<Task> {
  if (isSupabaseConfigured && supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...task, user_id: user.id })
        .select()
        .single();
      if (!error) return data;
    }
  }

  const tasks = await getTasks();
  const newTask: Task = {
    id: `task-${Date.now()}`,
    user_id: LOCAL_USER_ID,
    ...task,
    created_at: new Date().toISOString(),
  };
  setLocalData("cleandesk_tasks", [newTask, ...tasks]);
  return newTask;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (!error) return data;
  }

  const tasks = await getTasks();
  let updatedTask: Task | null = null;
  const updatedTasks = tasks.map(t => {
    if (t.id === id) {
      updatedTask = { ...t, ...updates };
      return updatedTask;
    }
    return t;
  });
  setLocalData("cleandesk_tasks", updatedTasks);
  return updatedTask || tasks.find(t => t.id === id)!;
}

export async function deleteTask(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("tasks").delete().eq("id", id);
    return;
  }

  const tasks = await getTasks();
  setLocalData("cleandesk_tasks", tasks.filter(t => t.id !== id));
}

// Notes APIs
export async function getNotes(projectId: string): Promise<Note[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    if (!error) return data || [];
  }

  const allNotes = getLocalData<Note[]>("cleandesk_notes", []);
  return allNotes.filter(n => n.project_id === projectId);
}

export async function saveNote(projectId: string, title: string, content: string, id?: string): Promise<Note> {
  if (isSupabaseConfigured && supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const payload = {
        project_id: projectId,
        title,
        content,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };
      const query = id 
        ? supabase.from("notes").update(payload).eq("id", id)
        : supabase.from("notes").insert(payload);
      const { data, error } = await query.select().single();
      if (!error) return data;
    }
  }

  const allNotes = getLocalData<Note[]>("cleandesk_notes", []);
  let savedNote: Note;

  if (id) {
    savedNote = {
      id,
      user_id: LOCAL_USER_ID,
      project_id: projectId,
      title,
      content,
      created_at: allNotes.find(n => n.id === id)?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLocalData("cleandesk_notes", allNotes.map(n => n.id === id ? savedNote : n));
  } else {
    savedNote = {
      id: `note-${Date.now()}`,
      user_id: LOCAL_USER_ID,
      project_id: projectId,
      title,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLocalData("cleandesk_notes", [savedNote, ...allNotes]);
  }

  return savedNote;
}
