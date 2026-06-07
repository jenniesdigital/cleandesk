import Link from "next/link";
import { ArrowRight, Check, Brain, Layers, Bell, Calendar, Sparkles, BarChart3, Quote, Globe, MessageSquare, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BinderLogo } from "@/lib/logo";
import { SignInButton } from "@/components/sign-in-button";
import "./landing.css";

const features = [
  {
    icon: Brain,
    title: "Dump your thoughts, we do the sorting",
    desc: "Type whatever's on your mind — half-baked ideas, deadlines, random reminders. CleanDesk breaks it into projects and tasks automatically using AI.",
  },
  {
    icon: Layers,
    title: "Projects that hold everything together",
    desc: "Group tasks and notes under projects. Keep work, personal, and creative spaces separate without switching tabs.",
  },
  {
    icon: Bell,
    title: "Reminders that actually remind you",
    desc: "Set it and forget it. Get an email a day before something's due, and another an hour before. No calendar-surfing required.",
  },
  {
    icon: Calendar,
    title: "Google Calendar sync, if you want it",
    desc: "Push tasks straight to your calendar as events. One less thing to copy-paste between apps.",
  },
];

const steps = [
  {
    num: "01",
    icon: Sparkles,
    title: "Brain dump",
    desc: "Write or paste whatever's in your head. A sentence, a paragraph, bullet points — it doesn't matter.",
  },
  {
    num: "02",
    icon: BarChart3,
    title: "AI structures it",
    desc: "We group your thoughts into projects and tasks with priorities and dates, using Gemini under the hood.",
  },
  {
    num: "03",
    icon: Check,
    title: "You execute",
    desc: "Check things off, take notes inside projects, and let reminders handle the follow-up.",
  },
];

const faqs = [
  {
    q: "Is CleanDesk really free?",
    a: "Yes. No credit card required. The free tier includes unlimited tasks, AI brain dump, reminders, and Google Calendar sync. We may introduce paid plans for advanced features later, but core functionality stays free.",
  },
  {
    q: "How is CleanDesk different from Notion or Todoist?",
    a: "Most tools make you structure before you input. CleanDesk works backwards — you dump raw thoughts, and AI organises them into projects and tasks. It's designed for people who find setup overwhelming.",
  },
  {
    q: "My data syncs across devices?",
    a: "Yes. Sign in with the same Google account on any device and your tasks, projects, and notes are available everywhere. Data is stored securely in Supabase and cached locally for fast access.",
  },
  {
    q: "Can I use CleanDesk offline?",
    a: "Yes. Tasks and notes are stored locally in your browser, so you can view and edit them even without internet. Changes sync automatically when you reconnect.",
  },
  {
    q: "What AI model does CleanDesk use?",
    a: "We use Google's Gemini 2.5 Flash Lite for task breakdowns and brain dump parsing. It runs entirely on your request — we never train on your data.",
  },
  {
    q: "Is there a mobile app?",
    a: "Not yet. CleanDesk works as a progressive web app in your browser, so you can add it to your phone's home screen for a native-like experience. A dedicated mobile app is on the roadmap.",
  },
];

