import { useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { StatusBanner } from "../shared/components/StatusBanner";
import { ScaleToFit } from "@/shared/components/ScaleToFit";
import { RequireAuth } from "@/shared/auth/RequireAuth";
import { useAuthStore } from "@/shared/auth/store";
import { MainPage } from "@/pages/MainPage";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { AdminPage } from "@/pages/AdminPage";
import { ViewEditorPage } from "@/pages/ViewEditorPage";
import { DataSourcesPage } from "@/pages/DataSourcesPage";
import { ActionsPage } from "@/pages/ActionsPage";
import { BotPage } from "@/pages/BotPage";
import { LandingPage } from "@/pages/LandingPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SecurityPage } from "@/pages/SecurityPage";
import { DatabasePage } from "@/pages/DatabasePage";
import { DeployPage } from "@/pages/DeployPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { IntelligencePage } from "@/pages/IntelligencePage";

export function EditorApp() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  // Resolve "am I already logged in?" once on app start.
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter basename="/editor">
      <StatusBanner />
      <Routes>
        {/* Public */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Private */}
        <Route path="/"        element={<RequireAuth><ScaleToFit><MainPage /></ScaleToFit></RequireAuth>} />
        <Route path="/admin"   element={<RequireAuth><ScaleToFit><AdminPage /></ScaleToFit></RequireAuth>} />
        <Route path="/views"   element={<RequireAuth><ScaleToFit><ViewEditorPage /></ScaleToFit></RequireAuth>} />
        <Route path="/data"    element={<RequireAuth><ScaleToFit><DataSourcesPage /></ScaleToFit></RequireAuth>} />
        <Route path="/actions" element={<RequireAuth><ScaleToFit><ActionsPage /></ScaleToFit></RequireAuth>} />
        <Route path="/bot"      element={<RequireAuth><ScaleToFit><BotPage /></ScaleToFit></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><ScaleToFit><SettingsPage /></ScaleToFit></RequireAuth>} />
        <Route path="/security" element={<RequireAuth><ScaleToFit><SecurityPage /></ScaleToFit></RequireAuth>} />
        <Route path="/database" element={<RequireAuth><ScaleToFit><DatabasePage /></ScaleToFit></RequireAuth>} />
        <Route path="/deploy"   element={<RequireAuth><ScaleToFit><DeployPage /></ScaleToFit></RequireAuth>} />
        <Route path="/profile"  element={<RequireAuth><ScaleToFit><ProfilePage /></ScaleToFit></RequireAuth>} />
        <Route path="/intel"    element={<RequireAuth><ScaleToFit><IntelligencePage /></ScaleToFit></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
