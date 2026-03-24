'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Zap, Mail, CalendarDays, BarChart3, Shield, Globe,
  ArrowRight, Sparkles, Check, ChevronRight,
} from 'lucide-react'

// ── Mock email data for product preview ───────────────────
const MOCK_EMAILS = [
  {
    from: 'Sarah Chen',
    subject: 'Q2 Budget — Board Sign-Off Needed',
    time: '2m',
    priority: 'CRITICAL',
    pColor: '#F24E1E',
    pBg: 'rgba(242,78,30,0.14)',
    tag: 'Finance',
    selected: true,
  },
  {
    from: 'David Kim',
    subject: 'Partnership proposal — follow-up',
    time: '18m',
    priority: 'HIGH',
    pColor: '#FFB347',
    pBg: 'rgba(255,179,71,0.12)',
    tag: 'Business',
    selected: false,
  },
  {
    from: 'Alex Morgan',
    subject: 'Team standup moved to 3pm',
    time: '1h',
    priority: 'MEDIUM',
    pColor: '#4DABF7',
    pBg: 'rgba(77,171,247,0.12)',
    tag: 'Meeting',
    selected: false,
  },
  {
    from: 'Stripe',
    subject: 'Invoice #INV-2026-0341 ready',
    time: '3h',
    priority: 'LOW',
    pColor: '#5A5A68',
    pBg: 'rgba(90,90,104,0.10)',
    tag: null,
    selected: false,
  },
]

const FEATURES = [
  {
    Icon: Zap,
    title: 'AI Triage',
    desc: 'Every email scored instantly. Critical, high, medium, or low — so you always know exactly where to focus first.',
  },
  {
    Icon: Sparkles,
    title: 'Smart Drafts',
    desc: 'Context-aware replies written in your voice. Review, edit, and send — or delegate entirely to ARIA.',
  },
  {
    Icon: CalendarDays,
    title: 'Calendar Intelligence',
    desc: 'Meeting requests parsed and booked automatically. No more back-and-forth scheduling threads.',
  },
  {
    Icon: BarChart3,
    title: 'Inbox Analytics',
    desc: 'Response times, volume patterns, and top senders. Understand your communication at a glance.',
  },
  {
    Icon: Shield,
    title: 'Zero-Knowledge Security',
    desc: 'AES-256 encryption for every stored token. Your credentials are yours — fully encrypted at rest.',
  },
  {
    Icon: Globe,
    title: 'Universal Providers',
    desc: 'Gmail, Outlook, and any IMAP/SMTP server. One intelligent AI layer above all your email.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Connect your inbox',
    desc: 'Link Gmail, Outlook, or any IMAP account. OAuth or app password — live in under 60 seconds.',
  },
  {
    n: '02',
    title: 'ARIA learns instantly',
    desc: 'AI reads and classifies your email. Priority scores, categories, and summaries appear immediately.',
  },
  {
    n: '03',
    title: 'You act, ARIA assists',
    desc: 'Reply, delegate, schedule, or archive — with ARIA doing the analysis and drafting for you.',
  },
]

const GUARANTEES = ['No credit card required', 'Gmail + Outlook + IMAP', 'Cancel anytime']

// ── Root component ─────────────────────────────────────────
export function LandingPage() {
  return (
    <div
      className="dark"
      style={{
        background: '#09090F',
        minHeight: '100dvh',
        height: '100dvh',
        overflowY: 'auto',
        overflowX: 'hidden',
        color: '#EEEEF0',
        fontFamily: 'var(--font-inter, system-ui, sans-serif)',
        scrollBehavior: 'smooth',
      }}
    >
      <LandingNav />

      <main>
        <HeroSection />
        <TrustBar />
        <FeaturesSection />
        <HowItWorksSection />
        <CtaSection />
      </main>

      <LandingFooter />
    </div>
  )
}

// ── Navigation ─────────────────────────────────────────────
function LandingNav() {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(9,9,15,0.80)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: '#F24E1E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(242,78,30,0.30)',
              flexShrink: 0,
            }}
          >
            <Zap size={13} color="#FFF" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              color: '#EEEEF0',
            }}
          >
            Aria<span style={{ color: '#F24E1E' }}>.</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-7">
          {[
            { label: 'Features', href: '#features' },
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Security', href: '#security' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}
              className="hover:text-white/80 transition-colors duration-150"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="hidden sm:flex items-center transition-colors duration-150 hover:text-white/75"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.45)',
              padding: '6px 14px',
              borderRadius: 8,
            }}
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
            style={{
              background: '#F24E1E',
              color: '#FFF',
              fontSize: 13,
              padding: '7px 16px',
              borderRadius: 9,
              boxShadow: '0 3px 14px rgba(242,78,30,0.28)',
            }}
          >
            Get started
            <ChevronRight size={13} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ── Hero ───────────────────────────────────────────────────
