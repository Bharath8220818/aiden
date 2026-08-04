import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

/**
 * Handles the OAuth callback from Supabase (GitHub, Google, etc.).
 * Exchanges the Supabase session for a backend JWT and redirects.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { exchangeSupabaseToken } = useAuthStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session?.access_token) {
          // Exchange Supabase token for backend JWT
          await exchangeSupabaseToken(session.access_token);
          addNotification({ type: 'success', message: 'Welcome! Signed in successfully.' });
          navigate('/');
        } else {
          addNotification({ type: 'error', message: 'Authentication failed. No session found.' });
          navigate('/login');
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        addNotification({
          type: 'error',
          message: error?.message || 'Authentication failed. Please try again.',
        });
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate, exchangeSupabaseToken, addNotification]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EBF3FB]">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
