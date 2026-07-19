import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

const signupSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
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
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    ) : (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
    <div className="auth-page flex min-h-screen items-center justify-center px-4 py-8">
      {/* Grid overlay */}
      <div className="auth-grid-bg" />

      {/* Floating orbs */}
      <div className="pointer-events-none absolute right-1/4 top-1/4 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/3 left-1/4 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="auth-card overflow-hidden rounded-2xl">
          {/* Card header accent */}
          <div className="auth-card-accent" />

          <div className="px-8 pb-8 pt-7 sm:px-10 sm:pb-10 sm:pt-8">
            {/* Logo */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/30">
                <span className="text-2xl font-bold text-white">A</span>
              </div>
              <h1 className="mt-4 text-2xl font-bold text-gray-900">Create your account</h1>
              <p className="mt-1 text-sm text-gray-500">Start building pipelines with AI</p>
            </div>

            {/* Form */}
            <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="label">Full Name</label>
                <div className="input-with-icon">
                  <svg className="input-icon h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    id="full_name"
                    type="text"
                    {...register('full_name')}
                    className={`input-field pl-10 ${errors.full_name ? 'input-field-error' : ''}`}
                    placeholder="John Doe"
                    disabled={isLoading}
                  />
                </div>
                <FieldError message={errors.full_name?.message} />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="label">Email Address</label>
                <div className="input-with-icon">
                  <svg className="input-icon h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={`input-field pl-10 ${errors.email ? 'input-field-error' : ''}`}
                    placeholder="john@company.com"
                    disabled={isLoading}
                  />
                </div>
                <FieldError message={errors.email?.message} />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="label">Password</label>
                <div className="relative input-with-icon">
                  <svg className="input-icon h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      onChange: (e) => setPasswordValue(e.target.value),
                    })}
                    className={`input-field pl-10 pr-10 ${errors.password ? 'input-field-error' : ''}`}
                    placeholder="Min. 6 characters"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
                </div>
                <FieldError message={errors.password?.message} />

                {/* Password Strength */}
                {passwordValue && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            strength.score >= level ? strength.bgColor : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`mt-1 text-xs font-medium ${strength.color}`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Terms */}
              <div>
                <label htmlFor="terms" className="flex cursor-pointer items-start gap-2.5">
                  <input
                    id="terms"
                    type="checkbox"
                    {...register('terms')}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the{' '}
                    <a href="#" className="font-medium text-blue-600 hover:text-blue-700">
                      Terms & Conditions
                    </a>{' '}
                    and{' '}
                    <a href="#" className="font-medium text-blue-600 hover:text-blue-700">
                      Privacy Policy
                    </a>
                  </span>
                </label>
                <FieldError message={errors.terms?.message} />
              </div>

              {/* Submit */}
              <button
                id="signup-submit-btn"
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-base"
              >
                {isLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          AIDEN AI Platform — Secure & Enterprise Ready
        </p>
      </div>
    </div>
  );
};

export default Signup;
