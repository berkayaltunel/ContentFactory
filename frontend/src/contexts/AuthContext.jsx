import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      // Dev mode - no auth
      setLoading(false);
      return;
    }

    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url || null,
          });
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url || null,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Fixed redirect URLs - no dynamic origin
  const REDIRECT_URL = process.env.NODE_ENV === 'production'
    ? 'https://typehype.io/dashboard'
    : 'http://localhost:3457/dashboard';

  const signUp = async (email, password, name) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: REDIRECT_URL,
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_URL,
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!supabase) {
      setUser(null);
      setSession(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
  };

  const getAccessToken = () => {
    return session?.access_token || null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        session,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        getAccessToken,
        isAuthenticated: !!user,
        isConfigured: isSupabaseConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
