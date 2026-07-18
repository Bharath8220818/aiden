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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have one? <Link to="/login" className="text-primary-600 hover:text-primary-500">Sign in</Link>
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="label">Full Name</label>
            <input {...register('full_name')} className="input-field" disabled={isLoading} />
            {errors.full_name && <p className="text-sm text-red-600">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" {...register('email')} className="input-field" disabled={isLoading} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Username</label>
            <input {...register('username')} className="input-field" disabled={isLoading} />
            {errors.username && <p className="text-sm text-red-600">{errors.username.message}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" {...register('password')} className="input-field" disabled={isLoading} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isLoading} className="w-full btn-primary py-3">
            {isLoading ? 'Creating...' : 'Sign up'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;
