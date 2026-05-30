import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import IndexRoute from "./components/auth/IndexRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";
import ContributionLogin from "./pages/auth/ContributionLogin";
import TravelLogin from "./pages/auth/TravelLogin";
import AdminLogin from "./pages/auth/AdminLogin";
import InvestorLogin from "./pages/auth/InvestorLogin";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import ContributorDashboard from "./pages/dashboard/ContributorDashboard";
import TravelDashboard from "./pages/dashboard/TravelDashboard";
import InvestorDashboard from "./pages/dashboard/InvestorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminManualPage from "./pages/admin/AdminManualPage";
import GroupAdminDashboard from "./pages/group-admin/GroupAdminDashboard";
import TeemahTravelsPage from "./pages/travel/TeemahTravelsPage";
import InvestorInfoPage from "./pages/InvestorInfoPage";
import NotificationsPage from "./pages/dashboard/NotificationsPage";
import NotificationDetailPage from "./pages/dashboard/NotificationDetailPage";
import { LogoutConfirmProvider } from "./components/shared/LogoutConfirmProvider";
import { ActiveRoleProvider } from "./contexts/ActiveRoleContext";
import { AuthProvider } from "./contexts/AuthContext";


const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
        <LogoutConfirmProvider>
        <ActiveRoleProvider>
        <Routes>
          <Route path="/" element={<IndexRoute />} />
          
          {/* Teemah Travels Page */}
          <Route path="/teemah-travels" element={<TeemahTravelsPage />} />
          
          {/* Investor Info Page */}
          <Route path="/become-investor" element={<InvestorInfoPage />} />
          
          {/* Auth Routes */}
          <Route path="/login/contribution" element={<ContributionLogin />} />
          <Route path="/login/travel" element={<TravelLogin />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/investor" element={<InvestorLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* User Dashboards (protected) */}
          <Route path="/dashboard/contributor" element={<ProtectedRoute redirectTo="/login/contribution"><ContributorDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/travel" element={<ProtectedRoute redirectTo="/login/travel"><TravelDashboard /></ProtectedRoute>} />
          <Route path="/investor-dashboard" element={<ProtectedRoute redirectTo="/login/investor"><InvestorDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/notifications" element={<ProtectedRoute redirectTo="/login/contribution"><NotificationsPage /></ProtectedRoute>} />
          <Route path="/dashboard/notifications/:id" element={<ProtectedRoute redirectTo="/login/contribution"><NotificationDetailPage /></ProtectedRoute>} />
          
          {/* Admin Dashboard (protected) */}
          <Route path="/admin/*" element={<ProtectedRoute redirectTo="/login/admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/manual" element={<ProtectedRoute redirectTo="/login/admin"><AdminManualPage /></ProtectedRoute>} />

          {/* Group Admin Dashboard (protected) */}
          <Route path="/group-admin/*" element={<ProtectedRoute redirectTo="/login/admin"><GroupAdminDashboard /></ProtectedRoute>} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ActiveRoleProvider>
        </LogoutConfirmProvider>
        </AuthProvider>

      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
