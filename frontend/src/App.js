import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import XAIModule from "@/pages/XAIModule";
import YouTubeModule from "@/pages/YouTubeModule";
import InstaFlowModule from "@/pages/InstaFlowModule";
import TikTrendModule from "@/pages/TikTrendModule";
import LinkShareModule from "@/pages/LinkShareModule";
import BlogArchitectModule from "@/pages/BlogArchitectModule";
import HistoryPage from "@/pages/HistoryPage";
import FavoritesPage from "@/pages/FavoritesPage";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="contentfactory-theme">
      <AuthProvider>
        <div className="App min-h-screen bg-background">
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Auth routes - redirect to dashboard if logged in */}
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
              </Route>

              {/* Protected dashboard routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<Navigate to="/dashboard/x-ai" replace />} />
                  <Route path="x-ai" element={<XAIModule />} />
                  <Route path="youtube" element={<YouTubeModule />} />
                  <Route path="instaflow" element={<InstaFlowModule />} />
                  <Route path="tiktrend" element={<TikTrendModule />} />
                  <Route path="linkshare" element={<LinkShareModule />} />
                  <Route path="blog" element={<BlogArchitectModule />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="favorites" element={<FavoritesPage />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
