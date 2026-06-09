"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Inbox, Clock, Sparkles, Plus, 
  Trash2, Settings, LineChart, BookOpen, 
  ArrowRight, Check, FileText,
  PanelLeftClose, PanelLeftOpen, Sun, Moon, LogOut,
  GripVertical, Archive, Search, Tag, Calendar, Columns, Upload
} from "lucide-react";
import "../dashboard.css";
import { 
  getProfile, saveProfile, getProjects, createProject, deleteProject,
  getTasks, createTask, updateTask, deleteTask, reorderTasks, reorderProjects,
  archiveTask, unarchiveTask, archiveProject, unarchiveProject,
  getNotes, saveNote, deleteNote, completeProject, reopenProject, pushToCloud, pullFromCloud
} from "@/lib/data-store";
import { Profile, Project, Task, Note } from "@/lib/types";
import { BinderLogo } from "@/lib/logo";
import ToastContainer from "@/components/toast";
import { showToast } from "@/components/toast";

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const getInitialTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    const savedTheme = localStorage.getItem("cleandesk_theme");
    if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  
  // App views
  const [activeView, setActiveView] = useState<"dashboard" | "projects" | "stats" | "settings" | "archive" | "calendar" | "kanban">("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  
  // Data States
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projectNotes, setProjectNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteTitle, setNoteTitle] = useState("");

  // Onboarding Wizard State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(1);
  const [onboardName, setOnboardName] = useState("");
  const [onboardRoles, setOnboardRoles] = useState<string[]>([]);
  const [onboardReminders, setOnboardReminders] = useState(true);
  const [onboardCalendar, setOnboardCalendar] = useState(false);

  // Form inputs
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  // Task filter tab: 'today', 'upcoming', 'completed'
  const [taskFilter, setTaskFilter] = useState<"today" | "upcoming" | "completed">("today");

  // Calendar month tab: 0 = this month, 1 = next month
  const [calendarMonth, setCalendarMonth] = useState(0);

  // AI Brain Dump States
  const [brainDumpText, setBrainDumpText] = useState("");
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    projects: { title: string; description: string }[];
    tasks: { title: string; project_title: string; priority: "High" | "Medium" | "Low"; due_date?: string }[];
  } | null>(null);

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [insertLineY, setInsertLineY] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);



  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Tag editing in detail overlay
  const [taskEditTags, setTaskEditTags] = useState<string[]>([]);

  // Calendar day detail overlay
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");

  // Task detail view state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskEditTitle, setTaskEditTitle] = useState("");
  const [taskEditNotes, setTaskEditNotes] = useState("");
  const [taskEditDueDate, setTaskEditDueDate] = useState("");
  const [taskEditPriority, setTaskEditPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [taskEditProject, setTaskEditProject] = useState("");
  const [taskEditStatus, setTaskEditStatus] = useState<"To Do" | "In Progress" | "Completed">("To Do");

  // AI Task Breakdown State
  const [breakingTaskId, setBreakingTaskId] = useState<string | null>(null);
  const [breakdownSuggestions, setBreakdownSuggestions] = useState<string[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [showThinContextHint, setShowThinContextHint] = useState(false);
  const [breakdownError, setBreakdownError] = useState("");

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const p = await getProfile();
      if (!p || searchParams.get("onboard") === "true") {
        // No local profile — check Supabase for returning user
        if (!p && searchParams.get("onboard") !== "true") {
          const cloud = await pullFromCloud();
          if (cloud.success && cloud.projects && cloud.tasks) {
            // Found cloud data — skip onboarding, use cloud data
            if (cloud.projects.length > 0) setProjects(cloud.projects);
            if (cloud.tasks.length > 0) setTasks(cloud.tasks);
            // Re-check profile after pull
            const cloudProfile = await getProfile();
            if (cloudProfile) {
              setProfile(cloudProfile);
              setOnboardName(cloudProfile.name);
              setOnboardRoles(cloudProfile.role);
              setIsLoading(false);
              return;
            }
          }
        }
        setShowOnboarding(true);
      } else {
        setProfile(p);
        setOnboardName(p.name);
        setOnboardRoles(p.role);
      }

      const projs = await getProjects();
      setProjects(projs);

      const t = await getTasks();
      setTasks(t);

      // Notify about tasks due today
      setIsLoading(false);
      const todayStr = new Date().toISOString().split("T")[0];
      const dueToday = t.filter(tk => tk.due_date === todayStr && tk.status !== "Completed" && !tk.is_archived);
      if (dueToday.length > 0 && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      if (dueToday.length > 0 && "Notification" in window && Notification.permission === "granted") {
        new Notification("CleanDesk", { body: `${dueToday.length} task${dueToday.length > 1 ? "s" : ""} due today.`, icon: "/favicon.ico" });
      }
    }
    loadData();

    const calendarStatus = searchParams.get("calendar");
    if (calendarStatus === "connected") {
      alert("Google Calendar connected successfully!");
      setProfile(prev => prev ? { ...prev, calendar_allowed: true } : null);
    } else if (calendarStatus === "denied") {
      alert("Calendar connection was cancelled.");
    } else if (calendarStatus === "error") {
      alert("Failed to connect Calendar. Please try again.");
    }

    // Clean up query params after fresh sign-in
    if (searchParams.get("fresh_signin") === "true") {
      router.replace("/dashboard");
      // Push local data to cloud, then pull cloud data
      pushToCloud().then(async pushRes => {
        if (pushRes.success) {
          const pullRes = await pullFromCloud();
          if (pullRes.success && pullRes.projects && pullRes.tasks) {
            setProjects(pullRes.projects);
            setTasks(pullRes.tasks);
          }
        }
      });
    }
  }, [searchParams]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("cleandesk_theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  };

  // Load notes when project changes
  useEffect(() => {
    if (activeProject) {
      const projectId = activeProject.id; // capture id to avoid nullability issues
      async function loadNotes() {
        const notes = await getNotes(projectId);
        setProjectNotes(notes);
        if (notes.length > 0) {
          setActiveNote(notes[0]);
          setNoteTitle(notes[0].title);
          setNoteContent(notes[0].content);
        } else {
          setActiveNote(null);
          setNoteTitle("Untitled Note");
          setNoteContent("");
        }
      }
      loadNotes();
    }
  }, [activeProject]);

  // Handle Onboarding Completion
  const handleOnboardingSubmit = async () => {
    const defaultProfile = {
      name: onboardName || "CleanDesk User",
      role: onboardRoles.length > 0 ? onboardRoles : ["General"],
      calendar_allowed: onboardCalendar,
      email_allowed: onboardReminders,
      reminder_preferences: {
        before_24h: onboardReminders,
        before_1h: onboardReminders,
        custom_hours: 0
      }
    };
    const saved = await saveProfile(defaultProfile);
    setProfile(saved);
    setShowOnboarding(false);
    // Fire welcome email if we can get the user's email
    (async () => {
      try {
        const { supabase, isSupabaseConfigured } = await import("@/lib/supabase");
        if (isSupabaseConfigured && supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            fetch("/api/email/welcome", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: user.email, name: onboardName }),
            }).catch(() => {});
          }
        }
      } catch {}
    })();
    // Clear url query params
    router.replace("/dashboard");
  };

  // Toggle roles in onboarding
  const toggleOnboardRole = (role: string) => {
    setOnboardRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  // Add a task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    const newTask = await createTask({
      project_id: newTaskProject || null,
      title: newTaskTitle,
      description: "",
      due_date: newTaskDueDate || new Date().toISOString().split("T")[0],
      due_time: "12:00",
      priority: newTaskPriority,
      status: "To Do",
    });

    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle("");
    setNewTaskDueDate("");

    // Push to Google Calendar if the user has calendar enabled
    if (profile?.calendar_allowed) {
      try {
        const { supabase, isSupabaseConfigured } = await import("@/lib/supabase");
        if (isSupabaseConfigured && supabase) {
          const { data: tokenData } = await supabase!
            .from("user_tokens")
            .select("provider_token")
            .eq("user_id", newTask.user_id)
            .single();

          if (tokenData?.provider_token) {
            fetch("/api/calendar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: newTask.title,
                date: newTask.due_date,
                description: newTask.description,
                providerToken: tokenData.provider_token,
              }),
            }).catch(() => {});
          }
        }
      } catch {}
    }
  };

  // Toggle task complete
  const handleToggleTask = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Completed" ? "To Do" : "Completed";
    const now = new Date();
    const updated = await updateTask(id, { 
      status: newStatus, 
      completed_at: newStatus === "Completed" ? now.toISOString() : null 
    });
    setTasks(prev => prev.map(t => t.id === id ? updated : t));

    // Recurring task: auto-create next occurrence when marked done
    if (newStatus === "Completed") {
      const task = tasks.find(t => t.id === id);
      if (task?.recurring_rule && task.recurring_rule.type !== "none") {
        const nextDate = new Date(task.due_date || now.toISOString().split("T")[0]);
        if (task.recurring_rule.type === "daily") nextDate.setDate(nextDate.getDate() + 1);
        else if (task.recurring_rule.type === "weekly") nextDate.setDate(nextDate.getDate() + 7);
        else if (task.recurring_rule.type === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
        const nextTask = await createTask({
          project_id: task.project_id,
          title: task.title,
          description: task.description || "",
          due_date: nextDate.toISOString().split("T")[0],
          due_time: task.due_time || "12:00",
          priority: task.priority,
          status: "To Do",
          tags: task.tags || [],
          recurring_rule: task.recurring_rule,
        });
        setTasks(prev => [nextTask, ...prev]);
        showToast({ text: `Recurring "${task.title}" created for ${nextDate.toISOString().split("T")[0]}` });
      }
    }
  };

  // Delete a task (with undo)
  const handleDeleteTask = async (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;
    await deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    showToast({
      text: `"${taskToDelete.title}" deleted`,
      action: {
        label: "Undo",
        onClick: async () => {
          const restored = await createTask({
            project_id: taskToDelete.project_id,
            title: taskToDelete.title,
            description: taskToDelete.description,
            due_date: taskToDelete.due_date,
            due_time: taskToDelete.due_time || "12:00",
            priority: taskToDelete.priority,
            status: taskToDelete.status,
            tags: taskToDelete.tags || [],
          });
          setTasks(prev => [restored, ...prev]);
        }
      }
    });
  };

  // Task detail view handlers
  const activeTask = tasks.find(t => t.id === activeTaskId) || null;

  const openTask = (taskId: string) => {
    const t = tasks.find(t => t.id === taskId);
    if (!t) return;
    setActiveTaskId(taskId);
    setTaskEditTitle(t.title);
    setTaskEditNotes(t.notes || "");
    setShowThinContextHint(false);
    setBreakdownError("");
    setTaskEditDueDate(t.due_date || "");
    setTaskEditPriority(t.priority);
    setTaskEditProject(t.project_id || "");
    setTaskEditStatus(t.status);
    setTaskEditTags(t.tags || []);
  };

  const closeTask = () => {
    setActiveTaskId(null);
    setBreakingTaskId(null);
    setShowThinContextHint(false);
  };

  const saveTask = async () => {
    if (!activeTaskId) return;
    const updated = await updateTask(activeTaskId, {
      title: taskEditTitle,
      notes: taskEditNotes,
      due_date: taskEditDueDate || null,
      priority: taskEditPriority,
      project_id: taskEditProject || null,
      status: taskEditStatus,
      tags: taskEditTags,
    });
    setTasks(prev => prev.map(t => t.id === activeTaskId ? updated : t));
  };

  // Drag & Drop handlers
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    setDragOverTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      handleDragEnd();
      return;
    }

    const activeTasks = tasks.filter(t => t.status !== "Completed");
    const draggedIdx = activeTasks.findIndex(t => t.id === draggedTaskId);
    const targetIdx = activeTasks.findIndex(t => t.id === targetTaskId);
    if (draggedIdx === -1 || targetIdx === -1) {
      handleDragEnd();
      return;
    }

    const [moved] = activeTasks.splice(draggedIdx, 1);
    activeTasks.splice(targetIdx, 0, moved);

    const completedTasksList = tasks.filter(t => t.status === "Completed");
    const reorderedTasks = [...activeTasks, ...completedTasksList];
    const newOrder = reorderedTasks.map((t, i) => ({ ...t, sort_order: i }));
    setTasks(newOrder);

    await reorderTasks(newOrder.map(t => t.id));
    handleDragEnd();
  };

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    const newProj = await createProject(newProjectTitle, newProjectDesc);
    setProjects(prev => [newProj, ...prev]);
    setNewProjectTitle("");
    setNewProjectDesc("");
  };

  // Delete Project
  const handleDeleteProject = async (id: string) => {
    if (confirm("Are you sure you want to delete this project and all its notes?")) {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(null);
      }
    }
  };

  // Sync local data to cloud
  const [syncing, setSyncing] = useState(false);
  const syncToCloud = async () => {
    setSyncing(true);
    // Push local data to Supabase
    const pushResult = await pushToCloud();
    if (!pushResult.success) {
      setSyncing(false);
      showToast({ text: pushResult.message || "Sync failed" });
      return;
    }
    // Pull remote data from Supabase
    const pullResult = await pullFromCloud();
    if (pullResult.success) {
      if (pullResult.projects) setProjects(pullResult.projects);
      if (pullResult.tasks) setTasks(pullResult.tasks);
      showToast({ text: "Sync complete" });
    } else {
      showToast({ text: pullResult.message || "Pull failed" });
    }
    setSyncing(false);
  };

  // Save active note
  const handleSaveNote = async () => {
    if (!activeProject) return;
    const saved = await saveNote(
      activeProject.id, 
      noteTitle || "Untitled Note", 
      noteContent, 
      activeNote?.id
    );
    setProjectNotes(prev => 
      activeNote 
        ? prev.map(n => n.id === saved.id ? saved : n)
        : [saved, ...prev]
    );
    setActiveNote(saved);
  };

  // Delete a note
  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
    setProjectNotes(prev => prev.filter(n => n.id !== noteId));
    if (activeNote?.id === noteId) {
      setActiveNote(null);
      setNoteTitle("Untitled Note");
      setNoteContent("");
    }
  };

  // Auto-save current note when switching notes within the same project
  const autoSaveNote = useRef(false);
  const prevActiveNoteRef = useRef<string | null>(null);
  const prevProjectRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoSaveNote.current) { autoSaveNote.current = true; prevProjectRef.current = activeProject?.id || null; return; }
    const currentProjectId = activeProject?.id || null;
    const previousProjectId = prevProjectRef.current;
    prevProjectRef.current = currentProjectId;
    // Only auto-save if we're still in the same project (switching between notes, not switching projects)
    if (currentProjectId === previousProjectId && prevActiveNoteRef.current && prevActiveNoteRef.current !== activeNote?.id) {
      handleSaveNote();
    }
    prevActiveNoteRef.current = activeNote?.id || null;
  }, [activeNote?.id, activeProject?.id]);

  // Create new blank note
  const handleNewNote = () => {
    setActiveNote(null);
    setNoteTitle("Untitled Note");
    setNoteContent("");
  };

  // AI Brain Dump Simulation & Execution
  const handleBrainDump = async () => {
    if (!brainDumpText.trim()) return;
    setIsAIProcessing(true);
    setAiSuggestions(null);

    // Call API Route if Gemini key is available.
    // If not, we simulate locally using keyword matching to be robust!
    try {
      const response = await fetch("/api/ai/brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: brainDumpText, roles: profile?.role }),
      });

      if (response.ok) {
        const result = await response.json();
        setAiSuggestions(result);
      } else {
        // Run fallback simulation
        simulateLocalBrainDump();
      }
    } catch {
      simulateLocalBrainDump();
    } finally {
      setIsAIProcessing(false);
    }
  };

  const simulateLocalBrainDump = () => {
    // Basic string parser that divides commas or keywords
    const text = brainDumpText.toLowerCase();
    const suggestions: {
      projects: { title: string; description: string }[];
      tasks: { title: string; project_title: string; priority: "High" | "Medium" | "Low"; due_date?: string }[];
    } = { projects: [], tasks: [] };

    // Identify project templates based on keywords
    if (text.includes("post") || text.includes("linkedin") || text.includes("content") || text.includes("blog")) {
      suggestions.projects.push({ title: "Content Strategy", description: "Articles and posts" });
    }
    if (text.includes("portfolio") || text.includes("pmm") || text.includes("design") || text.includes("logo") || text.includes("brand")) {
      suggestions.projects.push({ title: "Portfolio Website", description: "Design work and cases" });
    }
    if (text.includes("launch") || text.includes("campaign") || text.includes("product") || text.includes("release")) {
      suggestions.projects.push({ title: "Product Launch", description: "New product or feature release" });
    }

    // Split text by common separators
    const clauses = brainDumpText.split(/,|\band\b|;|\bthen\b/i);
    clauses.forEach((c, idx) => {
      const cleaned = c.trim();
      if (cleaned.length < 5) return;

      // Classify to projects
      let projTitle = "General Desk";
      if (cleaned.toLowerCase().match(/post|linkedin|content|blog/)) {
        projTitle = "Content Strategy";
      } else if (cleaned.toLowerCase().match(/portfolio|pmm|design|logo|brand/)) {
        projTitle = "Portfolio Website";
      } else if (cleaned.toLowerCase().match(/launch|campaign|product|release/)) {
        projTitle = "Product Launch";
      }

      // Add project automatically if not exist in suggestions
      if (projTitle !== "General Desk" && !suggestions.projects.find(p => p.title === projTitle)) {
        suggestions.projects.push({ title: projTitle, description: "Auto-created via Brain Dump" });
      }

      suggestions.tasks.push({
        title: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
        project_title: projTitle,
        priority: idx % 3 === 0 ? "High" : idx % 2 === 0 ? "Medium" : "Low",
        due_date: new Date().toISOString().split("T")[0]
      });
    });

    setAiSuggestions(suggestions);
  };

  const approveAISuggestions = async () => {
    if (!aiSuggestions) return;

    // 1. Create Projects
    const createdProjectMap: { [key: string]: string } = {};
    
    // Add existing projects to the map
    projects.forEach(p => {
      createdProjectMap[p.title] = p.id;
    });

    for (const pSuggest of aiSuggestions.projects) {
      if (!createdProjectMap[pSuggest.title]) {
        const newProj = await createProject(pSuggest.title, pSuggest.description);
        createdProjectMap[pSuggest.title] = newProj.id;
        setProjects(prev => [newProj, ...prev]);
      }
    }

    // 2. Create Tasks
    for (const tSuggest of aiSuggestions.tasks) {
      const projectID = createdProjectMap[tSuggest.project_title] || null;
      const newTask = await createTask({
        project_id: projectID,
        title: tSuggest.title,
        description: `Organized via AI Brain Dump`,
        due_date: tSuggest.due_date || new Date().toISOString().split("T")[0],
        due_time: "12:00",
        priority: tSuggest.priority,
        status: "To Do",
      });
      setTasks(prev => [newTask, ...prev]);
    }

    setAiSuggestions(null);
    setBrainDumpText("");
  };

  // AI Task Breakdown API Call
  const handleTaskBreakdown = async (taskId: string) => {
    setBreakingTaskId(taskId);
    setIsBreakingDown(true);
    setBreakdownSuggestions([]);
    setShowThinContextHint(false);
    setBreakdownError("");

    const words = (taskEditTitle + " " + taskEditNotes).trim().split(/\s+/).length;
    if (words < 8) {
      setBreakdownSuggestions([]);
      setIsBreakingDown(false);
      setBreakingTaskId(null);
      setShowThinContextHint(true);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("/api/ai/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskTitle: taskEditTitle, taskNotes: taskEditNotes, roles: profile?.role }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const result = await response.json();
      if (response.ok) {
        setBreakdownSuggestions(result.subtasks);
      } else if (result.error === "thin_context") {
        setShowThinContextHint(true);
      } else {
        setBreakdownError(result.error || "Could not break down this task.");
      }
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "AbortError"
        ? "Request timed out. Check your API configuration."
        : "Could not reach the AI service.";
      setBreakdownError(msg);
    } finally {
      setIsBreakingDown(false);
    }
  };

  const simulateLocalBreakdown = (title: string) => {
    // Simple local breakdown examples
    const sampleBreakdowns: { [key: string]: string[] } = {
      "build product marketing portfolio": [
        "Select case studies and templates",
        "Draft descriptions for the main jobs",
        "Compile slides and assets",
        "Set up the landing page content",
        "Verify styling and preview site"
      ],
      "plan product launch": [
        "Define target audience and key messaging",
        "Create launch timeline and milestones",
        "Prepare marketing materials and assets",
        "Coordinate with stakeholders and teams",
        "Execute launch and monitor results"
      ]
    };

    const cleanTitle = title.toLowerCase().trim();
    const result = sampleBreakdowns[cleanTitle] || [
      "Define requirements and goals",
      "Draft first outline",
      "Create supporting assets",
      "Review and refine output",
      "Submit or execute step"
    ];

    setBreakdownSuggestions(result);
  };

  const addBreakdownToNotes = () => {
    const formatted = breakdownSuggestions.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const header = `## AI Breakdown\n\n${formatted}\n\n---\n\n`;
    setTaskEditNotes(prev => header + prev);
    setBreakdownSuggestions([]);
  };

  // Stats Calculator (excludes archived items)
  const activeTasks = tasks.filter(t => !t.is_archived);
  const totalTasks = activeTasks.length;
  const completedTasks = activeTasks.filter(t => t.status === "Completed").length;
  const activeTasksCount = activeTasks.filter(t => t.status !== "Completed").length;
  const tasksDueToday = activeTasks.filter(t => {
    const todayStr = new Date().toISOString().split("T")[0];
    return t.due_date === todayStr && t.status !== "Completed";
  }).length;
  const activeProjectsCount = projects.filter(p => !p.is_archived).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Search-matched tasks (for project/task filtering)
  const q = searchQuery.toLowerCase().trim();
  const matchesSearch = (t: Task) => !q || t.title.toLowerCase().includes(q) || (t.tags || []).some(tag => tag.toLowerCase().includes(q));

  // Filter tasks list based on active filter tabs (always excludes archived)
  const filteredTasks = tasks.filter(t => {
    if (t.is_archived) return false;
    if (!matchesSearch(t)) return false;
    const todayStr = new Date().toISOString().split("T")[0];
    if (taskFilter === "today") {
      return t.due_date === todayStr && t.status !== "Completed";
    }
    if (taskFilter === "upcoming") {
      return (t.due_date !== todayStr || !t.due_date) && t.status !== "Completed";
    }
    // "Completed" tab: only tasks done in the past 7 days
    if (t.status === "Completed") {
      if (!t.completed_at) return false;
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(t.completed_at).getTime() > weekAgo;
    }
    return false;
  });

  return (
    <div className={`dashboard-container ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Loading state */}
      {isLoading && !showOnboarding && (
        <div className="loading-skeleton">
          <div className="spinner" />
          <p>Loading your workspace...</p>
        </div>
      )}

      {!isLoading && (
      <>
      {/* 1. ONBOARDING OVERLAY */}
      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-card">
            {onboardStep === 1 && (
              <div>
                <Sparkles size={32} style={{ color: "var(--brand-accent)", marginBottom: "1rem" }} />
                <h2 style={{ marginBottom: "0.5rem" }}>Welcome to CleanDesk</h2>
                <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
                  Let&apos;s set up your clean, focused space. What should we call you?
                </p>
                <div className="form-group" style={{ textAlign: "left" }}>
                  <label className="form-label">Name or Nickname</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Your name" 
                    value={onboardName}
                    onChange={(e) => setOnboardName(e.target.value)}
                  />
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ width: "100%", marginTop: "1rem" }}
                  onClick={() => setOnboardStep(2)}
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            )}

            {onboardStep === 2 && (
              <div>
                <BookOpen size={32} style={{ color: "var(--brand-accent)", marginBottom: "1rem" }} />
                <h2 style={{ marginBottom: "0.5rem" }}>What do you do?</h2>
                <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
                  Select all that describe your current roles (we use this to customize suggestions).
                </p>
                <div className="role-grid">
                  {["Freelancer", "Solopreneur", "Student", "Creator", "Marketer", "Professional"].map(role => (
                    <button
                      key={role}
                      className={`role-btn ${onboardRoles.includes(role) ? "selected" : ""}`}
                      onClick={() => toggleOnboardRole(role)}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setOnboardStep(1)}>
                    Back
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setOnboardStep(3)}>
                    Next <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {onboardStep === 3 && (
              <div>
                <Settings size={32} style={{ color: "var(--brand-accent)", marginBottom: "1rem" }} />
                <h2 style={{ marginBottom: "0.5rem" }}>Preferences</h2>
                <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
                  How would you like CleanDesk to support you?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", textAlign: "left", marginBottom: "2rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={onboardReminders} 
                      onChange={(e) => setOnboardReminders(e.target.checked)}
                      style={{ width: "16px", height: "16px", accentColor: "var(--brand-accent)" }}
                    />
                    <div>
                      <strong>Email Reminders</strong>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Receive alerts 24 hours and 1 hour before due dates.</p>
                    </div>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={onboardCalendar} 
                      onChange={(e) => setOnboardCalendar(e.target.checked)}
                      style={{ width: "16px", height: "16px", accentColor: "var(--brand-accent)" }}
                    />
                    <div>
                      <strong>Google Calendar Sync</strong>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Allow adding tasks directly as events to your Google Calendar.</p>
                    </div>
                  </label>
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setOnboardStep(2)}>
                    Back
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleOnboardingSubmit}>
                    Enter Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <BinderLogo size={34} />
            <span className="brand-name">CleanDesk</span>
          </div>
          <nav className="sidebar-nav">
            <button 
              className={`sidebar-link ${activeView === "dashboard" ? "active" : ""}`}
              onClick={() => { setActiveView("dashboard"); setActiveProject(null); }}
              title="Dashboard"
            >
              <Inbox size={18} /> <span>Dashboard</span>
            </button>
            <button 
              className={`sidebar-link ${activeView === "projects" ? "active" : ""}`}
              onClick={() => setActiveView("projects")}
              title="Projects"
            >
              <BookOpen size={18} /> <span>Projects</span>
            </button>
            <button 
              className={`sidebar-link ${activeView === "calendar" ? "active" : ""}`}
              onClick={() => setActiveView("calendar")}
              title="Calendar"
            >
              <Calendar size={18} /> <span>Calendar</span>
            </button>
            <button 
              className={`sidebar-link ${activeView === "kanban" ? "active" : ""}`}
              onClick={() => setActiveView("kanban")}
              title="Kanban"
            >
              <Columns size={18} /> <span>Kanban</span>
            </button>
            <button 
              className={`sidebar-link ${activeView === "stats" ? "active" : ""}`}
              onClick={() => setActiveView("stats")}
              title="Statistics"
            >
              <LineChart size={18} /> <span>Statistics</span>
            </button>
            <button 
              className={`sidebar-link ${activeView === "settings" ? "active" : ""}`}
              onClick={() => setActiveView("settings")}
              title="Settings"
            >
              <Settings size={18} /> <span>Settings</span>
            </button>
            <div style={{ borderTop: "1px solid var(--border-color)", margin: "0.5rem 0.75rem" }}></div>
            <button 
              className={`sidebar-link ${activeView === "archive" ? "active" : ""}`}
              onClick={() => setActiveView("archive")}
              title="Archive"
            >
              <Archive size={18} /> <span>Archive</span>
            </button>
          </nav>
        </div>

        {profile && (
          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-profile-text">
              <div className="sidebar-name">{profile.name}</div>
              <div className="sidebar-role">{profile.role[0]}</div>
            </div>
          </div>
        )}
      </aside>

      {/* 3. MAIN WORKSPACE */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-title-group">
            <button
              className={`icon-btn ${sidebarPinned ? "active" : ""}`}
              onClick={() => {
                setSidebarPinned(prev => !prev);
                setIsSidebarCollapsed(prev => !prev);
              }}
              aria-label={sidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
              title={sidebarPinned ? "Unpin sidebar (auto-hide)" : "Pin sidebar (always visible)"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <div>
              <h1>
                {activeProject ? activeProject.title : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
              </h1>
              <p>
                {activeProject 
                  ? activeProject.description || "Project Workspace"
                  : `Welcome back, ${profile?.name || "there"}! Your desk is clear.`}
              </p>
            </div>
          </div>
          <div className="search-bar">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search tasks, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && <button className="btn btn-ghost" style={{ padding: 0, fontSize: "1rem", lineHeight: 1, opacity: 0.5 }} onClick={() => setSearchQuery("")}>×</button>}
          </div>
          <div className="dashboard-header-actions">
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: "0.85rem" }} onClick={syncToCloud} disabled={syncing} title="Sync local data to cloud">
              <Upload size={14} /> {syncing ? "Syncing..." : "Sync"}
            </button>
            <a href="/auth/signout" className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
              <LogOut size={14} /> Sign out
            </a>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="dashboard-content">
          
          {/* VIEW: DASHBOARD */}
          {activeView === "dashboard" && (
            <div>
              {/* Summary stats */}
              <div className="metrics-grid">
                <div className="paper-card metric-card">
                  <div className="metric-label">Total Tasks</div>
                  <div className="metric-value">{totalTasks}</div>
                </div>
                <div className="paper-card metric-card">
                  <div className="metric-label">Tasks Done</div>
                  <div className="metric-value">{completedTasks}</div>
                </div>
                <div className="paper-card metric-card">
                  <div className="metric-label">Due Today</div>
                  <div className="metric-value" style={{ color: tasksDueToday > 0 ? "var(--color-error)" : "inherit" }}>
                    {tasksDueToday}
                  </div>
                </div>
                <div className="paper-card metric-card">
                  <div className="metric-label">Active Projects</div>
                  <div className="metric-value">{activeProjectsCount}</div>
                </div>
                <div className="paper-card metric-card">
                  <div className="metric-label">Success Rate</div>
                  <div className="metric-value" style={{ color: "var(--color-success)" }}>
                    {completionRate}%
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${completionRate}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Main Grid */}
              <div className="dashboard-grid">
                
                {/* Left panel: Task Manager */}
                <div>
                  <div className="tabs-header">
                    <button 
                      className={`tab-btn ${taskFilter === "today" ? "active" : ""}`}
                      onClick={() => setTaskFilter("today")}
                    >
                      Today&apos;s Focus
                    </button>
                    <button 
                      className={`tab-btn ${taskFilter === "upcoming" ? "active" : ""}`}
                      onClick={() => setTaskFilter("upcoming")}
                    >
                      Upcoming
                    </button>
                    <button 
                      className={`tab-btn ${taskFilter === "completed" ? "active" : ""}`}
                      onClick={() => setTaskFilter("completed")}
                    >
                      Done ({completedTasks})
                    </button>
                  </div>

                  {/* Quick Task creation */}
                  <div className="quick-add-form">
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Add a task to To Do..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
                    />
                    <select 
                      className="form-input"
                      value={newTaskProject}
                      onChange={(e) => setNewTaskProject(e.target.value)}
                      style={{ maxWidth: "160px" }}
                    >
                      <option value="">No Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                    <button className="btn btn-primary" onClick={handleAddTask}>
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Task list render */}
                  {filteredTasks.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-muted)" }}>
                      {taskFilter === "today" && (
                        <>
                          <Inbox size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.3 }} />
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Your desk is clear.</p>
                          <p style={{ fontSize: "0.8rem" }}>Nothing due today. Try the brain dump to get ahead.</p>
                        </>
                      )}
                      {taskFilter === "upcoming" && (
                        <>
                          <Sparkles size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.3 }} />
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Nothing on the horizon.</p>
                          <p style={{ fontSize: "0.8rem" }}>Future tasks will show up here once you add them.</p>
                        </>
                      )}
                      {taskFilter === "completed" && (
                        <>
                          <Check size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.3 }} />
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>No tasks done yet.</p>
                          <p style={{ fontSize: "0.8rem" }}>Complete a task to see it here.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div>
                      {filteredTasks.map(t => (
                        <div
                          key={t.id}
                          className={`task-item ${draggedTaskId === t.id ? "dragging" : ""} ${dragOverTaskId === t.id ? "drag-over" : ""}`}
                          draggable={t.status !== "Completed"}
                          onDragStart={() => handleDragStart(t.id)}
                          onDragOver={(e) => handleDragOver(e, t.id)}
                          onDrop={(e) => handleDrop(e, t.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="task-checkbox-container">
                            {t.status !== "Completed" && (
                              <div className="task-drag-handle">
                                <GripVertical size={14} />
                              </div>
                            )}
                            <button 
                              className={`task-checkbox ${t.status === "Completed" ? "checked" : ""}`}
                              onClick={() => handleToggleTask(t.id, t.status)}
                            >
                              {t.status === "Completed" && <Check size={12} />}
                            </button>
                            <div>
                              <div
                                className={`task-title-text ${t.status === "Completed" ? "completed" : ""}`}
                                onClick={() => openTask(t.id)}
                                style={{ cursor: "pointer" }}
                              >
                                {t.title}
                              </div>
                              {t.description && <div className="task-desc">{t.description}</div>}
                              <div className="task-meta">
                                {t.project_id && (
                                  <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--brand-accent)" }}>
                                    #{projects.find(p => p.id === t.project_id)?.title}
                                  </span>
                                )}
                                {t.due_date ? (
                                  <span
                                    style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}
                                    onClick={(e) => { e.stopPropagation(); const d = prompt("New due date (YYYY-MM-DD):", t.due_date ?? undefined); if (d) { updateTask(t.id, { due_date: d }); setTasks(prev => prev.map(t2 => t2.id === t.id ? { ...t2, due_date: d } : t2)); } }}
                                    title="Click to change date"
                                  >
                                    <Clock size={10} /> {t.due_date}
                                  </span>
                                ) : (
                                  <span
                                    style={{ fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer", opacity: 0.5 }}
                                    onClick={(e) => { e.stopPropagation(); const d = prompt("Set due date (YYYY-MM-DD):"); if (d) { updateTask(t.id, { due_date: d }); setTasks(prev => prev.map(t2 => t2.id === t.id ? { ...t2, due_date: d } : t2)); } }}
                                    title="Add due date"
                                  >
                                    <Clock size={10} /> Set date
                                  </span>
                                )}
                                <span
                                  className={`badge badge-${t.priority.toLowerCase()}`}
                                  style={{ cursor: "pointer" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const cycle: Record<string, "High" | "Medium" | "Low"> = { High: "Medium", Medium: "Low", Low: "High" };
                                    const nextPri = cycle[t.priority];
                                    updateTask(t.id, { priority: nextPri });
                                    setTasks(prev => prev.map(t2 => t2.id === t.id ? { ...t2, priority: nextPri } : t2));
                                  }}
                                  title="Click to cycle priority"
                                >
                                  {t.priority}
                                </span>
                                {(t.tags || []).length > 0 && t.tags!.map(tag => (
                                  <span key={tag} style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "var(--radius-full)", backgroundColor: "var(--brand-accent-light)", color: "var(--brand-accent)" }}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="task-actions">
                            {t.is_archived ? (
                              <button
                                onClick={async () => { const ut = await unarchiveTask(t.id); setTasks(prev => prev.map(t2 => t2.id === t.id ? ut : t2)); }}
                                className="btn btn-ghost"
                                style={{ padding: "0.25rem", color: "var(--color-success)" }}
                                title="Restore task"
                              >
                                <Archive size={14} />
                              </button>
                            ) : (
                              <>
                                <button 
                                  onClick={() => openTask(t.id)}
                                  className="btn btn-ghost" 
                                  style={{ padding: "0.25rem", color: "var(--brand-accent)" }}
                                  title="Open task detail"
                                >
                                  <Sparkles size={14} />
                                </button>
                                <button
                                  onClick={async () => { const at = await archiveTask(t.id); setTasks(prev => prev.map(t2 => t2.id === t.id ? at : t2)); }}
                                  className="btn btn-ghost"
                                  style={{ padding: "0.25rem", color: "var(--text-muted)" }}
                                  title="Archive task"
                                >
                                  <Archive size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="btn btn-ghost" 
                                  style={{ padding: "0.25rem", color: "var(--color-error)" }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                {/* Right panel: Brain Dump Widget */}
                <div>
                  <div className="brain-dump-widget">
                    <div style={{ display: "flex", justifyItems: "center", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <Sparkles size={16} style={{ color: "var(--brand-accent)" }} />
                      <h3 style={{ fontSize: "1.1rem" }}>AI Brain Dump</h3>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                      Dump your thoughts in plain text. CleanDesk will automatically structure them into projects and tasks.
                    </p>
                    <textarea 
                      id="brain-dump-input"
                      className="brain-dump-input"
                      placeholder="e.g. I need to design the website logo, draft two marketing emails, and prepare client slides by tomorrow morning."
                      value={brainDumpText}
                      onChange={(e) => setBrainDumpText(e.target.value)}
                    ></textarea>
                    
                    {isAIProcessing ? (
                      <div className="typewriter-container" style={{ padding: "1rem" }}>
                        <div className="typewriter-text">Organizing your desk...</div>
                      </div>
                    ) : (
                      <button 
                        className="btn btn-primary" 
                        style={{ width: "100%" }}
                        onClick={handleBrainDump}
                        disabled={!brainDumpText.trim()}
                      >
                        Let&apos;s organize that
                      </button>
                    )}

                    {/* AI Suggestions Review */}
                    {aiSuggestions && (
                      <div className="paper-card" style={{ marginTop: "1.5rem", backgroundColor: "var(--bg-workspace)", padding: "1.25rem" }}>
                        <h4 style={{ fontSize: "0.9rem", color: "var(--brand-accent)", marginBottom: "0.75rem", fontFamily: "var(--font-mono)" }}>
                          PROPOSED STRUCTURE
                        </h4>
                        
                        {aiSuggestions.projects.length > 0 && (
                          <div style={{ marginBottom: "0.75rem" }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>NEW PROJECTS</div>
                            {aiSuggestions.projects.map((p, idx) => (
                              <div key={idx} style={{ fontSize: "0.85rem", fontWeight: 600 }}>+ {p.title}</div>
                            ))}
                          </div>
                        )}

                        {aiSuggestions.tasks.length > 0 && (
                          <div style={{ marginBottom: "1rem" }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>TASKS TO ADD</div>
                            {aiSuggestions.tasks.map((t, idx) => (
                              <div key={idx} style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between" }}>
                                <span>- {t.title}</span>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>({t.project_title})</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button className="btn btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }} onClick={() => setAiSuggestions(null)}>
                            Reject
                          </button>
                          <button className="btn btn-primary" style={{ flex: 1, fontSize: "0.8rem" }} onClick={approveAISuggestions}>
                            Approve
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: PROJECTS */}
          {activeView === "projects" && (
            <div>
              {!activeProject ? (
                <div>
                  <form onSubmit={handleCreateProject} className="quick-add-form" style={{ marginBottom: "2rem" }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Project Title (e.g. Website Launch, Marketing Campaign)"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Short description..."
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">Create Project</button>
                  </form>

                  {(() => {
                    const activeProjects = projects
                      .filter(p => !p.is_archived && p.status !== "Completed")
                      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

                    return (
                      <div
                        ref={gridRef}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                          gap: "1.5rem",
                          position: "relative",
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (!draggedProjectId || !gridRef.current) return;
                          const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-project-id]");
                          if (cards.length === 0) return;
                          const containerRect = gridRef.current.getBoundingClientRect();
                          const mouseY = e.clientY - containerRect.top;
                          let targetIdx = activeProjects.length;
                          let lineY = 0;
                          let minDist = Infinity;
                          cards.forEach((card, idx) => {
                            const r = card.getBoundingClientRect();
                            const ct = r.top - containerRect.top;
                            const cb = r.bottom - containerRect.top;
                            const mid = (ct + cb) / 2;
                            const dist = Math.abs(mouseY - mid);
                            if (dist < minDist) {
                              minDist = dist;
                              targetIdx = mouseY < mid ? idx : idx + 1;
                              lineY = mouseY < mid ? ct : cb;
                            }
                          });
                          setInsertIndex(Math.min(targetIdx, activeProjects.length));
                          setInsertLineY(lineY);
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setInsertIndex(null); setInsertLineY(null);
                          }
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          if (insertIndex === null || !draggedProjectId) { setDraggedProjectId(null); setInsertIndex(null); setInsertLineY(null); return; }
                          const draggedIdx = activeProjects.findIndex(pr => pr.id === draggedProjectId);
                          if (draggedIdx === -1) { setDraggedProjectId(null); setInsertIndex(null); setInsertLineY(null); return; }
                          const reordered = activeProjects.filter(pr => pr.id !== draggedProjectId);
                          const idx = Math.min(insertIndex, reordered.length);
                          reordered.splice(idx, 0, activeProjects[draggedIdx]);
                          setProjects(prev => prev.map(pr => {
                            const ri = reordered.findIndex(r => r.id === pr.id);
                            if (ri !== -1) return { ...pr, sort_order: ri };
                            return pr;
                          }));
                          await reorderProjects(reordered.map(pr => pr.id));
                          setDraggedProjectId(null); setInsertIndex(null); setInsertLineY(null);
                        }}
                      >
                        {activeProjects.map(p => (
                          <div
                            key={p.id}
                            data-project-id={p.id}
                            className="paper-card project-card"
                            draggable={true}
                            onDragStart={() => { setDraggedProjectId(p.id); setInsertIndex(null); setInsertLineY(null); }}
                            onDragEnd={() => { setDraggedProjectId(null); setInsertIndex(null); setInsertLineY(null); }}
                            style={{
                              display: "flex", flexDirection: "column", justifyContent: "space-between", height: "160px", cursor: "grab",
                              ...(p.id === draggedProjectId ? { opacity: 0.3, borderStyle: "dashed" } : {}),
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <h3 style={{ fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <GripVertical size={14} style={{ opacity: 0.3, flexShrink: 0 }} />
                                  {p.title}
                                </h3>
                                <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                                  <button
                                    onClick={async () => { await completeProject(p.id); setProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, status: "Completed" } : pr)); }}
                                    className="btn btn-ghost"
                                    style={{ padding: 0, color: "var(--color-success)" }}
                                    title="Mark project complete"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={async () => { await archiveProject(p.id); setProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, is_archived: true } : pr)); }}
                                    className="btn btn-ghost"
                                    style={{ padding: 0, color: "var(--text-muted)" }}
                                    title="Archive project"
                                  >
                                    <Archive size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteProject(p.id)}
                                    className="btn btn-ghost" 
                                    style={{ padding: 0, color: "var(--color-error)" }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                                {p.description || "No description provided."}
                              </p>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                {tasks.filter(t => t.project_id === p.id).length} Tasks
                              </span>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}
                                onClick={async () => {
                                  if (activeNote) await handleSaveNote();
                                  setActiveProject(p);
                                }}
                              >
                                Open Desk <ArrowRight size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {insertLineY !== null && (
                          <div style={{
                            position: "absolute", left: "0.5rem", right: "0.5rem",
                            top: insertLineY, height: "3px",
                            backgroundColor: "var(--brand-accent)",
                            zIndex: 10, pointerEvents: "none",
                            borderRadius: "2px",
                            transform: "translateY(-1.5px)",
                            boxShadow: "0 0 8px var(--brand-accent)",
                            transition: "top 0.05s ease",
                          }} />
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Project Workspace Detail view */
                <div>
                  <button className="btn btn-secondary" onClick={async () => { if (activeNote) await handleSaveNote(); setActiveProject(null); }} style={{ marginBottom: "1.5rem" }}>
                    ← Back to Projects
                  </button>

                  <div className="project-detail-layout">
                    {/* Tasks panel */}
                    <div>
                      <h3 style={{ marginBottom: "1rem" }}>Project Tasks</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {(() => {
                          const activeProjectTasks = tasks
                            .filter(t => t.project_id === activeProject.id && !t.is_archived && t.status !== "Completed")
                            .sort((a, b) => {
                              if (!a.due_date && !b.due_date) return 0;
                              if (!a.due_date) return 1;
                              if (!b.due_date) return -1;
                              return a.due_date.localeCompare(b.due_date);
                            });
                          return activeProjectTasks.length === 0 ? (
                            <div style={{ padding: "2rem", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)", textAlign: "center", color: "var(--text-muted)" }}>
                              No active tasks in this project.
                            </div>
                          ) : (
                            activeProjectTasks.map(t => (
                              <div key={t.id} className="task-item">
                                <div className="task-checkbox-container">
                                  <button 
                                    className={`task-checkbox ${t.status === "Completed" ? "checked" : ""}`}
                                    onClick={() => handleToggleTask(t.id, t.status)}
                                  >
                                    {t.status === "Completed" && <Check size={12} />}
                                  </button>
                                  <div>
                                    <div
                                      className={`task-title-text ${t.status === "Completed" ? "completed" : ""}`}
                                      onClick={() => openTask(t.id)}
                                      style={{ cursor: "pointer" }}
                                    >
                                      {t.title}
                                    </div>
                                    <div className="task-meta">
                                      <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                                      {t.due_date && (
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                          <Clock size={10} /> {t.due_date}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="task-actions">
                                  <button
                                    onClick={() => openTask(t.id)}
                                    className="btn btn-ghost"
                                    style={{ padding: "0.25rem", color: "var(--brand-accent)" }}
                                    title="Open task detail"
                                  >
                                    <Sparkles size={14} />
                                  </button>
                                  <button
                                    onClick={async () => { const at = await archiveTask(t.id); setTasks(prev => prev.map(t2 => t2.id === t.id ? at : t2)); }}
                                    className="btn btn-ghost"
                                    style={{ padding: "0.25rem", color: "var(--text-muted)" }}
                                    title="Archive task"
                                  >
                                    <Archive size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteTask(t.id)} className="btn btn-ghost" style={{ padding: "0.25rem", color: "var(--color-error)" }}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))
                          );
                        })()}
                      </div>

                      {/* Completed this week */}
                      {(() => {
                        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                        const completedThisWeek = tasks.filter(t =>
                          t.project_id === activeProject.id && !t.is_archived &&
                          t.status === "Completed" && t.completed_at &&
                          new Date(t.completed_at).getTime() > weekAgo
                        );
                        if (completedThisWeek.length === 0) return null;
                        return (
                          <div style={{ marginTop: "1.5rem" }}>
                            <h4 style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                              Completed This Week ({completedThisWeek.length})
                            </h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                              {completedThisWeek.map(t => (
                                <div key={t.id} style={{
                                  display: "flex", alignItems: "center", gap: "0.5rem",
                                  padding: "0.4rem 0.6rem", fontSize: "0.82rem",
                                  borderRadius: "var(--radius-sm)", opacity: 0.7,
                                  backgroundColor: "var(--bg-workspace)"
                                }}>
                                  <Check size={12} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                                  <span style={{ flex: 1 }}>{t.title}</span>
                                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                    {t.completed_at ? new Date(t.completed_at).toLocaleDateString() : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Add task inside project */}
                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newTaskTitle.trim()) return;
                          const newTask = await createTask({
                            project_id: activeProject.id,
                            title: newTaskTitle,
                            description: "",
                            due_date: new Date().toISOString().split("T")[0],
                            due_time: "12:00",
                            priority: "Medium",
                            status: "To Do",
                          });
                          setTasks(prev => [newTask, ...prev]);
                          setNewTaskTitle("");
                          // Push to Google Calendar if the user has calendar enabled
                          if (profile?.calendar_allowed) {
                            try {
                              const { supabase, isSupabaseConfigured } = await import("@/lib/supabase");
                              if (isSupabaseConfigured && supabase) {
                                const { data: tokenData } = await supabase!
                                  .from("user_tokens")
                                  .select("provider_token")
                                  .eq("user_id", newTask.user_id)
                                  .single();
                                if (tokenData?.provider_token) {
                                  fetch("/api/calendar", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      title: newTask.title,
                                      date: newTask.due_date,
                                      description: newTask.description,
                                      providerToken: tokenData.provider_token,
                                    }),
                                  }).catch(() => {});
                                }
                              }
                            } catch {}
                          }
                        }} 
                        className="quick-add-form" 
                        style={{ marginTop: "1rem" }}
                      >
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Add task to this project..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary"><Plus size={16} /></button>
                      </form>
                    </div>

                    {/* Notes panel */}
                    <div className="paper-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3>Project Notes</h3>
                        <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }} onClick={handleNewNote}>
                          New Note
                        </button>
                      </div>

                      {projectNotes.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>SAVED NOTES</span>
                          {projectNotes.map(n => (
                            <div key={n.id} style={{ display: "flex", gap: "0.25rem", alignItems: "stretch" }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{
                                  flex: 1, justifyContent: "flex-start", textAlign: "left",
                                  ...(activeNote?.id === n.id ? { borderColor: "var(--brand-accent)", backgroundColor: "var(--brand-accent-light)" } : {})
                                }}
                                onClick={() => {
                                  setActiveNote(n);
                                  setNoteTitle(n.title);
                                  setNoteContent(n.content);
                                }}
                              >
                                <FileText size={14} /> {n.title}
                              </button>
                              <button
                                className="btn btn-ghost"
                                style={{ padding: "0.25rem 0.5rem", color: "var(--color-error)", flexShrink: 0 }}
                                onClick={() => handleDeleteNote(n.id)}
                                title="Delete note"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <div className="form-group">
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ fontWeight: 600, fontSize: "1.1rem", border: "none", borderBottom: "1px solid var(--border-color)", paddingLeft: 0, borderRadius: 0, backgroundColor: "transparent" }}
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            placeholder="Note Title"
                          />
                        </div>
                        <div className="form-group">
                          <textarea 
                            className="notes-editor"
                            placeholder="Write your meeting details, research highlights, or general draft here..."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                          ></textarea>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          {activeNote && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ fontSize: "0.8rem" }}
                              onClick={() => {
                                setActiveNote(null);
                                setNoteTitle("Untitled Note");
                                setNoteContent("");
                              }}
                            >
                              Close Note
                            </button>
                          )}
                          <button className="btn btn-primary" onClick={handleSaveNote} style={{ marginLeft: "auto" }}>
                            Save Note
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: STATISTICS */}
          {activeView === "stats" && (
            <div>
              {/* Period tabs */}
              <div className="tabs-header" style={{ marginBottom: "1.5rem" }}>
                {(["daily", "weekly", "monthly"] as const).map(p => (
                  <button
                    key={p}
                    className={`tab-btn ${statsPeriod === p ? "active" : ""}`}
                    onClick={() => setStatsPeriod(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>

              {(() => {
                const now = new Date();
                const todayStr = now.toISOString().split("T")[0];

                // Period boundaries
                const getStart = () => {
                  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  if (statsPeriod === "daily") return todayStr;
                  if (statsPeriod === "weekly") {
                    const day = d.getDay();
                    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
                    return d.toISOString().split("T")[0];
                  }
                  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
                };

                const getEnd = () => {
                  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  if (statsPeriod === "daily") return todayStr;
                  if (statsPeriod === "weekly") {
                    const day = d.getDay();
                    d.setDate(d.getDate() - day + (day === 0 ? 0 : 7));
                    return d.toISOString().split("T")[0];
                  }
                  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
                };

                const periodStart = getStart();
                const periodEnd = getEnd();

                // Previous period boundaries
                const getPrevStart = () => {
                  const start = new Date(periodStart);
                  if (statsPeriod === "daily") { start.setDate(start.getDate() - 1); }
                  else if (statsPeriod === "weekly") { start.setDate(start.getDate() - 7); }
                  else { start.setMonth(start.getMonth() - 1); }
                  return start.toISOString().split("T")[0];
                };

                const getPrevEnd = () => {
                  const d = new Date(periodStart);
                  d.setDate(d.getDate() - 1);
                  return d.toISOString().split("T")[0];
                };

                const prevStart = getPrevStart();

                // Filter tasks by period
                const periodTasks = tasks.filter(t => t.due_date && t.due_date >= periodStart && t.due_date <= periodEnd);
                const prevTasks = tasks.filter(t => t.due_date && t.due_date >= prevStart && t.due_date < periodStart);

                const periodDone = periodTasks.filter(t => t.status === "Completed").length;
                const periodTotal = periodTasks.length;
                const periodRate = periodTotal > 0 ? Math.round((periodDone / periodTotal) * 100) : 0;

                const prevDone = prevTasks.filter(t => t.status === "Completed").length;
                const prevTotal = prevTasks.length;
                const prevRate = prevTotal > 0 ? Math.round((prevDone / prevTotal) * 100) : 0;

                const periodLabels = {
                  daily: "Today",
                  weekly: "This Week",
                  monthly: "This Month"
                };

                const prevLabels = {
                  daily: "Yesterday",
                  weekly: "Last Week",
                  monthly: "Last Month"
                };

                const trend = periodRate > prevRate ? "up" : periodRate < prevRate ? "down" : "same";
                const trendColor = trend === "up" ? "var(--color-success)" : trend === "down" ? "var(--color-error)" : "var(--text-muted)";
                const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";

                return (
                  <>
                    <div className="metrics-grid">
                      <div className="paper-card metric-card">
                        <div className="metric-label">Completion Rate</div>
                        <div className="metric-value">{periodRate}%</div>
                        <div style={{ fontSize: "0.75rem", color: trendColor, marginTop: "0.25rem" }}>
                          {trendIcon} {prevRate}% ({prevLabels[statsPeriod]})
                        </div>
                      </div>
                      <div className="paper-card metric-card">
                        <div className="metric-label">{periodLabels[statsPeriod]} Done</div>
                        <div className="metric-value">{periodDone}/{periodTotal}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                          {prevDone} done {prevLabels[statsPeriod]}
                        </div>
                      </div>
                      <div className="paper-card metric-card">
                        <div className="metric-label">Active Workloads</div>
                        <div className="metric-value">{activeTasksCount} Tasks</div>
                      </div>
                      <div className="paper-card metric-card">
                        <div className="metric-label">Focus Areas</div>
                        <div className="metric-value">{projects.length} Projects</div>
                      </div>
                    </div>

                    <div className="stats-grid">
                      <div className="paper-card">
                        <h3>Activity Breakdown — {periodLabels[statsPeriod]}</h3>
                        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                          {projects.filter(p => periodTasks.some(t => t.project_id === p.id)).length > 0 ? (
                            projects.map(p => {
                              const projTasks = periodTasks.filter(t => t.project_id === p.id);
                              if (projTasks.length === 0) return null;
                              const done = projTasks.filter(t => t.status === "Completed").length;
                              const total = projTasks.length;
                              const rate = total > 0 ? Math.round((done / total) * 100) : 0;
                              return (
                                <div key={p.id}>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600 }}>
                                    <span>{p.title}</span>
                                    <span>{done}/{total} Done ({rate}%)</span>
                                  </div>
                                  <div className="progress-bar-container">
                                    <div className="progress-bar-fill" style={{ width: `${rate}%` }}></div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                              No tasks due {statsPeriod === "daily" ? "today" : `this ${statsPeriod.slice(0, -2)}`}.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="paper-card">
                        <h3>{periodLabels[statsPeriod]} Productivity Summary</h3>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                          {trend === "up"
                            ? `Your completion rate is up ${periodRate - prevRate}% compared to ${prevLabels[statsPeriod]}. Keep it up!`
                            : trend === "down"
                              ? `Your completion rate dropped ${prevRate - periodRate}% from ${prevLabels[statsPeriod]}. Time to focus!`
                              : `Same completion rate as ${prevLabels[statsPeriod]}. Consistency is key!`}
                        </p>
                        <div style={{ borderLeft: "3px solid var(--brand-accent)", paddingLeft: "1rem", marginTop: "1.5rem" }}>
                          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{periodDone} Tasks</div>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            COMPLETED {periodLabels[statsPeriod].toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {activeView === "settings" && profile && (
            <div className="paper-card" style={{ maxWidth: "600px", margin: "0 auto" }}>
              <h3 style={{ marginBottom: "1.5rem" }}>Profile Settings</h3>
              
              <div className="form-group">
                <label className="form-label">Workspace Name</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={profile.name}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Onboarded Roles</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {profile.role.map((r, idx) => (
                    <span key={idx} className="badge badge-low" style={{ padding: "0.5rem" }}>{r}</span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
                <h4 style={{ marginBottom: "1rem" }}>Workspace Display</h4>
                <label className="settings-row">
                  <div>
                    <strong>{theme === "dark" ? "Dark Mode" : "Light Mode"}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Choose the workspace appearance that feels easiest on your eyes.
                    </div>
                  </div>
                  <button type="button" className="theme-switch" onClick={toggleTheme} aria-label="Toggle color theme">
                    <span className={theme === "dark" ? "active" : ""}>
                      <Moon size={14} />
                    </span>
                    <span className={theme === "light" ? "active" : ""}>
                      <Sun size={14} />
                    </span>
                  </button>
                </label>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
                <h4 style={{ marginBottom: "1rem" }}>Integrations & Alerts</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                    <input 
                      type="checkbox"
                      checked={profile.email_allowed}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, email_allowed: e.target.checked } : null)}
                      style={{ width: "16px", height: "16px", accentColor: "var(--brand-accent)" }}
                    />
                    <div>
                      <strong>Enable Email Reminders</strong>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Fires warning emails before task deadlines.</div>
                    </div>
                  </label>

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                    <strong style={{ display: "block", marginBottom: "0.5rem" }}>Google Calendar Connection</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                      Push tasks to your Google Calendar instantly when you create them.
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span className="badge badge-low" style={{ fontSize: "0.75rem" }}>
                        {profile.calendar_allowed ? "Connected" : "Not connected"}
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                        onClick={async () => {
                          const { supabase, isSupabaseConfigured } = await import("@/lib/supabase");
                          if (!isSupabaseConfigured) {
                            alert("Sign in with Google to connect Calendar. (Supabase Auth not configured)");
                            return;
                          }
                          const { data: { user } } = await supabase!.auth.getUser();
                          if (!user) {
                            alert("Please sign in first to connect Google Calendar.");
                            return;
                          }
                          window.location.href = `/api/auth/google?userId=${user.id}`;
                        }}
                      >
                        {profile.calendar_allowed ? "Reconnect" : "Connect"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: "100%", marginTop: "2rem" }}
                onClick={async () => {
                  await saveProfile(profile);
                  alert("Settings saved successfully!");
                }}
              >
                Save Settings
              </button>

              <div style={{ borderTop: "1px solid var(--color-error-light)", paddingTop: "1.5rem", marginTop: "2rem" }}>
                <h4 style={{ color: "var(--color-error)", marginBottom: "0.5rem" }}>Danger zone</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
                <button
                  className="btn"
                  style={{ border: "1px solid var(--color-error)", color: "var(--color-error)", background: "none" }}
                  onClick={async () => {
                    if (!confirm("Are you sure you want to delete your account? All data will be permanently removed.")) return;
                    if (!confirm("This cannot be undone. Continue?")) return;
                    const { supabase, isSupabaseConfigured } = await import("@/lib/supabase");
                    if (isSupabaseConfigured && supabase) {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        const { error } = await supabase.rpc("delete_user_account");
                        if (error) {
                          alert("Could not delete account. Please contact support.");
                          return;
                        }
                        await supabase.auth.signOut();
                        window.location.href = "/";
                        return;
                      }
                    }
                    localStorage.clear();
                    window.location.href = "/";
                  }}
                >
                  Delete account
                </button>
              </div>
            </div>
          )}

          {/* VIEW: ARCHIVE */}
          {activeView === "archive" && (
            <div>
              <h3 style={{ marginBottom: "1.5rem" }}>Archive</h3>

              <div className="paper-card" style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ marginBottom: "1rem" }}>Archived Tasks ({tasks.filter(t => t.is_archived).length})</h4>
                {tasks.filter(t => t.is_archived).length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No archived tasks.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {tasks.filter(t => t.is_archived).map(t => (
                      <div key={t.id} className="task-item">
                        <div className="task-checkbox-container">
                          <div>
                            <div className="task-title-text" style={{ textDecoration: "line-through", opacity: 0.7 }}>{t.title}</div>
                            <div className="task-meta">
                              <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                            </div>
                          </div>
                        </div>
                        <div className="task-actions">
                          <button
                            onClick={async () => { const ut = await unarchiveTask(t.id); setTasks(prev => prev.map(t2 => t2.id === t.id ? ut : t2)); }}
                            className="btn btn-ghost"
                            style={{ padding: "0.25rem", color: "var(--color-success)" }}
                            title="Restore task"
                          >
                            <Archive size={14} />
                          </button>
                          <button onClick={() => handleDeleteTask(t.id)} className="btn btn-ghost" style={{ padding: "0.25rem", color: "var(--color-error)" }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="paper-card" style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ marginBottom: "1rem" }}>Archived Projects ({projects.filter(p => p.is_archived).length})</h4>
                {projects.filter(p => p.is_archived).length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No archived projects.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {projects.filter(p => p.is_archived).map(p => (
                      <div key={p.id} className="task-item">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                          <BookOpen size={16} style={{ opacity: 0.5 }} />
                          <div>
                            <div style={{ opacity: 0.7 }}>{p.title}</div>
                            {p.description && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{p.description}</div>}
                          </div>
                        </div>
                        <div className="task-actions">
                          <button
                            onClick={async () => { await unarchiveProject(p.id); setProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, is_archived: false } : pr)); }}
                            className="btn btn-ghost"
                            style={{ padding: "0.25rem", color: "var(--color-success)" }}
                            title="Restore project"
                          >
                            <Archive size={14} />
                          </button>
                          <button onClick={() => handleDeleteProject(p.id)} className="btn btn-ghost" style={{ padding: "0.25rem", color: "var(--color-error)" }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="paper-card" style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ marginBottom: "1rem" }}>Completed Projects ({projects.filter(p => p.status === "Completed" && !p.is_archived).length})</h4>
                {projects.filter(p => p.status === "Completed" && !p.is_archived).length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No completed projects.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {projects.filter(p => p.status === "Completed" && !p.is_archived).map(p => (
                      <div key={p.id} className="task-item">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                          <Check size={16} style={{ color: "var(--color-success)", opacity: 0.6 }} />
                          <div>
                            <div style={{ opacity: 0.7 }}>{p.title}</div>
                            {p.description && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{p.description}</div>}
                          </div>
                        </div>
                        <div className="task-actions">
                          <button
                            onClick={async () => { await reopenProject(p.id); setProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, status: "Active" } : pr)); }}
                            className="btn btn-ghost"
                            style={{ padding: "0.25rem", color: "var(--brand-accent)" }}
                            title="Reopen project"
                          >
                            <ArrowRight size={14} />
                          </button>
                          <button onClick={() => handleDeleteProject(p.id)} className="btn btn-ghost" style={{ padding: "0.25rem", color: "var(--color-error)" }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="paper-card">
                <h4 style={{ marginBottom: "1rem" }}>Done Tasks ({tasks.filter(t => t.status === "Completed" && !t.is_archived && t.completed_at && new Date(t.completed_at).getTime() <= Date.now() - 7 * 24 * 60 * 60 * 1000).length})</h4>
                {(() => {
                  const oldDone = tasks.filter(t => t.status === "Completed" && !t.is_archived && t.completed_at && new Date(t.completed_at).getTime() <= Date.now() - 7 * 24 * 60 * 60 * 1000);
                  return oldDone.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No completed tasks from over a week ago.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {oldDone.map(t => (
                        <div key={t.id} className="task-item">
                          <div className="task-checkbox-container">
                            <div>
                              <div className="task-title-text" style={{ opacity: 0.7 }}>{t.title}</div>
                              <div className="task-meta">
                                <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  Done {new Date(t.completed_at!).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* VIEW: CALENDAR */}
          {activeView === "calendar" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: 0 }}>Calendar</h3>
                <div className="tabs-header" style={{ margin: 0 }}>
                  <button className={`tab-btn ${calendarMonth === 0 ? "active" : ""}`} onClick={() => setCalendarMonth(0)}>
                    This Month
                  </button>
                  <button className={`tab-btn ${calendarMonth === 1 ? "active" : ""}`} onClick={() => setCalendarMonth(1)}>
                    Next Month
                  </button>
                </div>
              </div>
              {(() => {
                const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const now = new Date();
                const month = now.getMonth() + calendarMonth;
                const year = now.getFullYear() + Math.floor(month / 12);
                const m = month % 12;
                const startOfMonth = new Date(year, m, 1);
                const endOfMonth = new Date(year, m + 1, 0);
                const startPad = startOfMonth.getDay();
                const daysInMonth = endOfMonth.getDate();
                const cells: (number | null)[] = Array(startPad).fill(null);
                for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                const tasksByDate: Record<string, Task[]> = {};
                tasks.filter(t => t.due_date && !t.is_archived && t.status !== "Completed").forEach(t => {
                  (tasksByDate[t.due_date!] = tasksByDate[t.due_date!] || []).push(t);
                });
                const todayStr = new Date().toISOString().split("T")[0];
                return (
                  <div className="paper-card" style={{ overflow: "hidden" }}>
                    <h4 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
                      {new Date(year, m).toLocaleString("default", { month: "long", year: "numeric" })}
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                      {weekDays.map(d => (
                        <div key={d} style={{
                          fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)",
                          padding: "0.5rem 0", borderBottom: "1px solid var(--border-color)",
                          textAlign: "center"
                        }}>{d}</div>
                      ))}
                      {cells.map((day, i) => {
                        if (day === null) return <div key={`e-${i}`} style={{ borderRight: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)" }} />;
                        const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const dayTasks = tasksByDate[dateStr] || [];
                        const isToday = todayStr === dateStr;
                        return (
                          <div key={dateStr} style={{
                            padding: "0.35rem", borderRadius: 0, cursor: "pointer",
                            backgroundColor: isToday ? "var(--brand-accent-light)" : "transparent",
                            fontSize: "0.82rem", minHeight: isToday ? "90px" : "80px", height: "90px",
                            borderRight: "1px solid var(--border-color)",
                            borderBottom: "1px solid var(--border-color)",
                            textAlign: "left", overflow: "hidden",
                            display: "flex", flexDirection: "column",
                          }}
                          onClick={() => setSelectedDay(dateStr)}>
                            <div style={{ fontWeight: isToday ? 700 : 400, fontSize: "0.78rem", flexShrink: 0 }}>{day}</div>
                            <div style={{
                              display: "flex", flexDirection: "column", gap: "0.1rem",
                              marginTop: "0.15rem", overflow: "hidden", flex: 1, minHeight: 0
                            }}>
                              {dayTasks.slice(0, 3).map(t => (
                                <div key={t.id} onClick={() => openTask(t.id)} style={{
                                  fontSize: "0.62rem", padding: "0.05rem 0.25rem", cursor: "pointer",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  borderRadius: "2px", flexShrink: 0,
                                  backgroundColor: t.priority === "High" ? "rgba(239,68,68,0.15)" : t.priority === "Medium" ? "rgba(234,179,8,0.15)" : "rgba(34,197,94,0.15)",
                                  color: t.priority === "High" ? "#ef4444" : t.priority === "Medium" ? "#ca8a04" : "#16a34a",
                                }} title={t.title}>
                                  {t.title}
                                </div>
                              ))}
                              {dayTasks.length > 3 && (
                                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", flexShrink: 0 }}>
                                  +{dayTasks.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* VIEW: KANBAN */}
          {activeView === "kanban" && (
            <div>
              <h3 style={{ marginBottom: "1.5rem" }}>Kanban Board</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                  {(["To Do", "In Progress", "Completed"] as const).map(column => {
                  const colTasks = tasks.filter(t => t.status === column && !t.is_archived);
                  return (
                    <div key={column} className="paper-card" style={{ minHeight: "300px" }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        if (!draggedTaskId) return;
                        const updated = await updateTask(draggedTaskId, { status: column });
                        setTasks(prev => prev.map(t2 => t2.id === draggedTaskId ? updated : t2));
                        setDraggedTaskId(null); setDragOverTaskId(null);
                      }}
                    >
                      <h4 style={{ marginBottom: "0.75rem", fontSize: "0.95rem", color: column === "To Do" ? "var(--text-muted)" : column === "In Progress" ? "var(--brand-accent)" : "var(--color-success)" }}>
                        {column}
                        <span style={{ fontSize: "0.8rem", marginLeft: "0.5rem", opacity: 0.6 }}>({colTasks.length})</span>
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {colTasks.map(t => (
                          <div key={t.id}
                            className="task-item"
                            draggable
                            onDragStart={() => setDraggedTaskId(t.id)}
                            onDragOver={(e) => { e.preventDefault(); setDragOverTaskId(t.id); }}
                            onDragEnd={() => { setDraggedTaskId(null); setDragOverTaskId(null); }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              if (!draggedTaskId || draggedTaskId === t.id) { setDraggedTaskId(null); setDragOverTaskId(null); return; }
                              const updated = await updateTask(draggedTaskId, { status: column });
                              setTasks(prev => prev.map(t2 => t2.id === draggedTaskId ? updated : t2));
                              setDraggedTaskId(null); setDragOverTaskId(null);
                            }}
                            style={{ opacity: draggedTaskId === t.id ? 0.4 : 1, cursor: "grab", margin: 0 }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 550, fontSize: "0.85rem", cursor: "pointer" }} onClick={() => openTask(t.id)}>{t.title}</div>
                              {t.due_date && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}><Clock size={10} /> {t.due_date}</div>}
                              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                                {(t.tags || []).map(tag => (
                                  <span key={tag} style={{ fontSize: "0.65rem", padding: "0.05rem 0.35rem", borderRadius: "var(--radius-full)", backgroundColor: "var(--brand-accent-light)", color: "var(--brand-accent)" }}>{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                        {colTasks.length === 0 && (
                          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>No tasks</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <ToastContainer />

      {/* DAY DETAIL OVERLAY */}
      {selectedDay && (
        <div className="task-detail-overlay" onClick={() => setSelectedDay(null)}>
          <div className="task-detail-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="task-detail-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                {new Date(selectedDay + "T12:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <button className="btn btn-ghost" onClick={() => setSelectedDay(null)} style={{ padding: "0.25rem", fontSize: "1.2rem", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "60vh", overflowY: "auto" }}>
              {(() => {
                const dayTasks = tasks.filter(t => t.due_date === selectedDay && !t.is_archived && t.status !== "Completed");
                if (dayTasks.length === 0) {
                  return <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0", fontSize: "0.9rem" }}>No tasks for this day.</p>;
                }
                return dayTasks.map(t => (
                  <div key={t.id} className="task-item" style={{ margin: 0, cursor: "pointer" }} onClick={() => { setSelectedDay(null); openTask(t.id); }}>
                    <div className="task-checkbox-container">
                      <button 
                        className={`task-checkbox ${t.status === "Completed" ? "checked" : ""}`}
                        onClick={(e) => { e.stopPropagation(); handleToggleTask(t.id, t.status); }}
                      >
                        {t.status === "Completed" && <Check size={12} />}
                      </button>
                      <div>
                        <div className="task-title-text">{t.title}</div>
                        <div className="task-meta">
                          {t.project_id && (
                            <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--brand-accent)" }}>
                              #{projects.find(p => p.id === t.project_id)?.title}
                            </span>
                          )}
                          <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                          {(t.tags || []).length > 0 && t.tags!.map(tag => (
                            <span key={tag} style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "var(--radius-full)", backgroundColor: "var(--brand-accent-light)", color: "var(--brand-accent)" }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TASK DETAIL OVERLAY */}
      {activeTaskId && activeTask && (
        <div className="task-detail-overlay" onClick={closeTask}>
          <div className="task-detail-panel" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="task-detail-header">
              <input
                type="text"
                className="form-input task-detail-title-input"
                value={taskEditTitle}
                onChange={(e) => setTaskEditTitle(e.target.value)}
                placeholder="Task title"
              />
              <button className="btn btn-ghost" onClick={closeTask} style={{ padding: "0.25rem", fontSize: "1.2rem", lineHeight: 1 }}>×</button>
            </div>

            {/* Meta row */}
            <div className="task-detail-meta">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Project</label>
                <select
                  className="form-input"
                  value={taskEditProject}
                  onChange={(e) => setTaskEditProject(e.target.value)}
                >
                  <option value="">No Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Priority</label>
                <select
                  className="form-input"
                  value={taskEditPriority}
                  onChange={(e) => setTaskEditPriority(e.target.value as "High" | "Medium" | "Low")}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={taskEditDueDate}
                  onChange={(e) => setTaskEditDueDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={taskEditStatus}
                  onChange={(e) => setTaskEditStatus(e.target.value as "To Do" | "In Progress" | "Completed")}
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="task-detail-section">
              <label className="form-label">Tags</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
                {taskEditTags.map(tag => (
                  <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", backgroundColor: "var(--brand-accent-light)", color: "var(--brand-accent)", fontSize: "0.8rem" }}>
                    {tag}
                    <button className="btn btn-ghost" style={{ padding: 0, fontSize: "0.9rem", lineHeight: 1, color: "inherit" }} onClick={() => setTaskEditTags(prev => prev.filter(t => t !== tag))}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Add tag..."
                  style={{ flex: 1, fontSize: "0.85rem" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                      const val = (e.target as HTMLInputElement).value.trim();
                      setTaskEditTags(prev => prev.includes(val) ? prev : [...prev, val]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
                <button className="btn btn-ghost" style={{ padding: "0.25rem", color: "var(--brand-accent)" }} onClick={() => {
                  const input = (document.querySelector(".task-detail-section .form-input") as HTMLInputElement);
                  if (input && input.value.trim()) {
                    const val = input.value.trim();
                    setTaskEditTags(prev => prev.includes(val) ? prev : [...prev, val]);
                    input.value = "";
                  }
                }}><Plus size={14} /></button>
              </div>
            </div>

            {/* Notes */}
            <div className="task-detail-section">
              <label className="form-label">Notes</label>
              <textarea
                className="task-detail-notes"
                value={taskEditNotes}
                onChange={(e) => { setTaskEditNotes(e.target.value); if (showThinContextHint) setShowThinContextHint(false); }}
                placeholder="Add notes, ideas, or context for this task..."
              />
            </div>

            {/* AI Breakdown */}
            <div className="task-detail-section">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "0.85rem" }}
                  onClick={() => handleTaskBreakdown(activeTaskId)}
                  disabled={isBreakingDown}
                >
                  <Sparkles size={14} /> Break down with AI
                </button>
                {isBreakingDown && <span className="typewriter-text" style={{ fontSize: "0.85rem" }}>Thinking of subtasks...</span>}
              </div>

              {showThinContextHint && (
                <div className="task-detail-breakdown" style={{ borderColor: "#eab308", background: "rgba(234, 179, 8, 0.08)" }}>
                  <p style={{ fontSize: "0.85rem", color: "#eab308", margin: 0 }}>
                    Add more detail in the title or notes for a better AI breakdown.
                  </p>
                </div>
              )}

              {breakdownError && (
                <div className="task-detail-breakdown" style={{ borderColor: "var(--color-error)", background: "var(--color-error-light, rgba(239, 68, 68, 0.08))" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--color-error)", margin: 0 }}>
                    {breakdownError}
                  </p>
                </div>
              )}

              {breakdownSuggestions.length > 0 && (
                <div className="task-detail-breakdown">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <strong style={{ fontSize: "0.85rem", color: "var(--brand-accent)" }}>Suggested Subtasks</strong>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                      onClick={addBreakdownToNotes}
                    >
                      Add to notes
                    </button>
                  </div>
                  <ol style={{ paddingLeft: "1.2rem", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {breakdownSuggestions.map((step, idx) => (
                      <li key={idx} style={{ color: "var(--text-primary)" }}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="task-detail-footer">
              <button className="btn btn-secondary" onClick={closeTask}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => { await saveTask(); closeTask(); }}>
                Save
              </button>
            </div>

          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
