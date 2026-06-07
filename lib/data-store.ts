import { supabase, isSupabaseConfigured } from "./supabase";
import { Profile, Project, Task, Note } from "./types";

const LOCAL_USER_ID = "local-user";

// Helper to check if client-side localStorage is available
const isBrowser = typeof window !== "undefined";

// Empty initial state — users start with a clean desk
const getInitialProjects = (): Project[] => [];

const getInitialTasks = (): Task[] => [];

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
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (!error && data) {
      setLocalData("cleandesk_projects", data);
      return data;
    }
  }

  return getLocalData<Project[]>("cleandesk_projects", getInitialProjects());
}

export async function createProject(title: string, description?: string): Promise<Project> {
  const projects = await getProjects();
  const maxOrder = projects.reduce((max, p) => Math.max(max, p.sort_order ?? -1), -1);
  const newProj: Project = {
    id: `proj-${Date.now()}`,
    user_id: LOCAL_USER_ID,
    title,
    description,
    is_archived: false,
    sort_order: maxOrder + 1,
    created_at: new Date().toISOString(),
  };
  setLocalData("cleandesk_projects", [newProj, ...projects]);

  supabaseSync(async (user) => {
    await supabase!.from("projects").insert({ ...newProj, user_id: user.id });
  });

  return newProj;
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects();
  setLocalData("cleandesk_projects", projects.filter(p => p.id !== id));

  supabaseSync(async () => {
    await supabase!.from("projects").delete().eq("id", id);
  });
}

export async function reorderProjects(orderedIds: string[]): Promise<void> {
  const projects = await getProjects();
  const updatedProjects = projects.map(p => {
    const idx = orderedIds.indexOf(p.id);
    if (idx !== -1) return { ...p, sort_order: idx };
    return p;
  });
  setLocalData("cleandesk_projects", updatedProjects);

  supabaseSync(async (user) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase!.from("projects").update({ sort_order: i }).eq("id", orderedIds[i]);
    }
  });
}

export async function archiveProject(id: string): Promise<void> {
  const projects = await getProjects();
  setLocalData("cleandesk_projects", projects.map(p => p.id === id ? { ...p, is_archived: true } : p));

  supabaseSync(async () => {
    await supabase!.from("projects").update({ is_archived: true }).eq("id", id);
  });
}

export async function unarchiveProject(id: string): Promise<void> {
  const projects = await getProjects();
  setLocalData("cleandesk_projects", projects.map(p => p.id === id ? { ...p, is_archived: false } : p));

  supabaseSync(async () => {
    await supabase!.from("projects").update({ is_archived: false }).eq("id", id);
  });
}

export async function archiveTask(id: string): Promise<Task> {
  const tasks = await getTasks();
  let archivedTask: Task | null = null;
  const updatedTasks = tasks.map(t => {
    if (t.id === id) {
      archivedTask = { ...t, is_archived: true };
      return archivedTask;
    }
    return t;
  });
  setLocalData("cleandesk_tasks", updatedTasks);

  supabaseSync(async () => {
    await supabase!.from("tasks").update({ is_archived: true }).eq("id", id);
  });

  return archivedTask || tasks.find(t => t.id === id)!;
}

export async function unarchiveTask(id: string): Promise<Task> {
  const tasks = await getTasks();
  let unarchivedTask: Task | null = null;
  const updatedTasks = tasks.map(t => {
    if (t.id === id) {
      unarchivedTask = { ...t, is_archived: false };
      return unarchivedTask;
    }
    return t;
  });
  setLocalData("cleandesk_tasks", updatedTasks);

  supabaseSync(async () => {
    await supabase!.from("tasks").update({ is_archived: false }).eq("id", id);
  });

  return unarchivedTask || tasks.find(t => t.id === id)!;
}

// Tasks APIs
export async function getTasks(): Promise<Task[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) {
      setLocalData("cleandesk_tasks", data);
      return data;
    }
  }

  return getLocalData<Task[]>("cleandesk_tasks", getInitialTasks());
}

async function supabaseSync(
  fn: (user: { id: string }) => void | Promise<void>
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) try { await fn(user); } catch {}
}

export async function createTask(task: Omit<Task, "id" | "user_id" | "created_at">): Promise<Task> {
  const tasks = await getTasks();
  const maxOrder = tasks.reduce((max, t) => Math.max(max, t.sort_order ?? 0), -1);
  const newTask: Task = {
    id: `task-${Date.now()}`,
    user_id: LOCAL_USER_ID,
    ...task,
    sort_order: task.sort_order ?? maxOrder + 1,
    created_at: new Date().toISOString(),
  };
  setLocalData("cleandesk_tasks", [...tasks, newTask]);

  supabaseSync(async (user) => {
    await supabase!.from("tasks").insert({ ...newTask, user_id: user.id });
  });

  return newTask;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
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

  supabaseSync(async (user) => {
    await supabase!.from("tasks").update(updates).eq("id", id);
  });

  return updatedTask || tasks.find(t => t.id === id)!;
}

export async function deleteTask(id: string): Promise<void> {
  const tasks = await getTasks();
  setLocalData("cleandesk_tasks", tasks.filter(t => t.id !== id));

  supabaseSync(async () => {
    await supabase!.from("tasks").delete().eq("id", id);
  });
}

export async function reorderTasks(orderedIds: string[]): Promise<void> {
  const tasks = await getTasks();
  const updatedTasks = tasks.map(t => {
    const idx = orderedIds.indexOf(t.id);
    if (idx !== -1) {
      return { ...t, sort_order: idx };
    }
    return t;
  });
  setLocalData("cleandesk_tasks", updatedTasks);

  supabaseSync(async (user) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase!.from("tasks").update({ sort_order: i }).eq("id", orderedIds[i]);
    }
  });
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

  supabaseSync(async (user) => {
    const payload = { ...savedNote, user_id: user.id };
    if (id) {
      await supabase!.from("notes").update(payload).eq("id", id);
    } else {
      await supabase!.from("notes").insert(payload);
    }
  });

  return savedNote;
}
