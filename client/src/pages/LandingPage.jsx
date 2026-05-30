import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Shield, Zap, Users, FileText, Brain,
  ArrowRight, Star, Play, Check,
  ChevronRight, Sparkles,
  Activity, Clock, Lock
} from 'lucide-react';
import './LandingPage.css';

/* ── Inline SVG social icons (lucide-react doesn't ship brand icons) ── */
const IconGithub = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);
const IconTwitter = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631ZM17.083 20.028h1.832L6.987 4.126H5.027Z"/>
  </svg>
);
const IconLinkedin = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);
const IconInstagram = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
);

/* ──────────────────────────────────────
   SCROLL REVEAL HOOK
────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ──────────────────────────────────────
   HEADER
────────────────────────────────────── */
function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`lp-header ${scrolled ? 'scrolled' : ''}`}>
      <a href="#" className="lp-logo">
        <div className="lp-logo-icon">
          <Heart size={20} strokeWidth={2.5} />
        </div>
        <span className="lp-logo-text">Meri<span>Nurse</span></span>
      </a>

      <nav className="lp-nav">
        <a href="#features" className="lp-nav-link">Features</a>
        <a href="#how-it-works" className="lp-nav-link">How It Works</a>
        <a href="#testimonials" className="lp-nav-link">Testimonials</a>
        <a href="#pricing" className="lp-nav-link">Pricing</a>
      </nav>

      <div className="lp-nav-actions">
        <Link to="/login" className="lp-btn-ghost">Sign In</Link>
        <Link to="/register" className="lp-btn-primary">
          Get Started <ArrowRight size={15} />
        </Link>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────
   HERO SECTION
────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="lp-hero" id="hero">
      {/* Peach gradient bg */}
      <div className="lp-hero-bg" />

      {/* Vertical stripes (like the image) */}
      <div className="lp-hero-stripes">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="lp-stripe" />
        ))}
      </div>

      {/* 3D Sphere */}
      <div className="lp-sphere-container">
        <div className="lp-sphere" />
      </div>

      {/* Sparkle */}
      <div className="lp-sparkle">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
          <path d="M11 0 L12.5 9 L22 11 L12.5 13 L11 22 L9.5 13 L0 11 L9.5 9 Z" />
        </svg>
      </div>

      {/* ── Left: Hero Content ── */}
      <div className="lp-hero-content">
        <div className="lp-hero-badge">
          <div className="lp-hero-badge-dot" />
          India's #1 Health Management Platform
        </div>

        <h1 className="lp-hero-title">
          Your Health,<br />
          <span className="highlight">Our Priority</span>
        </h1>

        <p className="lp-hero-sub">
          MeriNurse empowers patients and healthcare providers with intelligent tools
          for seamless medical record management, AI-powered diagnostics, and
          real-time care coordination — all in one place.
        </p>

        <div className="lp-hero-actions">
          <Link to="/register" className="lp-btn-hero-primary">
            Start Free Today <ArrowRight size={18} />
          </Link>
          <a href="#how-it-works" className="lp-btn-hero-ghost">
            <Play size={16} fill="currentColor" /> See How It Works
          </a>
        </div>

        <div className="lp-hero-stats">
          <div className="lp-stat-item">
            <span className="lp-stat-num">50K+</span>
            <span className="lp-stat-label">Active Patients</span>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat-item">
            <span className="lp-stat-num">2,400+</span>
            <span className="lp-stat-label">Doctors Enrolled</span>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat-item">
            <span className="lp-stat-num">99.9%</span>
            <span className="lp-stat-label">Uptime SLA</span>
          </div>
        </div>
      </div>

      {/* ── Right: Motivation Card ── */}
      <div className="lp-hero-right">
        <div className="lp-motivation">
          <div className="lp-motivation-icon">
            <Sparkles size={20} strokeWidth={2} />
          </div>
          <p className="lp-motivation-quote">Daily Inspiration</p>
          <h3 className="lp-motivation-text">
            "Healing is not just a science — it's an act of compassion."
          </h3>
          <p className="lp-motivation-sub">
            Every great journey toward wellness begins with a single step.
            Trust the process, trust your team, trust yourself.
          </p>
          <div className="lp-motivation-author">
            <div className="lp-motivation-avatar">MN</div>
            <div className="lp-motivation-author-info">
              <span className="lp-motivation-author-name">MeriNurse Team</span>
              <span className="lp-motivation-author-role">Wellness Advocates</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   FEATURE CARDS SECTION