function HeroSection() {
  return (
    <section style={{ padding: '88px 24px 96px', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glows */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: '-30%', right: '-8%',
          width: 800, height: 800,
          background: 'radial-gradient(ellipse, rgba(124,92,255,0.07) 0%, transparent 58%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute', bottom: '-20%', left: '-6%',
          width: 600, height: 600,
          background: 'radial-gradient(ellipse, rgba(242,78,30,0.06) 0%, transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center"
          style={{ marginBottom: 32 }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              background: 'rgba(242,78,30,0.10)',
              border: '1px solid rgba(242,78,30,0.22)',
              borderRadius: 99,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              color: '#FF6B3D',
              letterSpacing: '0.01em',
            }}
          >
            <Sparkles size={12} strokeWidth={2} />
            Powered by Claude AI · Built for modern executives
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
          style={{
            fontSize: 'clamp(42px, 7.5vw, 80px)',
            fontWeight: 800,
            letterSpacing: '-0.045em',
            lineHeight: 1.04,
            color: '#EEEEF0',
            marginBottom: 26,
          }}
        >
          Your inbox,{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #F24E1E 10%, #FF8A5B 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            finally intelligent.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="text-center mx-auto"
          style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.48)',
            lineHeight: 1.7,
            maxWidth: 500,
            marginBottom: 44,
          }}
        >
          ARIA reads every message, prioritizes what matters, and drafts replies in your voice — automatically.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.20 }}
          className="flex items-center justify-center gap-3 flex-wrap"
          style={{ marginBottom: 76 }}
        >
          <Link
            href="/login"
            className="flex items-center gap-2 font-bold transition-all duration-150 hover:opacity-92 active:scale-[0.97]"
            style={{
              background: '#F24E1E',
              color: '#FFF',
              fontSize: 14,
              padding: '13px 28px',
              borderRadius: 12,
              boxShadow: '0 6px 28px rgba(242,78,30,0.36)',
              letterSpacing: '-0.01em',
            }}
          >
            Get started — it&apos;s free
            <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 font-medium transition-all duration-150 hover:border-white/20 hover:text-white/75"
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 14,
              padding: '13px 22px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            See how it works
          </a>
        </motion.div>

        {/* Product mockup */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <ProductPreview />
        </motion.div>
      </div>
    </section>
  )
}

