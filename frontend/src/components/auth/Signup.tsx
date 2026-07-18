import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignupFormData = z.infer<typeof signupSchema>;

const Signup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signup(data);
      addNotification({ type: 'success', message: 'Account created! Welcome.' });
      navigate('/');
    } catch (error: any) {
      addNotification({ type: 'error', message: error.response?.data?.detail || 'Signup failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center px-3 py-6 sm:px-6 lg:px-8">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.25)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-primary-700 p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white/90">New account</div>
            <h2 className="mt-6 text-3xl font-semibold text-white">Bring your team into a faster workflow.</h2>
            <p className="mt-3 max-w-sm text-sm text-slate-200">Create a tailored workspace for orchestrating pipelines, alerts, and deployments using the same polished experience across devices.</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/20 bg-white/10 p-4 text-sm text-slate-100">
            Mobile and desktop views stay aligned so your team gets the same experience everywhere.
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex justify-center lg:justify-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-500 text-2xl font-bold text-white shadow-sm">
              A
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-semibold text-slate-900 lg:text-left">Create your account</h2>
          <p className="mt-2 text-center text-sm text-slate-600 lg:text-left">
            Already have one? <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">Sign in</Link>
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="label">Full Name</label>
              <input {...register('full_name')} className="input-field" disabled={isLoading} />
              {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" {...register('email')} className="input-field" disabled={isLoading} />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Username</label>
              <input {...register('username')} className="input-field" disabled={isLoading} />
              {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" {...register('password')} className="input-field" disabled={isLoading} />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="w-full btn-primary py-3">
              {isLoading ? 'Creating...' : 'Sign up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