────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Shield size={24} />,
    iconClass: 'peach',
    title: 'Secure Health Records',
    text: 'AES-256 encrypted storage for all your medical documents, accessible only by you and your chosen providers.',
  },
  {
    icon: <Brain size={24} />,
    iconClass: 'purple',
    title: 'AI Health Assistant',
    text: 'Chat with our intelligent AI to get instant answers about symptoms, medications, and wellness tips.',
  },
  {
    icon: <Activity size={24} />,
    iconClass: 'rose',
    title: 'Real-Time Monitoring',
    text: 'Track vitals, appointments, and prescriptions in a beautiful unified dashboard updated live.',
  },
  {
    icon: <Users size={24} />,
    iconClass: 'teal',
    title: 'Doctor Collaboration',
    text: 'Securely share your records with specialists and manage access permissions with one tap.',
  },
  {
    icon: <FileText size={24} />,
    iconClass: 'amber',
    title: 'Smart Prescriptions',
    text: 'Digitize and organise prescriptions, set medication reminders, and detect drug interactions.',
  },
  {
    icon: <Clock size={24} />,
    iconClass: 'emerald',
    title: 'Appointment Manager',
    text: 'Schedule, reschedule, and receive smart reminders for all your healthcare visits effortlessly.',
  },
];

function FeaturesSection() {
  return (
    <section className="lp-section" id="features">
      <p className="lp-section-label lp-reveal">
        <Zap size={14} fill="currentColor" /> Core Features
      </p>
      <h2 className="lp-section-title lp-reveal lp-reveal-delay-1">
        Everything you need for<br />modern healthcare
      </h2>
      <p className="lp-section-sub lp-reveal lp-reveal-delay-2">
        From encrypted records to AI-driven insights — MeriNurse brings
        hospital-grade tools into your pocket.
      </p>

      <div className="lp-cards-grid">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`lp-feature-card lp-reveal lp-reveal-delay-${Math.min(i + 1, 6)}`}
          >
            <div className={`lp-card-icon ${f.iconClass}`}>{f.icon}</div>
            <h3 className="lp-card-title">{f.title}</h3>
            <p className="lp-card-text">{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   HOW IT WORKS
────────────────────────────────────── */
const STEPS = [
  { num: '01', title: 'Create Your Profile', text: 'Sign up in 60 seconds. Enter your basic info and health history to set up your personalised vault.' },
  { num: '02', title: 'Upload Your Records', text: 'Drag-and-drop prescriptions, lab reports, and scans. Our AI auto-categorises everything for you.' },
  { num: '03', title: 'Connect With Doctors', text: 'Invite your physicians directly. They see exactly what they need — nothing more, nothing less.' },
  { num: '04', title: 'Stay on Top of Health', text: 'Receive smart reminders, AI insights, and weekly wellness summaries straight to your phone.' },
];

function HowItWorksSection() {
  return (
    <section className="lp-section" id="how-it-works" style={{ background: 'linear-gradient(180deg, #fdf0ec 0%, #f9e4da 100%)' }}>
      <p className="lp-section-label lp-reveal">
        <Lock size={14} /> How It Works
      </p>
      <h2 className="lp-section-title lp-reveal lp-reveal-delay-1">
        Up & running in minutes
      </h2>
      <p className="lp-section-sub lp-reveal lp-reveal-delay-2">
        No paperwork, no complexity — just a simple four-step journey to complete health control.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
        {STEPS.map((s, i) => (
          <div key={s.num} className={`lp-feature-card lp-reveal lp-reveal-delay-${i + 1}`} style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '3rem',
              fontWeight: 900,
              color: 'rgba(240,137,106,0.18)',
              lineHeight: 1,
              marginBottom: 12,
              letterSpacing: '-0.04em',
            }}>{s.num}</div>
            <h3 className="lp-card-title">{s.title}</h3>
            <p className="lp-card-text">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   TESTIMONIALS
────────────────────────────────────── */
const TESTIMONIALS = [
  {
    text: `"MeriNurse completely transformed how I manage my mother's chronic illness. Having everything in one place gives us so much peace of mind."`,
    name: 'Priya Sharma',
    role: 'Patient — Mumbai',
    initials: 'PS',
    bg: 'linear-gradient(135deg, #f0896a, #c03828)',
  },
  {
    text: '"As a cardiologist, the secure record sharing saves me hours every week. I can access the exact scans I need before a consultation begins."',
    name: 'Dr. Rajesh Mehta',
    role: 'Cardiologist — Delhi',
    initials: 'RM',
    bg: 'linear-gradient(135deg, #6366f1, #4338ca)',
  },
  {
    text: '"The AI assistant caught a potential drug interaction my pharmacist missed. This app literally saved my life. I cannot recommend it enough."',
    name: 'Anita Krishnan',
    role: 'Patient — Bengaluru',
    initials: 'AK',
    bg: 'linear-gradient(135deg, #10b981, #059669)',
  },
];

function TestimonialsSection() {
  return (
    <section className="lp-testimonials" id="testimonials">
      <p className="lp-section-label lp-reveal">
        <Star size={14} fill="currentColor" /> Testimonials
      </p>
      <h2 className="lp-section-title lp-reveal lp-reveal-delay-1">
        Loved by patients &amp; doctors
      </h2>
      <p className="lp-section-sub lp-reveal lp-reveal-delay-2">
        Real stories from real users across India who transformed their healthcare experience.
      </p>

      <div className="lp-testimonials-grid">
        {TESTIMONIALS.map((t, i) => (
          <div key={t.name} className={`lp-testimonial-card lp-reveal lp-reveal-delay-${i + 1}`}>
            <div className="lp-testimonial-stars">
              {[...Array(5)].map((_, si) => <Star key={si} size={14} fill="currentColor" />)}
            </div>
            <p className="lp-testimonial-text">{t.text}</p>
            <div className="lp-testimonial-author">
              <div className="lp-testimonial-avatar" style={{ background: t.bg }}>{t.initials}</div>
              <div>
                <p className="lp-testimonial-name">{t.name}</p>
                <p className="lp-testimonial-role">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   PRICING SECTION
────────────────────────────────────── */
const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: '/month',
    desc: 'Perfect for individuals getting started with digital health.',
    features: ['5 GB health storage', 'AI assistant (50 queries/mo)', '1 doctor connection', 'Basic dashboard', 'Email support'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '₹299',
    period: '/month',
    desc: 'Designed for active patients managing ongoing care.',
    features: ['Unlimited health storage', 'Unlimited AI queries', '10 doctor connections', 'Advanced analytics', 'Priority support', 'Drug interaction alerts'],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Family',
    price: '₹599',
    period: '/month',
    desc: `One subscription for your entire family's health management.`,
    features: ['Everything in Pro', 'Up to 6 family members', 'Family health overview', 'Dedicated care manager', '24/7 phone support', 'Annual health report'],
    cta: 'Choose Family',
    highlighted: false,
  },
];

function PricingSection() {
  return (
    <section className="lp-section" id="pricing">
      <p className="lp-section-label lp-reveal">
        <Zap size={14} fill="currentColor" /> Pricing
      </p>
      <h2 className="lp-section-title lp-reveal lp-reveal-delay-1">
        Simple, transparent pricing
      </h2>
      <p className="lp-section-sub lp-reveal lp-reveal-delay-2">
        No hidden fees. No surprises. Cancel anytime.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
        {PLANS.map((plan, i) => (
          <div
            key={plan.name}
            className={`lp-reveal lp-reveal-delay-${i + 1}`}
            style={{
              background: plan.highlighted
                ? 'linear-gradient(135deg, var(--coral-mid), var(--coral-deep))'
                : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(16px)',
              border: plan.highlighted ? 'none' : '1px solid rgba(255,255,255,0.85)',
              borderRadius: 24,
              padding: '36px 28px',
              boxShadow: plan.highlighted
                ? '0 16px 60px rgba(200,80,50,0.4)'
                : '0 2px 20px rgba(180,60,30,0.07)',
              transition: 'all 0.35s cubic-bezier(0.22,0.61,0.36,1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {plan.highlighted && (
              <div style={{
                position: 'absolute', top: 16, right: 20,
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                color: 'white', fontSize: '0.72rem', fontWeight: 700,
                padding: '4px 12px', borderRadius: 999, letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>Most Popular</div>
            )}
            <p style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
              color: plan.highlighted ? 'rgba(255,255,255,0.85)' : 'var(--text-soft)',
              marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>{plan.name}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '2.8rem', fontWeight: 900,
                color: plan.highlighted ? 'white' : 'var(--text-dark)', letterSpacing: '-0.04em',
              }}>{plan.price}</span>
              <span style={{ fontSize: '0.875rem', color: plan.highlighted ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}>{plan.period}</span>
            </div>
            <p style={{
              fontSize: '0.875rem', color: plan.highlighted ? 'rgba(255,255,255,0.75)' : 'var(--text-soft)',
              lineHeight: 1.65, marginBottom: 28,
            }}>{plan.desc}</p>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem',
                  color: plan.highlighted ? 'rgba(255,255,255,0.9)' : 'var(--text-mid)' }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: plan.highlighted ? 'rgba(255,255,255,0.2)' : 'rgba(240,137,106,0.15)',
                    color: plan.highlighted ? 'white' : 'var(--coral-mid)',
                  }}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              to="/register"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem',
                padding: '14px 24px', borderRadius: 999, textDecoration: 'none',
                transition: 'all 0.35s cubic-bezier(0.22,0.61,0.36,1)',
                background: plan.highlighted ? 'white' : 'linear-gradient(135deg, var(--coral-mid), var(--coral-deep))',
                color: plan.highlighted ? 'var(--coral-deep)' : 'white',
                boxShadow: plan.highlighted ? '0 4px 20px rgba(0,0,0,0.15)' : '0 4px 20px rgba(200,80,50,0.3)',
              }}
            >
              {plan.cta} <ChevronRight size={16} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   CTA SECTION
────────────────────────────────────── */
function CTASection() {
  return (
    <section className="lp-cta">
      <div className="lp-cta-bg" />
      <div className="lp-cta-glow" />
      <div className="lp-cta-content">
        <div className="lp-hero-badge lp-reveal" style={{ justifyContent: 'center' }}>
          <div className="lp-hero-badge-dot" />
          Join 50,000+ users today
        </div>
        <h2 className="lp-cta-title lp-reveal lp-reveal-delay-1">
          Take control of your<br />health journey now
        </h2>
        <p className="lp-cta-sub lp-reveal lp-reveal-delay-2">
          Sign up in 60 seconds. No credit card required.
          Experience the future of personal healthcare management.
        </p>
        <div className="lp-cta-actions lp-reveal lp-reveal-delay-3">
          <Link to="/register" className="lp-btn-hero-primary">
            Create Free Account <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="lp-btn-hero-ghost">
            Sign In Instead
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   FOOTER
────────────────────────────────────── */
function LandingFooter() {
  const PRODUCT_LINKS = ['Dashboard', 'Medical Records', 'AI Assistant', 'Prescriptions', 'Appointments', 'Doctor Access'];
  const COMPANY_LINKS = ['About Us', 'Careers', 'Press Kit', 'Blog', 'Partners'];
  const LEGAL_LINKS  = ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'HIPAA Compliance'];

  return (
    <footer className="lp-footer">
      <div className="lp-footer-top">
        <div className="lp-footer-brand">
          <div className="lp-footer-logo">
            <div className="lp-footer-logo-icon">
              <Heart size={18} strokeWidth={2.5} />
            </div>
            <span className="lp-footer-logo-text">Meri<span>Nurse</span></span>
          </div>
          <p className="lp-footer-desc">
            India's most trusted digital health platform — empowering patients
            and healthcare providers with intelligent, secure, and seamless care tools.
          </p>
          <div className="lp-footer-social">
            {[
              { icon: <IconTwitter />, label: 'Twitter' },
              { icon: <IconGithub />, label: 'GitHub' },
              { icon: <IconLinkedin />, label: 'LinkedIn' },
              { icon: <IconInstagram />, label: 'Instagram' },
            ].map((s) => (
              <a key={s.label} href="#" className="lp-social-btn" aria-label={s.label}>{s.icon}</a>
            ))}
          </div>
        </div>

        <div>
          <p className="lp-footer-col-title">Product</p>
          <div className="lp-footer-links">
            {PRODUCT_LINKS.map((l) => <span key={l} className="lp-footer-link">{l}</span>)}
          </div>
        </div>

        <div>
          <p className="lp-footer-col-title">Company</p>
          <div className="lp-footer-links">
            {COMPANY_LINKS.map((l) => <span key={l} className="lp-footer-link">{l}</span>)}
          </div>
        </div>

        <div>
          <p className="lp-footer-col-title">Legal</p>
          <div className="lp-footer-links">
            {LEGAL_LINKS.map((l) => <span key={l} className="lp-footer-link">{l}</span>)}
          </div>
        </div>
      </div>

      <div className="lp-footer-bottom">
        <span>© {new Date().getFullYear()} MeriNurse Technologies Pvt. Ltd. All rights reserved.</span>
        <div className="lp-footer-bottom-links">
          <span className="lp-footer-bottom-link">Privacy</span>
          <span className="lp-footer-bottom-link">Terms</span>
          <span className="lp-footer-bottom-link">Cookies</span>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────
   MAIN LANDING PAGE
────────────────────────────────────── */
export default function LandingPage() {
  useScrollReveal();

  return (
    <div className="landing-root">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
