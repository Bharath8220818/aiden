import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data);
      addNotification({
        type: 'success',
        message: 'Welcome back!',
      });
      navigate('/');
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error.response?.data?.detail || 'Login failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center px-3 py-6 sm:px-6 lg:px-8">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.25)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-gradient-to-br from-primary-600 via-indigo-600 to-slate-900 p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white/90">Welcome back</div>
            <h2 className="mt-6 text-3xl font-semibold text-white">Design pipelines with clarity and pace.</h2>
            <p className="mt-3 max-w-sm text-sm text-slate-200">Coordinate data workflows, monitor health, and ship reliable integrations from one thoughtful workspace.</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/20 bg-white/10 p-4 text-sm text-slate-100">
            AIDEN keeps your onboarding smooth for both desktop and mobile experiences.
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex justify-center lg:justify-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-500 text-2xl font-bold text-white shadow-sm">
              A
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-semibold text-slate-900 lg:text-left">
            Sign in to AIDEN
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 lg:text-left">
            Or{' '}
            <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </Link>
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="username" className="label">
                Username
              </label>
              <input
                id="username"
                type="text"
                {...register('username')}
                className={`input-field ${errors.username ? 'border-red-500' : ''}`}
                placeholder="Enter your username"
                disabled={isLoading}
              />
              {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className={`input-field ${errors.password ? 'border-red-500' : ''}`}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="remember-me" className="flex items-center gap-2 text-sm text-slate-700">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                Remember me
              </label>
              <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                Forgot password?
              </a>
            </div>

            <button type="submit" disabled={isLoading} className="w-full btn-primary py-3">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;