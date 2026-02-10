import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { ProfileProvider } from "@/contexts/ProfileContext";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import XAIModule from "@/pages/XAIModule";
import XAIModuleV2 from "@/pages/XAIModuleV2";
import XAIModuleV3 from "@/pages/XAIModuleV3";
import XAIModuleV4 from "@/pages/XAIModuleV4";
import YouTubeModule from "@/pages/YouTubeModule";
import InstaFlowModule from "@/pages/InstaFlowModule";
import TikTrendModule from "@/pages/TikTrendModule";
import LinkShareModule from "@/pages/LinkShareModule";
import BlogArchitectModule from "@/pages/BlogArchitectModule";
import HistoryPage from "@/pages/HistoryPage";
import FavoritesPage from "@/pages/FavoritesPage";
import StyleLabPage from "@/pages/StyleLabPage";
import CoachPage from "@/pages/CoachPage";
import TrendDashboardPage from "@/pages/TrendDashboardPage";
import AccountAnalysisPage from "@/pages/AccountAnalysisPage";
import DashboardHome from "@/pages/DashboardHome";

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
              </Route>
              {/* Signup devre dışı - sadece Google Auth ile giriş */}
              <Route path="/signup" element={<Navigate to="/login" replace />} />

              {/* Protected dashboard routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<ProfileProvider><DashboardLayout /></ProfileProvider>}>
                  <Route index element={<DashboardHome />} />
                  <Route path="x-ai" element={<XAIModule />} />
                  <Route path="x-ai-v1" element={<XAIModuleV4 />} />
                  <Route path="x-ai-v2" element={<XAIModuleV2 />} />
                  <Route path="x-ai-v3" element={<XAIModuleV3 />} />
                  <Route path="youtube" element={<YouTubeModule />} />
                  <Route path="instaflow" element={<InstaFlowModule />} />
                  <Route path="tiktrend" element={<TikTrendModule />} />
                  <Route path="linkshare" element={<LinkShareModule />} />
                  <Route path="blog" element={<BlogArchitectModule />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="favorites" element={<FavoritesPage />} />
                  <Route path="style-lab" element={<StyleLabPage />} />
                  <Route path="coach" element={<CoachPage />} />
                  <Route path="trends" element={<TrendDashboardPage />} />
                  <Route path="account-analysis" element={<AccountAnalysisPage />} />
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
