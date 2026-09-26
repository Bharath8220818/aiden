import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { ThemeToggleInline } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle, Bot, Network, HeartPulse, X, UserPlus, LogIn, ShieldCheck } from 'lucide-react';

/**
 * Auth popup: a glassmorphic modal floating over the (blurred) landing page.
 * "Sign in" and "Create account" share one glass panel; clicking the scrim
 * returns to the public landing.
 */
export const LoginPage: React.FC = () => {
  const { login, register, isAuthenticated, isAuthenticating, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emailRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [password2, setPassword2] = useState('');
  const [signupNote, setSignupNote] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSignupNote(null);
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        if (!name.trim()) throw new Error('Please tell us your name.');
        if (password !== password2) throw new Error('Passwords do not match.');
        await register(name.trim(), email, password);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (mode === 'signup') setSignupNote(err instanceof Error ? err.message : 'Could not create the account.');
      /* signin errors surface from the store */
    }
  };

  const backToLanding = () => navigate('/', { replace: true });

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      {/* ---------- Landing page rendered underneath, blurred ---------- */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <LandingBackdrop />
      </div>
      <button
        onClick={backToLanding}
        className="scrim-in absolute inset-0 bg-scrim/30 backdrop-blur-[6px] cursor-default"
        aria-label="Back to landing page"
        tabIndex={-1}
      />

      {/* ------------------------- Glass popup ------------------------- */}
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="auth-pop w-full max-w-md glass-strong rounded-2xl p-6 sm:p-8 space-y-5 max-h-[92vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'signin' ? 'Sign in to AIDEN' : 'Create your AIDEN account'}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="AIDEN logo" className="w-9 h-9" />
              <div>
                <h1 className="text-lg font-extrabold tracking-wider uppercase flex items-center gap-2">
                  AIDEN
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse-dot" />
                </h1>
                <p className="text-[10px] text-text-muted">
                  {mode === 'signin' ? 'Welcome back — sign in to continue' : 'Create your workspace account'}
                </p>
              </div>
            </div>
            <button
              onClick={backToLanding}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-card-hover transition-colors"
              aria-label="Close and return to landing"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex p-1 rounded-lg bg-card-active/60 border border-border">
            {([['signin', 'Sign in', LogIn], ['signup', 'Create account', UserPlus]] as const).map(([m, label, Icon]) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  clearError();
                  setSignupNote(null);
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-200',
                  mode === m ? 'bg-card text-text-primary shadow-card-glow' : 'text-text-muted hover:text-text-primary'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <label className="block">
                <span className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">Full name</span>
                <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/30 transition-all">
                  <Sparkles className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                    className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">Work email</span>
              <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/30 transition-all">
                <Mail className="w-3.5 h-3.5 text-text-muted shrink-0 icon-float" />
                <input
                  ref={emailRef}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">Password</span>
              <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/30 transition-all">
                <Lock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>
            </label>

            {mode === 'signup' && (
              <label className="block">
                <span className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">Confirm password</span>
                <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/30 transition-all">
                  <ShieldCheck className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <input
                    type="password"
                    required
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                  />
                </div>
              </label>
            )}

            {error && (
              <div role="alert" className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            {signupNote && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {signupNote}
              </div>
            )}

            <Button
              type="submit"
              variant="ai"
              size="md"
              className="w-full shadow-ai-glow"
              isLoading={isAuthenticating}
              rightIcon={!isAuthenticating ? <ArrowRight className="w-4 h-4" /> : undefined}
            >
              {mode === 'signin' ? 'Sign in to AIDEN' : 'Create account'}
            </Button>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
            <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
              <Bot className="w-3.5 h-3.5" />
              SOC 2 · SSO/SAML ready
            </div>
            <ThemeToggleInline />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/** Lightweight landing teaser rendered behind the auth popup (blurred by the scrim). */
const LandingBackdrop: React.FC = () => {
  const features = [
    { icon: Network, text: 'Every agent tool call governed by RBAC + audit trail' },
    { icon: HeartPulse, text: 'Failures detected, diagnosed, and repaired automatically' },
    { icon: Sparkles, text: 'Requirements → architecture → deployed pipelines in minutes' },
  ];
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="aurora" aria-hidden="true" />
      <div className="max-w-4xl mx-auto px-6 pt-24 space-y-8">
        <div className="h-10 w-72 rounded-lg bg-card border border-border" />
        <div className="h-4 w-full max-w-md rounded bg-card border border-border" />
        <div className="h-4 w-80 rounded bg-card border border-border" />
        <div className="grid grid-cols-3 gap-4 pt-6">
          {features.map((f, i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border space-y-2">
              <f.icon className="w-4 h-4 text-indigo-500" />
              <p className="text-[10px] text-text-secondary leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Honest signal for keyboard/screen-reader users that they're in the popup */}
      <span className="sr-only">Sign-in popup open over the AIDEN landing page. Press the close button to go back.</span>
    </div>
  );
};

export default LoginPage;