// ── Product preview (inline UI mockup) ────────────────────
function ProductPreview() {
  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: 860,
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.04)',
        background: '#0D0D15',
        userSelect: 'none',
      }}
    >
      {/* Window chrome */}
      <div
        style={{
          background: '#0A0A12',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 5, background: '#FF5F57' }} />
        <div style={{ width: 10, height: 10, borderRadius: 5, background: '#FEBC2E' }} />
        <div style={{ width: 10, height: 10, borderRadius: 5, background: '#28C840' }} />
        <span
          style={{
            marginLeft: 10,
            fontSize: 11,
            color: 'rgba(255,255,255,0.22)',
            fontFamily: 'monospace',
            letterSpacing: '0.02em',
          }}
        >
          aria — inbox
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              background: '#51CF66',
              boxShadow: '0 0 6px rgba(81,207,102,0.65)',
            }}
          />
          <span
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.22)',
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            Agent Active
          </span>
        </div>
      </div>

      {/* App body */}
      <div style={{ display: 'flex', height: 340 }}>
        {/* Mini sidebar */}
        <div
          style={{
            width: 52,
            borderRight: '1px solid rgba(255,255,255,0.05)',
            padding: '16px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            flexShrink: 0,
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'rgba(242,78,30,0.15)',
              border: '1px solid rgba(242,78,30,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={13} color="#F24E1E" strokeWidth={2} />
          </div>
          {/* Nav stubs */}
          {[18, 16, 16, 18, 14].map((w, i) => (
            <div
              key={i}
              style={{
                width: w,
                height: w,
                borderRadius: 4,
                background: i === 0
                  ? 'rgba(242,78,30,0.12)'
                  : 'rgba(255,255,255,0.05)',
              }}
            />
          ))}
        </div>

        {/* Email list */}
        <div
          style={{
            width: 272,
            borderRight: '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
            overflowY: 'hidden',
          }}
        >
          {/* List header */}
          <div
            style={{
              padding: '11px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#EEEEF0' }}>Inbox</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: 'rgba(242,78,30,0.14)',
                  color: '#F24E1E',
                  padding: '2px 7px',
                  borderRadius: 6,
                  letterSpacing: '0.02em',
                }}
              >
                3 critical
              </span>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0, 1].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Email rows */}
          {MOCK_EMAILS.map((email, i) => (
            <div
              key={i}
              style={{
                padding: '11px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: email.selected ? 'rgba(242,78,30,0.06)' : 'transparent',
                borderLeft: email.selected ? '2px solid #F24E1E' : '2px solid transparent',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: email.selected ? 700 : 500,
                    color: email.selected ? '#EEEEF0' : 'rgba(255,255,255,0.60)',
                  }}
                >
                  {email.from}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>
                  {email.time}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: email.selected ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.38)',
                  fontWeight: email.selected ? 600 : 400,
                  marginBottom: 7,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {email.subject}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: email.pBg,
                    color: email.pColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {email.priority}
                </span>
                {email.tag && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.32)',
                    }}
                  >
                    {email.tag}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AI analysis panel */}
        <div style={{ flex: 1, padding: '18px 20px', minWidth: 0 }}>
          {/* Panel header */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20 }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: '#F24E1E',
                boxShadow: '0 0 7px rgba(242,78,30,0.55)',
              }}
            />
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.30)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              ARIA Analysis
            </span>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 4, fontWeight: 500 }}>
              Priority
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#F24E1E', letterSpacing: '-0.02em' }}>
              Critical
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 5, fontWeight: 500 }}>
              Category
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {['Finance', 'Approval'].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.48)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 4, fontWeight: 500 }}>
              AI Summary
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.58)', lineHeight: 1.65 }}>
              Q2 budget requires board sign-off by EOD. Blocking 3 downstream teams and the upcoming product launch.
            </div>
          </div>

          {/* Draft reply card */}
          <div
            style={{
              background: 'rgba(242,78,30,0.11)',
              border: '1px solid rgba(242,78,30,0.22)',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#F24E1E', marginBottom: 2 }}>
                Draft reply
              </div>
              <div style={{ fontSize: 10, color: 'rgba(242,78,30,0.55)' }}>Generated in your voice</div>
            </div>
            <ArrowRight size={13} color="#F24E1E" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Trust bar ──────────────────────────────────────────────
function TrustBar() {
  return (
    <div
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '18px 24px',
        marginBottom: 100,
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '0 24px',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.22)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          Works with
        </span>

        {[
          { label: 'Google Gmail', color: '#4285F4' },
          { label: 'Microsoft Outlook', color: '#0078D4' },
          { label: 'Any IMAP / SMTP', color: 'rgba(255,255,255,0.40)' },
        ].map(({ label, color }, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {i > 0 && (
              <div
                style={{
                  width: 1,
                  height: 14,
                  background: 'rgba(255,255,255,0.08)',
                  marginRight: -6,
                }}
              />
            )}
            <span style={{ fontSize: 13, fontWeight: 500, color }}>{label}</span>
          </div>
        ))}

        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />

        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>
          Built on{' '}
          <span style={{ color: '#FF6B3D', fontWeight: 600 }}>Claude AI</span>
        </span>
      </div>
    </div>
  )
}

// ── Features ───────────────────────────────────────────────
function FeaturesSection() {
  return (
    <section id="features" style={{ padding: '0 24px 108px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center"
          style={{ marginBottom: 56 }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#F24E1E',
              marginBottom: 14,
            }}
          >
            Capabilities
          </p>
          <h2
            style={{
              fontSize: 'clamp(28px, 4.5vw, 48px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#EEEEF0',
              lineHeight: 1.08,
              marginBottom: 16,
            }}
          >
            Everything your inbox needs
          </h2>
          <p
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.42)',
              maxWidth: 420,
              margin: '0 auto',
              lineHeight: 1.65,
            }}
          >
            Six core capabilities, working together as one seamless AI layer.
          </p>
        </motion.div>

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.42, delay: i * 0.055 }}
              style={{
                background: 'rgba(255,255,255,0.028)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18,
                padding: '26px 24px',
                transition: 'background 0.18s, border-color 0.18s',
              }}
              className="hover:bg-white/[0.05] hover:border-white/[0.12] cursor-default"
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  background: 'rgba(242,78,30,0.11)',
                  border: '1px solid rgba(242,78,30,0.20)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 18,
                }}
              >
                <f.Icon size={18} color="#F24E1E" strokeWidth={1.75} />
              </div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#EEEEF0',
                  marginBottom: 9,
                  letterSpacing: '-0.015em',
                }}
              >
                {f.title}
              </h3>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.44)', lineHeight: 1.68 }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How it works ───────────────────────────────────────────
