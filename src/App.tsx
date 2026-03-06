import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Prizes from "./pages/Prizes";
import Games from "./pages/Games";
import Gamers from "./pages/Gamers";
import Admins from "./pages/Admins";
import Sponsors from "./pages/Sponsors";
import Notifications from "./pages/Notifications";
import GameImages from "./pages/GameImages";
import FinancialManagement from "./pages/FinancialManagement";
import Partners from "./pages/Partners";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary><Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute>} />
            <Route path="/prizes" element={<ProtectedRoute requireAdmin><Prizes /></ProtectedRoute>} />
            <Route path="/games" element={<ProtectedRoute requireAdmin><Games /></ProtectedRoute>} />
            <Route path="/financials" element={<ProtectedRoute requireAdmin><FinancialManagement /></ProtectedRoute>} />
            <Route path="/gamers" element={<ProtectedRoute requireAdmin><Gamers /></ProtectedRoute>} />
            <Route path="/sponsors" element={<ProtectedRoute requireAdmin><Sponsors /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute requireAdmin><Notifications /></ProtectedRoute>} />
            <Route path="/game-images" element={<ProtectedRoute requireAdmin><GameImages /></ProtectedRoute>} />
            <Route path="/partners" element={<ProtectedRoute requireAdmin><Partners /></ProtectedRoute>} />
            <Route path="/admins" element={<ProtectedRoute requireAdmin><Admins /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes></ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
