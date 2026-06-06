"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Inbox, Clock, Sparkles, Plus, 
  Trash2, Settings, LineChart, BookOpen, 
  ArrowRight, Check, FileText,
  PanelLeftClose, PanelLeftOpen, Sun, Moon
} from "lucide-react";
import "../dashboard.css";
import { 
  getProfile, saveProfile, getProjects, createProject, deleteProject,
  getTasks, createTask, updateTask, deleteTask, getNotes, saveNote
} from "@/lib/data-store";
import { Profile, Project, Task, Note } from "@/lib/types";

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

  // AI Task Breakdown State
  const [breakingTaskId, setBreakingTaskId] = useState<string | null>(null);
  const [breakdownSuggestions, setBreakdownSuggestions] = useState<string[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState(false);

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
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
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
        body: JSON.stringify({ prompt: brainDumpText }),
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
    if (text.includes("law") || text.includes("assignment") || text.includes("exam")) {
      suggestions.projects.push({ title: "Law School", description: "Studies and law exams" });
    }
    if (text.includes("post") || text.includes("linkedin") || text.includes("content")) {
      suggestions.projects.push({ title: "Content Strategy", description: "Articles and posts" });
    }
    if (text.includes("portfolio") || text.includes("pmm") || text.includes("design") || text.includes("logo")) {
      suggestions.projects.push({ title: "Portfolio Website", description: "Design work and cases" });
    }

    // Split text by common separators
    const clauses = brainDumpText.split(/,|\band\b|;|\bthen\b/i);
    clauses.forEach((c, idx) => {
      const cleaned = c.trim();
      if (cleaned.length < 5) return;

      // Classify to projects
      let projTitle = "General Desk";
      if (cleaned.toLowerCase().match(/law|assignment|exam|study/)) {
        projTitle = "Law School";
      } else if (cleaned.toLowerCase().match(/post|linkedin|content|blog/)) {
        projTitle = "Content Strategy";
      } else if (cleaned.toLowerCase().match(/portfolio|pmm|design|logo/)) {
        projTitle = "Portfolio Website";
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
  const handleTaskBreakdown = async (taskId: string, title: string) => {
    setBreakingTaskId(taskId);
    setIsBreakingDown(true);
    setBreakdownSuggestions([]);

    try {
      const response = await fetch("/api/ai/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskTitle: title }),
      });

      if (response.ok) {
        const result = await response.json();
        setBreakdownSuggestions(result.subtasks);
      } else {
        simulateLocalBreakdown(title);
      }
    } catch {
      simulateLocalBreakdown(title);
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
      "finish law assignment": [
        "Read references and study cases",
        "Outline the assignment introduction",
        "Draft the analysis and argument",
        "Format footnotes and citations",
        "Proofread final draft before submitting"
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

  const addBreakdownSubtasks = async (parentTaskId: string) => {
    const parentTask = tasks.find(t => t.id === parentTaskId);
    if (!parentTask) return;

    for (const subTitle of breakdownSuggestions) {
      const newTask = await createTask({
        project_id: parentTask.project_id,
        title: subTitle,
        description: `Subtask of: ${parentTask.title}`,
        due_date: parentTask.due_date,
        due_time: parentTask.due_time,
        priority: parentTask.priority,
        status: "To Do",
      });
      setTasks(prev => [newTask, ...prev]);
    }

    setBreakingTaskId(null);
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
                    placeholder="Jennifer" 
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
            <div className="brand-mark">
              <FileText size={19} />
              <Sparkles size={10} className="brand-spark" />
            </div>
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
            <div style={{ backgroundColor: "var(--brand-accent-light)", color: "var(--brand-accent)", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", fontWeight: 700 }}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-profile-text">
              <div style={{ fontWeight: 600, fontSize: "0.85rem", lineHeight: 1.2 }}>{profile.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{profile.role[0]}</div>
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
              className="icon-btn"
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
                  : `Welcome back, ${profile?.name || "Jennifer"}! Your desk is clear.`}
              </p>
            </div>
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
            {activeView === "dashboard" && (
              <button 
                onClick={() => {
                  setBrainDumpText("Finish PMM portfolio, schedule law assignment check-in, draft weekly client newsletter.");
                  const element = document.getElementById("brain-dump-input");
                  if (element) element.focus();
                }}
                className="btn btn-secondary"
                style={{ fontSize: "0.85rem", color: "var(--brand-accent)" }}
              >
                <Sparkles size={14} /> Run Demo Dump
              </button>
            )}
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
                  <form onSubmit={handleAddTask} className="quick-add-form">
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Add a task to To Do..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
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
                    <button type="submit" className="btn btn-primary">
                      <Plus size={16} />
                    </button>
                  </form>

                  {/* Task list render */}
                  {filteredTasks.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
                      <Inbox size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.3 }} />
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>Your desk is clear.</p>
                    </div>
                  ) : (
                    <div>
                      {filteredTasks.map(t => (
                        <div key={t.id} className="task-item">
                          <div className="task-checkbox-container">
                            <button 
                              className={`task-checkbox ${t.status === "Completed" ? "checked" : ""}`}
                              onClick={() => handleToggleTask(t.id, t.status)}
                            >
                              {t.status === "Completed" && <Check size={12} />}
                            </button>
                            <div>
                              <div className={`task-title-text ${t.status === "Completed" ? "completed" : ""}`}>
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
                            {t.status !== "Completed" && (
                              <button 
                                onClick={() => handleTaskBreakdown(t.id, t.title)}
                                className="btn btn-ghost" 
                                style={{ padding: "0.25rem", color: "var(--brand-accent)" }}
                                title="Break down with AI"
                              >
                                <Sparkles size={14} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteTask(t.id)}
                              className="btn btn-ghost" 
                              style={{ padding: "0.25rem", color: "var(--color-error)" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Active AI Task Breakdown Panel */}
                  {breakingTaskId && (
                    <div className="task-breakdown-sidebar">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--brand-accent)" }}>
                          <Sparkles size={16} /> AI Subtask Breakdown
                        </h4>
                        <button className="btn btn-ghost" onClick={() => setBreakingTaskId(null)} style={{ padding: 0 }}>Close</button>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                        Task: &apos;<strong>{tasks.find(t => t.id === breakingTaskId)?.title}</strong>&apos;
                      </p>

                      {isBreakingDown ? (
                        <div className="typewriter-container" style={{ padding: "1rem" }}>
                          <div className="typewriter-text">Thinking of subtasks...</div>
                        </div>
                      ) : (
                        <div>
                          <ul style={{ paddingLeft: "1.2rem", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1.5rem" }}>
                            {breakdownSuggestions.map((step, idx) => (
                              <li key={idx} style={{ color: "var(--text-primary)" }}>{step}</li>
                            ))}
                          </ul>
                          <button 
                            className="btn btn-primary" 
                            style={{ width: "100%", fontSize: "0.85rem" }}
                            onClick={() => addBreakdownSubtasks(breakingTaskId)}
                          >
                            Add all steps as subtasks
                          </button>
                        </div>
                      )}
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
                      placeholder="Project Title (e.g. Website Launch, Law Essay)"
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
                    {projects.map(p => (
                      <div key={p.id} className="paper-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "160px" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <h3 style={{ fontSize: "1.15rem" }}>{p.title}</h3>
                            <button 
                              onClick={() => handleDeleteProject(p.id)}
                              className="btn btn-ghost" 
                              style={{ padding: 0, color: "var(--color-error)" }}
                            >
                              <Trash2 size={14} />
                            </button>
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
                        {tasks.filter(t => t.project_id === activeProject.id).length === 0 ? (
                          <div style={{ padding: "2rem", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)", textAlign: "center", color: "var(--text-muted)" }}>
                            No tasks inside this project. Create one below!
                          </div>
                        ) : (
                          tasks.filter(t => t.project_id === activeProject.id).map(t => (
                            <div key={t.id} className="task-item">
                              <div className="task-checkbox-container">
                                <button 
                                  className={`task-checkbox ${t.status === "Completed" ? "checked" : ""}`}
                                  onClick={() => handleToggleTask(t.id, t.status)}
                                >
                                  {t.status === "Completed" && <Check size={12} />}
                                </button>
                                <div className={`task-title-text ${t.status === "Completed" ? "completed" : ""}`}>
                                  {t.title}
                                </div>
                              </div>
                              <button onClick={() => handleDeleteTask(t.id)} className="btn btn-ghost" style={{ padding: 0, color: "var(--color-error)" }}>
                                <Trash2 size={14} />
                              </button>
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
              <div className="metrics-grid">
                <div className="paper-card metric-card">
                  <div className="metric-label">Completed Ratio</div>
                  <div className="metric-value">{completionRate}%</div>
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
                  <h3>Activity Breakdown</h3>
                  <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {projects.map(p => {
                      const projTasks = tasks.filter(t => t.project_id === p.id);
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
                    })}
                  </div>
                </div>

                <div className="paper-card">
                  <h3>Weekly Productivity Summary</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    Your productivity score this week is higher than last week. Great execution!
                  </p>
                  <div style={{ borderLeft: "3px solid var(--brand-accent)", paddingLeft: "1rem", marginTop: "1.5rem" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>+{completedTasks} Tasks</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      COMPLETED THIS MONTH
                    </div>
                  </div>
                </div>
              </div>
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

                  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                    <input 
                      type="checkbox"
                      checked={profile.calendar_allowed}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, calendar_allowed: e.target.checked } : null)}
                      style={{ width: "16px", height: "16px", accentColor: "var(--brand-accent)" }}
                    />
                    <div>
                      <strong>Google Calendar Connection</strong>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Push tasks to your calendar instantly.</div>
                    </div>
                  </label>
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
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
