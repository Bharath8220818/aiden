import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { 
  Sparkles, Box, Shield, Users, ArrowRight, 
  ChevronRight, Brain, 
  LineChart, Activity 
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  animate: {
    transition: { staggerChildren: 0.08 },
  },
};

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-background)]">
      {/* ── Animated Gradient Background ── */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] animate-drift rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] animate-drift rounded-full bg-cyan-500/20 blur-[120px]" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 animate-drift rounded-full bg-purple-500/10 blur-[100px]" style={{ animationDelay: '-10s' }} />
      </div>

      {/* ── Grid Overlay ── */}
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-[0.03]" />

      {/* ── Navigation ── */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 text-white font-bold text-lg shadow-lg shadow-purple-500/30">
            A
          </div>
          <span className="text-xl font-bold text-[var(--color-text)]">AIDEN</span>
        </Link>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAuth(true)}
            className="btn-ghost text-sm"
          >
            Sign In
          </button>
          <button
            onClick={() => setShowAuth(true)}
            className="btn-primary text-sm"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-32">
        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-400">
            <Sparkles className="h-4 w-4" />
            Autonomous AI Data Engineering Platform
          </motion.div>

          <motion.h1 variants={fadeUp} className="mb-6 text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
            Build Data Pipelines{' '}
            <span className="text-gradient">with AI</span>
            <br />
            Not Just Code
          </motion.h1>

          <motion.p variants={fadeUp} className="mx-auto mb-10 max-w-2xl text-lg text-[var(--color-text-secondary)]">
            AIDEN uses 15 specialized AI agents to design, build, deploy, and monitor your data pipelines. 
            Just describe what you need — in text, voice, or a diagram — and watch it come to life.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowAuth(true)}
              className="btn-primary-gradient btn-lg group"
            >
              Start Building Free
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => setShowAuth(true)}
              className="btn-secondary btn-lg"
            >
              View Demo
            </button>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--color-text-muted)]">
            <span className="flex items-center gap-2"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> Open Source</span>
            <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> SOC 2 Compliant</span>
            <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Trusted by 5,000+ Engineers</span>
          </motion.div>
        </motion.div>

        {/* ── Feature Cards ── */}
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={stagger}
          className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { icon: Brain, title: 'AI-Powered', desc: '15 specialized agents that understand your data architecture' },
            { icon: Box, title: 'Visual Designer', desc: 'Drag-and-drop canvas for pipelines, schemas, and architecture' },
            { icon: Activity, title: 'Self-Healing', desc: 'Automatic failure detection, diagnosis, and recovery' },
            { icon: LineChart, title: 'Real-Time Monitoring', desc: 'Live pipeline health, data quality, and cost tracking' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="glass-card group p-6"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 group-hover:from-purple-500/30 group-hover:to-cyan-500/30 transition-all">
                <feature.icon className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="mb-2 font-semibold text-[var(--color-text)]">{feature.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Auth Modal ── */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-md overflow-hidden p-8"
          >
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 text-white font-bold text-2xl shadow-lg shadow-purple-500/30">
                A
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">Welcome to AIDEN</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Sign in to start building with AI</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => navigate('/login')}
                className="btn-primary-gradient w-full py-3 text-base"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="btn-secondary w-full py-3 text-base"
              >
                Create Account
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--color-border)]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[var(--color-card)] px-2 text-[var(--color-text-muted)]">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="btn-secondary py-2.5">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> GitHub
                </button>
                <button className="btn-secondary py-2.5">
                  <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowAuth(false)}
              className="mt-6 w-full text-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              Continue as Guest
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
