"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Inbox, Clock, Sparkles, Plus, 
  Trash2, Settings, LineChart, BookOpen, 
  ArrowRight, Check, FileText,
  PanelLeftClose, PanelLeftOpen, Sun, Moon, LogOut,
  GripVertical, Archive
} from "lucide-react";
import "../dashboard.css";
import { 
  getProfile, saveProfile, getProjects, createProject, deleteProject,
  getTasks, createTask, updateTask, deleteTask, reorderTasks, reorderProjects,
  archiveTask, unarchiveTask, archiveProject, unarchiveProject,
  getNotes, saveNote
} from "@/lib/data-store";
import { Profile, Project, Task, Note } from "@/lib/types";
import { BinderLogo } from "@/lib/logo";

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
  
  // App views: 'dashboard', 'projects', 'stats', 'settings'
  const [activeView, setActiveView] = useState<"dashboard" | "projects" | "stats" | "settings">("dashboard");
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

  // Archive view
  const [showArchived, setShowArchived] = useState(false);

  // Stats period view
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
      const p = await getProfile();
      if (!p || searchParams.get("onboard") === "true") {
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
    const updated = await updateTask(id, { status: newStatus });
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  // Delete a task
  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
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

  // Stats Calculator
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "Completed").length;
  const activeTasksCount = tasks.filter(t => t.status !== "Completed").length;
  const tasksDueToday = tasks.filter(t => {
    const todayStr = new Date().toISOString().split("T")[0];
    return t.due_date === todayStr && t.status !== "Completed";
  }).length;
  const activeProjectsCount = projects.filter(p => !p.is_archived).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter tasks list based on active filter tabs
  const filteredTasks = tasks.filter(t => {
    if (showArchived) return t.is_archived;
    if (t.is_archived) return false;
    const todayStr = new Date().toISOString().split("T")[0];
    if (taskFilter === "today") {
      return t.due_date === todayStr && t.status !== "Completed";
    }
    if (taskFilter === "upcoming") {
      return (t.due_date !== todayStr || !t.due_date) && t.status !== "Completed";
    }
    return t.status === "Completed";
  });

  return (
    <div className={`dashboard-container ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
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
          <div className="dashboard-header-actions">
            <button
              className={`icon-btn ${showArchived ? "active" : ""}`}
              onClick={() => setShowArchived(prev => !prev)}
              aria-label="Archived items"
              title={showArchived ? "Hide archived" : "Show archived"}
              style={{ color: showArchived ? "var(--brand-accent)" : undefined }}
            >
              <Archive size={18} />
            </button>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
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
                                {t.due_date && (
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                    <Clock size={10} /> {t.due_date}
                                  </span>
                                )}
                                <span className={`badge badge-${t.priority.toLowerCase()}`}>
                                  {t.priority}
                                </span>
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

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
                    {projects
                      .filter(p => showArchived ? p.is_archived : !p.is_archived)
                      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
                      .map(p => (
                      <div
                        key={p.id}
                        className="paper-card project-card"
                        draggable={!showArchived}
                        onDragStart={() => setDraggedProjectId(p.id)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverProjectId(p.id); }}
                        onDragEnd={() => { setDraggedProjectId(null); setDragOverProjectId(null); }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          if (!draggedProjectId || draggedProjectId === p.id) { setDraggedProjectId(null); setDragOverProjectId(null); return; }
                          const activeProjects = projects.filter(pr => !pr.is_archived);
                          const draggedIdx = activeProjects.findIndex(pr => pr.id === draggedProjectId);
                          const targetIdx = activeProjects.findIndex(pr => pr.id === p.id);
                          if (draggedIdx === -1 || targetIdx === -1) { setDraggedProjectId(null); setDragOverProjectId(null); return; }
                          const reordered = [...activeProjects];
                          const [moved] = reordered.splice(draggedIdx, 1);
                          reordered.splice(targetIdx, 0, moved);
                          setProjects(reordered);
                          await reorderProjects(reordered.map(pr => pr.id));
                          setDraggedProjectId(null); setDragOverProjectId(null);
                        }}
                        style={{
                          display: "flex", flexDirection: "column", justifyContent: "space-between", height: "160px",
                          opacity: p.is_archived ? 0.6 : 1,
                          ...(p.id === draggedProjectId ? { opacity: 0.4, borderStyle: "dashed" } : {}),
                          ...(p.id === dragOverProjectId ? { borderColor: "var(--brand-accent)", backgroundColor: "var(--brand-accent-light)" } : {}),
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <h3 style={{ fontSize: "1.15rem" }}>{p.title}</h3>
                            <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                              {p.is_archived ? (
                                <button
                                  onClick={async () => { await unarchiveProject(p.id); setProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, is_archived: false } : pr)); }}
                                  className="btn btn-ghost"
                                  style={{ padding: 0, color: "var(--color-success)" }}
                                  title="Restore project"
                                >
                                  <Archive size={14} />
                                </button>
                              ) : (
                                <button
                                  onClick={async () => { await archiveProject(p.id); setProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, is_archived: true } : pr)); }}
                                  className="btn btn-ghost"
                                  style={{ padding: 0, color: "var(--text-muted)" }}
                                  title="Archive project"
                                >
                                  <Archive size={14} />
                                </button>
                              )}
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
                            onClick={() => setActiveProject(p)}
                          >
                            Open Desk <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Project Workspace Detail view */
                <div>
                  <button className="btn btn-secondary" onClick={() => setActiveProject(null)} style={{ marginBottom: "1.5rem" }}>
                    ← Back to Projects
                  </button>

                  <div className="project-detail-layout">
                    {/* Tasks panel */}
                    <div>
                      <h3 style={{ marginBottom: "1rem" }}>Project Tasks</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {tasks.filter(t => t.project_id === activeProject.id && (showArchived ? t.is_archived : !t.is_archived)).length === 0 ? (
                          <div style={{ padding: "2rem", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)", textAlign: "center", color: "var(--text-muted)" }}>
                            No tasks inside this project. Create one below!
                          </div>
                        ) : (
                          tasks.filter(t => t.project_id === activeProject.id && (showArchived ? t.is_archived : !t.is_archived)).map(t => (
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
                                    <button onClick={() => handleDeleteTask(t.id)} className="btn btn-ghost" style={{ padding: "0.25rem", color: "var(--color-error)" }}>
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

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

                      {projectNotes.length > 0 && !activeNote && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>SAVED NOTES</span>
                          {projectNotes.map(n => (
                            <button 
                              key={n.id} 
                              className="btn btn-secondary" 
                              style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                              onClick={() => {
                                setActiveNote(n);
                                setNoteTitle(n.title);
                                setNoteContent(n.content);
                              }}
                            >
                              <FileText size={14} /> {n.title}
                            </button>
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

        </div>
      </main>

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

    </div>
  );
}