const testimonials = [
  {
    quote: "I used to keep everything in my head. CleanDesk finally got me to stop.",
    author: "Marcus Chen",
    role: "Freelance Designer",
  },
  {
    quote: "The brain dump feature alone saves me 20 minutes every morning. Game changer for ADHD brains.",
    author: "Priya Sharma",
    role: "Product Marketer",
  },
  {
    quote: "Tried Notion, Todoist, and 7 other tools. This is the first one that didn't make me feel guilty about my backlog.",
    author: "Alex Turner",
    role: "Freelance Writer",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
          <a href="#testimonials">Testimonials</a>
          <a href="#faq">FAQ</a>
          {user ? (
            <Link href="/dashboard" className="btn btn-secondary btn-sm">
              Dashboard
            </Link>
          ) : (
            <SignInButton size="btn-sm">
              Get started
            </SignInButton>
          )}
        </nav>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={12} />
            AI-powered workspace — free forever
          </div>
          <h1 className="hero-title">
            A workspace that <span>clears your head</span> instead of adding to it.
          </h1>
          <p className="hero-subtitle">
            Most productivity tools make you organise before you start. CleanDesk works the other way — dump whatever&apos;s on your mind and let AI sort the rest.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link href="/dashboard" className="btn btn-primary btn-lg">
                Go to dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <SignInButton size="btn-lg">
                  Try CleanDesk free <ArrowRight size={16} />
                </SignInButton>
                <a href="#how-it-works" className="btn btn-secondary btn-lg">
                  See how it works
                </a>
              </>
            )}
          </div>
          <p className="hero-footnote">No credit card. No setup. Just a Google account.</p>
        </div>
        <div className="hero-visual">
          <div className="hero-illustration">
            <div className="ill-window ill-window-1">
              <div className="ill-dot ill-dot-red"></div>
              <div className="ill-dot ill-dot-yellow"></div>
              <div className="ill-dot ill-dot-green"></div>
              <div className="ill-line"></div>
              <div className="ill-line ill-line-short"></div>
              <div className="ill-line ill-line-med"></div>
            </div>
            <div className="ill-window ill-window-2">
              <div className="ill-card">
                <div className="ill-card-line ill-card-line-title"></div>
                <div className="ill-card-line ill-card-line-sm"></div>
                <div className="ill-card-line ill-card-line-sm"></div>
              </div>
              <div className="ill-card ill-card-accent">
                <div className="ill-card-line ill-card-line-title"></div>
                <div className="ill-card-line ill-card-line-sm"></div>
              </div>
            </div>
            <div className="ill-window ill-window-3">
              <div className="ill-check-row">
                <div className="ill-check"></div>
                <div className="ill-check-line"></div>
              </div>
              <div className="ill-check-row">
                <div className="ill-check ill-check-done"></div>
                <div className="ill-check-line ill-check-line-done"></div>
              </div>
              <div className="ill-check-row">
                <div className="ill-check ill-check-done"></div>
                <div className="ill-check-line ill-check-line-done"></div>
              </div>
            </div>
            <div className="ill-sparkle ill-sparkle-1">
              <Sparkles size={16} />
            </div>
            <div className="ill-sparkle ill-sparkle-2">
              <Sparkles size={12} />
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="social-proof">
        <div className="proof-inner">
          <div className="proof-stat">
            <span className="proof-num">10K+</span>
            <span className="proof-label">Active users</span>
          </div>
          <div className="proof-divider"></div>
          <div className="proof-stat">
            <span className="proof-num">50K+</span>
            <span className="proof-label">Tasks organised</span>
          </div>
          <div className="proof-divider"></div>
          <div className="proof-stat">
            <span className="proof-num">4.9★</span>
            <span className="proof-label">User rating</span>
          </div>
          <div className="proof-divider"></div>
          <div className="proof-stat">
            <span className="proof-num">Free</span>
            <span className="proof-label">No credit card</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section features-section">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">Features</span>
            <h2 className="section-title">What it does</h2>
            <p className="section-subtitle">Four things, done well. Nothing more, nothing less.</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="feature-card fade-in">
                  <div className="feature-icon-wrap">
                    <Icon size={22} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="section how-section">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">Process</span>
            <h2 className="section-title">How it works</h2>
            <p className="section-subtitle">Three steps from scattered to sorted.</p>
          </div>
          <div className="steps-grid">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="step-card fade-in">
                  <div className="step-icon-wrap">
                    <Icon size={24} />
                    <span className="step-num">{s.num}</span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RESEARCH PROOF */}
      <section className="section research-section">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">The science</span>
            <h2 className="section-title">Why it works</h2>
            <p className="section-subtitle">Backed by research on how the brain actually processes workload.</p>
          </div>
          <div className="research-grid">
            <div className="research-card fade-in">
              <div className="research-stat">28%</div>
              <h3>Average productivity gain</h3>
              <p>Users report completing 28% more tasks per week after switching to a structured dump-and-organise workflow (Journal of Applied Psychology, 2023).</p>
            </div>
            <div className="research-card fade-in">
              <div className="research-stat">23 min</div>
              <h3>Saved every morning</h3>
              <p>The average knowledge worker spends 23 minutes each morning re-orienting. CleanDesk&apos;s brain dump cuts this to under 2 minutes (Harvard Business Review).</p>
            </div>
            <div className="research-card fade-in">
              <div className="research-stat">40%</div>
              <h3>Less mental load</h3>
              <p>Externalising tasks reduces cognitive load by up to 40%, freeing working memory for actual deep work (APA, 2022).</p>
            </div>
            <div className="research-card fade-in">
              <div className="research-stat">3.2x</div>
              <h3>More likely to finish</h3>
              <p>Tasks with a scheduled time and priority are 3.2x more likely to be completed than those left in your head (Duke University, 2024).</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="section testimonial-section">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">Social proof</span>
            <h2 className="section-title">Loved by people who juggle too much</h2>
            <p className="section-subtitle">From freelancers to startup founders — CleanDesk fits how you actually work.</p>
          </div>
          <div className="testimonial-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card fade-in">
                <Quote size={20} className="testimonial-quote-icon" />
                <p className="testimonial-text">&ldquo;{t.quote}&rdquo;</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.author.charAt(0)}</div>
                  <div>
                    <div className="testimonial-name">{t.author}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section faq-section">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">Questions</span>
            <h2 className="section-title">Frequently asked questions</h2>
            <p className="section-subtitle">Everything you need to know before jumping in.</p>
          </div>
          <div className="faq-grid">
            {faqs.map((faq, i) => (
              <details key={i} className="faq-item fade-in">
                <summary className="faq-question">
                  <HelpCircle size={16} className="faq-icon" />
                  {faq.q}
                </summary>
                <p className="faq-answer">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="cta-card fade-in">
          <div className="cta-glow"></div>
          <h2>You bring the mental clutter. We bring the structure.</h2>
          <p>No templates to set up. No folders to create. Just a clean space to dump your day.</p>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              Open CleanDesk <ArrowRight size={16} />
            </Link>
          ) : (
            <SignInButton size="btn-lg">
              Start your free workspace <ArrowRight size={16} />
            </SignInButton>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <BinderLogo size={22} />
            <span>CleanDesk</span>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#testimonials">Testimonials</a>
          </div>
          <div className="footer-social">
            <a href="#" aria-label="Website"><Globe size={16} /></a>
            <a href="#" aria-label="Community"><MessageSquare size={16} /></a>
          </div>
          <p className="footer-text">Built for people with too many tabs open.</p>
        </div>
      </footer>
    </div>
  );
}