function HowItWorksSection() {
  return (
    <section id="how-it-works" style={{ padding: '0 24px 108px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center"
          style={{ marginBottom: 56 }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#F24E1E',
              marginBottom: 14,
            }}
          >
            Setup
          </p>
          <h2
            style={{
              fontSize: 'clamp(28px, 4.5vw, 48px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#EEEEF0',
              lineHeight: 1.08,
              marginBottom: 16,
            }}
          >
            Up and running in 60 seconds
          </h2>
          <p
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.42)',
              maxWidth: 380,
              margin: '0 auto',
              lineHeight: 1.65,
            }}
          >
            No engineering required. Connect once, then let ARIA handle the rest.
          </p>
        </motion.div>

        {/* Steps */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 3,
          }}
        >
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.42, delay: i * 0.08 }}
              style={{
                padding: '34px 28px',
                background: i === 1 ? 'rgba(242,78,30,0.05)' : 'transparent',
                border: `1px solid ${i === 1 ? 'rgba(242,78,30,0.18)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 18,
                position: 'relative',
              }}
            >
              {/* Step number */}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: i === 1 ? 'rgba(242,78,30,0.70)' : 'rgba(255,255,255,0.18)',
                  marginBottom: 22,
                  textTransform: 'uppercase',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {step.n}
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#EEEEF0',
                  marginBottom: 10,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.25,
                }}
              >
                {step.title}
              </h3>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.44)', lineHeight: 1.68 }}>
                {step.desc}
              </p>

              {/* Arrow connector */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden md:flex"
                  style={{
                    position: 'absolute',
                    right: -14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 1,
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    background: '#0D0D15',
                    border: '1px solid rgba(255,255,255,0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={13} color="rgba(255,255,255,0.25)" strokeWidth={2} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA ────────────────────────────────────────────────────
function CtaSection() {
  return (
    <section id="security" style={{ padding: '0 24px 108px' }}>
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          maxWidth: 680,
          margin: '0 auto',
          background: 'rgba(242,78,30,0.055)',
          border: '1px solid rgba(242,78,30,0.16)',
          borderRadius: 28,
          padding: '72px 40px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '-40%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 300,
            background: 'radial-gradient(ellipse, rgba(242,78,30,0.13) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: '#F24E1E',
            boxShadow: '0 10px 32px rgba(242,78,30,0.38)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
          }}
        >
          <Zap size={24} color="#FFF" strokeWidth={2.5} />
        </div>

        <h2
          style={{
            fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#EEEEF0',
            marginBottom: 16,
            lineHeight: 1.1,
          }}
        >
          Ready to take back your inbox?
        </h2>

        <p
          style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.48)',
            lineHeight: 1.7,
            maxWidth: 400,
            margin: '0 auto 40px',
          }}
        >
          Join founders and executives who use ARIA to stay on top of their email — effortlessly.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 font-bold transition-all duration-150 hover:opacity-92 active:scale-[0.97]"
          style={{
            background: '#F24E1E',
            color: '#FFF',
            fontSize: 15,
            padding: '14px 32px',
            borderRadius: 13,
            boxShadow: '0 8px 32px rgba(242,78,30,0.40)',
            letterSpacing: '-0.01em',
          }}
        >
          Get started — it&apos;s free
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>

        {/* Guarantees */}
        <div
          style={{
            marginTop: 28,
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '8px 20px',
          }}
        >
          {GUARANTEES.map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: 'rgba(255,255,255,0.32)',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  border: '1px solid rgba(242,78,30,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check size={8} color="rgba(242,78,30,0.75)" strokeWidth={2.5} />
              </div>
              {item}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '28px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: '#F24E1E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={10} color="#FFF" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            Aria<span style={{ color: '#F24E1E' }}>.</span>
          </span>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>
          © 2026 ARIA · AI Executive Assistant
        </p>

        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Security'].map((link) => (
            <a
              key={link}
              href="#"
              style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.28)' }}
              className="hover:text-white/55 transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
