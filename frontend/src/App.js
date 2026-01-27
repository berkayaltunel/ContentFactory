import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import SidebarLayout from "@/components/SidebarLayout";
import XAIModule from "@/pages/XAIModule";
import YouTubeModule from "@/pages/YouTubeModule";
import InstaFlowModule from "@/pages/InstaFlowModule";
import TikTrendModule from "@/pages/TikTrendModule";
import LinkShareModule from "@/pages/LinkShareModule";
import BlogArchitectModule from "@/pages/BlogArchitectModule";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="contentfactory-theme">
      <div className="App min-h-screen bg-background">
        <BrowserRouter>
          <Routes>
            <Route element={<SidebarLayout />}>
              <Route path="/" element={<Navigate to="/x-ai" replace />} />
              <Route path="/x-ai" element={<XAIModule />} />
              <Route path="/youtube" element={<YouTubeModule />} />
              <Route path="/instaflow" element={<InstaFlowModule />} />
              <Route path="/tiktrend" element={<TikTrendModule />} />
              <Route path="/linkshare" element={<LinkShareModule />} />
              <Route path="/blog" element={<BlogArchitectModule />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </div>
    </ThemeProvider>
  );
}

export default App;
