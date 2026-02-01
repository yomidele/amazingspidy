import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ContributionLogin from "./pages/auth/ContributionLogin";
import TravelLogin from "./pages/auth/TravelLogin";
import AdminLogin from "./pages/auth/AdminLogin";
import ContributorDashboard from "./pages/dashboard/ContributorDashboard";
import TravelDashboard from "./pages/dashboard/TravelDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Auth Routes */}
          <Route path="/login/contribution" element={<ContributionLogin />} />
          <Route path="/login/travel" element={<TravelLogin />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          
          {/* User Dashboards */}
          <Route path="/dashboard/contributor" element={<ContributorDashboard />} />
          <Route path="/dashboard/travel" element={<TravelDashboard />} />
          
          {/* Admin Dashboard */}
          <Route path="/admin/*" element={<AdminDashboard />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
