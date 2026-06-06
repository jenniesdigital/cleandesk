import Link from "next/link";
import { Sparkles, ArrowRight, FileText, CheckSquare } from "lucide-react";
import "./landing.css";

export default function Home() {
  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <div className="logo-container">
          <div className="logo-mark">
            <FileText size={19} />
            <Sparkles size={10} className="brand-spark" />
          </div>
          <span>CleanDesk</span>
        </div>
        <div>
          <Link href="/dashboard" className="btn btn-secondary">
            Go to Workspace
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-hero">
        <div className="hero-badge">
          <Sparkles size={14} />
          <span>AI-Powered Personal Workspace</span>
        </div>
        
        <h1 className="hero-title">
          Turn mental clutter into <span>organized action</span>.
        </h1>
        
        <p className="hero-subtitle">
          CleanDesk is a calm, intelligent workspace for freelancers, creators, and multi-hyphenates. Dump your scattered thoughts and let AI structure your day.
        </p>

        <div className="hero-ctas">
          <Link href="/dashboard?onboard=true" className="btn btn-primary btn-lg">
            Get Started Free <ArrowRight size={16} />
          </Link>
          <Link href="#how-it-works" className="btn btn-secondary btn-lg">
            See How it Works
          </Link>
        </div>

        {/* Demo Paper Sheet Mockup */}
        <div className="paper-card" style={{ maxWidth: "650px", width: "100%", textAlign: "left", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem", marginBottom: "1rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--brand-accent)", fontWeight: 600 }}>
              AI BRAIN DUMP ORGANIZER
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Try typing your day below</span>
          </div>
          <div style={{ backgroundColor: "var(--bg-workspace)", padding: "1.25rem", borderRadius: "var(--radius-md)", fontStyle: "italic", color: "var(--text-muted)", marginBottom: "1.5rem", borderLeft: "3px solid var(--brand-accent)" }}>
            &quot;Need to finish my PMM assignment, write two blog posts, prepare Friday client slides, and email Sarah.&quot;
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="badge badge-high">Project</span>
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>PMM Assignment</span>
            </div>
            <div style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", borderLeft: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
                <CheckSquare size={14} style={{ color: "var(--text-muted)" }} />
                <span>Finish assignment write-up</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
              <span className="badge badge-medium">Project</span>
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Content Creation</span>
            </div>
            <div style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", borderLeft: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
                <CheckSquare size={14} style={{ color: "var(--text-muted)" }} />
                <span>Draft blog post 1</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
                <CheckSquare size={14} style={{ color: "var(--text-muted)" }} />
                <span>Draft blog post 2</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* How it Works Section */}
      <section id="how-it-works" className="workflow-section">
        <div className="section-header">
          <h2 className="section-title">The CleanDesk Workflow</h2>
          <p className="section-subtitle">A simple cycle to keep your mental desk completely clear.</p>
        </div>

        <div className="workflow-grid">
          <div className="paper-card workflow-card">
            <div className="card-num">01</div>
            <h3>Capture</h3>
            <p>Type or speak everything currently on your mind without worrying about formatting or structure.</p>
          </div>

          <div className="paper-card workflow-card">
            <div className="card-num">02</div>
            <h3>Organize</h3>
            <p>Our intelligent AI automatically breaks your thoughts down into neat projects and specific tasks.</p>
          </div>

          <div className="paper-card workflow-card">
            <div className="card-num">03</div>
            <h3>Plan</h3>
            <p>Add dates, assign priorities, and sync tasks to your Google Calendar in a single click.</p>
          </div>

          <div className="paper-card workflow-card">
            <div className="card-num">04</div>
            <h3>Execute</h3>
            <p>Log notes inside projects, track your daily targets, and check off completed items in a warm UI.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} CleanDesk. Designed for deep work and clear minds.</p>
      </footer>
    </div>
  );
}
