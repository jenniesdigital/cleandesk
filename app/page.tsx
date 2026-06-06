import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BinderLogo } from "@/lib/logo";
import "./landing.css";

const features = [
  {
    title: "Dump your thoughts, we do the sorting",
    desc: "Type whatever's on your mind — half-baked ideas, deadlines, random reminders. CleanDesk breaks it into projects and tasks automatically.",
  },
  {
    title: "Projects that hold everything together",
    desc: "Group tasks and notes under projects. Keep your law assignment, content calendar, and portfolio work in separate spaces without switching tabs.",
  },
  {
    title: "Reminders that actually remind you",
    desc: "Set it and forget it. Get an email a day before something's due, and another an hour before. No calendar-surfing required.",
  },
  {
    title: "Google Calendar sync, if you want it",
    desc: "Push tasks straight to your calendar as events. One less thing to copy-paste between apps.",
  },
];

const steps = [
  {
    num: "01",
    title: "Brain dump",
    desc: "Write or paste whatever's in your head. A sentence, a paragraph, bullet points — it doesn't matter.",
  },
  {
    num: "02",
    title: "AI structures it",
    desc: "We group your thoughts into projects and tasks with priorities and dates, using Gemini under the hood.",
  },
  {
    num: "03",
    title: "You execute",
    desc: "Check things off, take notes inside projects, and let reminders handle the follow-up.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const authUrl = `https://qaqtlidswgxqxlrvmnqn.supabase.co/auth/v1/authorize?provider=google&redirect_to=${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`;

  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="logo-container">
          <BinderLogo size={34} />
          <span className="logo-text">CleanDesk</span>
        </div>
        <nav className="landing-nav">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          {user ? (
            <Link href="/dashboard" className="btn btn-secondary btn-sm">
              Dashboard
            </Link>
          ) : (
            <Link href={authUrl} className="btn btn-primary btn-sm">
              Get started
            </Link>
          )}
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            A workspace that <span>clears your head</span> instead of adding to it.
          </h1>
          <p className="hero-subtitle">
            Most productivity tools make you organise before you start. CleanDesk works the other way — dump whatever's on your mind and let AI sort the rest.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link href="/dashboard" className="btn btn-primary btn-lg">
                Go to dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link href={authUrl} className="btn btn-primary btn-lg">
                  Try CleanDesk free <ArrowRight size={16} />
                </Link>
                <a href="#how-it-works" className="btn btn-secondary btn-lg">
                  See how it works
                </a>
              </>
            )}
          </div>
          <p className="hero-footnote">No credit card. No setup. Just a Google account.</p>
        </div>
      </section>

      <section id="features" className="section features-section">
        <div className="section-inner">
          <h2 className="section-title">What it does</h2>
          <p className="section-subtitle">Four things, done well.</p>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-num">{String(i + 1).padStart(2, "0")}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section how-section">
        <div className="section-inner">
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">Three steps from scattered to sorted.</p>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section cta-section">
        <div className="cta-card">
          <h2>You bring the mental clutter. We bring the structure.</h2>
          <p>No templates to set up. No folders to create. Just a clean space to dump your day.</p>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              Open CleanDesk <ArrowRight size={16} />
            </Link>
          ) : (
            <Link href={authUrl} className="btn btn-primary btn-lg">
              Start your free workspace <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <BinderLogo size={28} />
            <span>CleanDesk</span>
          </div>
          <p className="footer-text">Built for people with too many tabs open.</p>
        </div>
      </footer>
    </div>
  );
}
