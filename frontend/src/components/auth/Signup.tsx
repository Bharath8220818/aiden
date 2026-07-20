import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

const signupSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  username: z.string().min(1, 'Username is required').optional(), // Added for UI only
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  terms: z.boolean().refine((val) => val === true, 'You must accept the Terms & Conditions'),
});

type SignupFormData = z.infer<typeof signupSchema>;

const EyeIcon = ({ visible, onClick }: { visible: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
    tabIndex={-1}
  >
    {visible ? (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    ) : (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )}
  </button>
);

interface StrengthResult {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

function getPasswordStrength(password: string): StrengthResult {
  if (!password) return { score: 0, label: '', color: '', bgColor: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;

  const levels: StrengthResult[] = [
    { score: 0, label: '', color: '', bgColor: '' },
    { score: 1, label: 'Very Weak', color: 'text-red-600', bgColor: 'bg-red-500' },
    { score: 2, label: 'Weak', color: 'text-orange-600', bgColor: 'bg-orange-500' },
    { score: 3, label: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-500' },
    { score: 4, label: 'Strong', color: 'text-green-600', bgColor: 'bg-green-500' },
    { score: 5, label: 'Very Strong', color: 'text-green-700', bgColor: 'bg-green-600' },
  ];

  return levels[Math.min(score, 5)];
}

const Signup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const navigate = useNavigate();
  const { signup } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const strength = useMemo(() => getPasswordStrength(passwordValue), [passwordValue]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signup({
        username: data.username || data.email.split('@')[0],
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      });
      addNotification({ type: 'success', message: 'Account created! Welcome to AIDEN.' });
      navigate('/');
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error?.message || 'Signup failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const FieldError = ({ message }: { message?: string }) =>
    message ? (
      <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
        <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {message}
      </p>
    ) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] p-4 sm:p-8 font-sans">
      <div className="flex w-full max-w-[1000px] overflow-hidden rounded-[24px] bg-white shadow-xl animate-slide-up flex-col md:flex-row">
        
        {/* Left Side: Branding / Marketing */}
        <div className="relative hidden w-full flex-col justify-between bg-[#1F54DA] p-12 text-white md:flex md:w-2/5 xl:w-[45%]">
          {/* subtle background pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          <div className="relative z-10">
            <div className="mb-10 flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-white shadow-sm">
              <span className="text-xl font-black text-[#1F54DA]">A</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">
              Join the next<br/>generation of Data<br/>Engineering.
            </h1>
            <p className="mt-6 text-[15px] leading-relaxed text-blue-100">
              Automate complex pipelines, manage governance at scale, and unlock the power of autonomous AI with AIDEN.
            </p>
          </div>

          <div className="relative z-10 mt-12 space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold">Autonomous Builder</h4>
                <p className="text-xs text-blue-200">AI-driven pipeline generation</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold">Enterprise Governance</h4>
                <p className="text-xs text-blue-200">Compliance and monitoring built-in</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full bg-white p-8 md:w-3/5 xl:w-[55%] md:p-12 lg:p-16">
          <h2 className="text-3xl font-extrabold text-[#1A2B49]">Create Account</h2>
          <p className="mt-2 text-[15px] text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#1149C9] hover:underline">
              Sign In
            </Link>
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="mb-2 block text-sm font-semibold text-[#1A2B49]">Full Name</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="full_name"
                    type="text"
                    {...register('full_name')}
                    className={`block w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.full_name ? 'border-red-500' : ''}`}
                    placeholder="John Doe"
                    disabled={isLoading}
                  />
                </div>
                <FieldError message={errors.full_name?.message} />
              </div>

              {/* Username (UI only) */}
              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-semibold text-[#1A2B49]">Username</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                    <span className="text-lg font-medium">@</span>
                  </div>
                  <input
                    id="username"
                    type="text"
                    {...register('username')}
                    className={`block w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.username ? 'border-red-500' : ''}`}
                    placeholder="johndoe_ai"
                    disabled={isLoading}
                  />
                </div>
                <FieldError message={errors.username?.message} />
              </div>
            </div>

            {/* Work Email */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#1A2B49]">Work Email</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={`block w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="john@company.com"
                  disabled={isLoading}
                />
              </div>
              <FieldError message={errors.email?.message} />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#1A2B49]">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    onChange: (e) => setPasswordValue(e.target.value),
                  })}
                  className={`block w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-11 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 tracking-widest placeholder:tracking-normal ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
              </div>
              <FieldError message={errors.password?.message} />
              
              {/* Password Strength Text */}
              {passwordValue && (
                <div className="mt-2 text-xs">
                  <span className="font-semibold text-gray-500">Password strength:</span>{' '}
                  <span className={`font-bold ${strength.color}`}>{strength.label}</span>
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="pt-2">
              <label htmlFor="terms" className="flex cursor-pointer items-start gap-3">
                <div className="mt-0.5 relative flex items-center justify-center">
                  <input
                    id="terms"
                    type="checkbox"
                    {...register('terms')}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 bg-white transition checked:border-blue-600 checked:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    disabled={isLoading}
                  />
                  <svg className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[13px] leading-relaxed text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="font-semibold text-[#1149C9] hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="font-semibold text-[#1149C9] hover:underline">
                    Privacy Policy
                  </a>
                  , including AIDEN's AI data handling guidelines.
                </span>
              </label>
              <FieldError message={errors.terms?.message} />
            </div>

            {/* Submit */}
            <button
              id="signup-submit-btn"
              type="submit"
              disabled={isLoading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0941CD] py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Social Logins */}
          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                Or sign up with
              </span>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Signup;
