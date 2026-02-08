import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldX } from 'lucide-react';
import api, { API } from '@/lib/api';


export function ProtectedRoute() {
  const { isAuthenticated, loading, signOut } = useAuth();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!isAuthenticated) return;
      setChecking(true);
      try {
        const res = await api.get(`${API}/auth/check`);
        if (res.data?.authorized) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        // 401 veya 403 = yetkisiz
        setAuthorized(false);
      } finally {
        setAuthChecked(true);
        setChecking(false);
      }
    };
    checkAccess();
  }, [isAuthenticated]);

  if (loading || (isAuthenticated && !authChecked)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Giriş yaptı ama whitelist'te değil
  if (authChecked && !authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 p-6">
        <ShieldX className="h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold">Erişim Engellendi</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Bu hesap TypeHype'a erişim iznine sahip değil. 
          Farklı bir hesapla giriş yapmayı deneyin veya yönetici ile iletişime geçin.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-4 px-6 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          Çıkış Yap
        </button>
      </div>
    );
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
