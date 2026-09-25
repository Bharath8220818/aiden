import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ThemeToggleInline } from '@/components/ui/ThemeToggle';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Button } from '@/components/ui/Button';
import { LineageHero } from '@/features/landing/components/LineageHero';
import { RunTerminal } from '@/features/landing/components/RunTerminal';
import { StageRail } from '@/features/landing/components/StageRail';
import { usePlatformPulse } from '@/features/landing/services/pulse.service';

type Tone = 'info' | 'ok' | 'bad' | 'warn' | 'dim';

/**
 * Landing v2 — the page is a pipeline run.
 * Hero = a live lineage that breaks and heals itself (the signature);
 * the stage rail and run log carry the rest. Operator voice throughout.
 */
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [termLine, setTermLine] = useState<{ text: string; tone: Tone } | null>(null);
  const { pulse, offline } = usePlatformPulse();
  const ctaRef = useScrollReveal<HTMLDivElement>();
  const heroSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
    else if (location.state?.authPopup) navigate('/login', { replace: true, state: location.state });
  }, [isAuthenticated, navigate, location.state]);

  const openAuth = () => navigate('/login', { state: { authPopup: true, from: location.pathname } });
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // LineageHero reports each phase; the terminal mirrors it.
  const handleLog = useCallback((text: string, tone: Tone) => setTermLine({ text, tone }), []);

  return (
    <div className="landing min-h-screen bg-background text-text-primary relative overflow-x-hidden">
      {/* ------------------------------ Nav ------------------------------ */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-40 glass"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="AIDEN logo" className="w-8 h-8" />
            <span className="display text-base tracking-wide uppercase">AIDEN</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-text-secondary">
            <button onClick={() => scrollTo('how')} className="hover:text-text-primary transition-colors">How it heals</button>
            <button onClick={() => scrollTo('stages')} className="hover:text-text-primary transition-colors">Stages</button>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggleInline className="hidden sm:flex" />
            <Button size="sm" variant="ai" onClick={openAuth} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Launch app
            </Button>
          </div>
        </div>
      </motion.header>

      {/* ------------------------------ Hero ----------------------------- */}
      <section ref={heroSectionRef} className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-10">
        <div className="dots" aria-hidden="true" />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative text-center max-w-3xl mx-auto space-y-4"
        >
          <p className="eyebrow">run_1042 · production · every change approved</p>
          <h1 className="display text-[2.6rem] sm:text-6xl lg:text-7xl">
            Build. Run. Break.
            <span className="block text-text-secondary">Heal without the fire drill.</span>
          </h1>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-xl mx-auto">
            AIDEN is an autonomous data-engineering workspace: agents design pipelines from your
            schemas, run them, watch every quality gate — and when something breaks at 3 a.m.,
            you get a diagnosed fix to approve, not a pager storm.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="md" variant="ai" onClick={openAuth} className="w-full sm:w-auto shadow-ai-glow" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Launch app
            </Button>
            <Button size="md" variant="secondary" onClick={() => scrollTo('how')} className="w-full sm:w-auto">
              Watch it heal
            </Button>
          </div>
          <p className="mono text-[10px] text-text-muted pt-1">
            demo workspace · no credit card · full audit trail
          </p>
        </motion.div>

        {/* Signature: live lineage + its run log */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start"
        >
          <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card shadow-elevated">
            <div className="eyebrow mb-3">lineage · daily_orders</div>
            <LineageHero onLog={handleLog} pulse={pulse} />
          </div>
          <RunTerminal line={termLine} pulse={pulse} offline={offline} />
        </motion.div>
      </section>

      {/* --------------------------- How it heals -------------------------- */}
      <section id="how" className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="max-w-2xl mb-8 space-y-2">
          <p className="eyebrow">incident → fix → approve → learn</p>
          <h2 className="display text-3xl sm:text-4xl">The loop runs while you sleep</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Every stage below is a real task in the platform — the same ids you'll see in run logs
            and audit lines. Nothing on this page is a mock-up promise; the demo above is the product.
          </p>
        </div>
        <StageRail />
      </section>

      {/* ------------------------------- CTA ------------------------------- */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div ref={ctaRef} className="reveal cta-panel p-8 sm:p-12 text-center">
          <p className="eyebrow">next run</p>
          <h2 className="display text-3xl sm:text-4xl mt-2">Your pipelines, on call tonight</h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto mt-3 leading-relaxed">
            Sign in with a demo role and watch a full loop — build, run, break, heal, approve — in minutes.
          </p>
          <div className="mt-6 flex justify-center">
            <Button size="md" variant="ai" onClick={openAuth} className="shadow-ai-glow" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Launch app
            </Button>
          </div>
        </div>
      </section>

      {/* ----------------------------- Footer ------------------------------ */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="AIDEN logo" className="w-6 h-6" />
            <span className="mono text-[10px] text-text-muted">AIDEN · autonomous data engineering</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="mono text-[10px] text-text-muted">RBAC enforced · audit trail</span>
            <ThemeToggleInline className="flex sm:hidden" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
