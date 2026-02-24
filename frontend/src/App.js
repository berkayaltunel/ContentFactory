import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { AccountProvider } from "@/contexts/AccountContext";
import { CreatorProfileProvider } from "@/contexts/CreatorProfileContext";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import XAIModule from "@/pages/XAIModule";
import HistoryPage from "@/pages/HistoryPage";
import FavoritesPage from "@/pages/FavoritesPage";
import StyleLabPage from "@/pages/StyleLabPage";
import CoachPage from "@/pages/CoachPage";
import TrendDashboardPage from "@/pages/TrendDashboardPage";
import AccountAnalysisPage from "@/pages/AccountAnalysisPage";
import DashboardHome from "@/pages/DashboardHome";
import YouTubeStudioPage from "@/pages/YouTubeStudioPage";
import ABTestPage from "@/pages/ABTestPage";
import PersonaLabPage from "@/pages/PersonaLabPage";
import CreatorHubPage from "@/pages/CreatorHubPage";
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
                <Route path="/dashboard" element={<AccountProvider><CreatorProfileProvider><ProfileProvider><DashboardLayout /></ProfileProvider></CreatorProfileProvider></AccountProvider>}>
                  <Route index element={<DashboardHome />} />
                  <Route path="create" element={<XAIModule />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="favorites" element={<FavoritesPage />} />
                  <Route path="style-lab" element={<StyleLabPage />} />
                  <Route path="coach" element={<CoachPage />} />
                  <Route path="trends" element={<TrendDashboardPage />} />
                  <Route path="account-analysis" element={<AccountAnalysisPage />} />
                  <Route path="youtube-studio" element={<YouTubeStudioPage />} />
                  <Route path="ab-test" element={<ABTestPage />} />
                  <Route path="persona-lab" element={<PersonaLabPage />} />
                  <Route path="creator-hub" element={<CreatorHubPage />} />
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
