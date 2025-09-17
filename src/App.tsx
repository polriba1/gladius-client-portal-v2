import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { lazy, Suspense } from "react";
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SalutdentalDashboard = lazy(() => import("./pages/SalutdentalDashboard"));
const SalutdentalTickets = lazy(() => import("./pages/SalutdentalTickets"));
const SalutdentalCalls = lazy(() => import("./pages/SalutdentalCalls"));
const InformesEstadisticas = lazy(() => import("./pages/InformesEstadisticas"));
const RegistreTrucades = lazy(() => import("./pages/RegistreTrucades"));
const Tickets = lazy(() => import("./pages/Tickets"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { AppLayout } from "@/components/AppLayout";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminRedirect } from "@/components/AdminRedirect";

const queryClient = new QueryClient();

const App = () => (
  <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div />}> 
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/admin-dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/dashboard" element={<AdminRedirect><AppLayout><Dashboard /></AppLayout></AdminRedirect>} />
              <Route path="/salutdental-dashboard" element={<AdminRedirect><AppLayout><SalutdentalDashboard /></AppLayout></AdminRedirect>} />
              <Route path="/salutdental-tickets" element={<AdminRedirect><AppLayout><SalutdentalTickets /></AppLayout></AdminRedirect>} />
              <Route path="/salutdental-calls" element={<AdminRedirect><AppLayout><SalutdentalCalls /></AppLayout></AdminRedirect>} />
              <Route path="/informes-estadisticas" element={<AdminRedirect><AppLayout><InformesEstadisticas /></AppLayout></AdminRedirect>} />
              <Route path="/registre-trucades" element={<AdminRedirect><AppLayout><RegistreTrucades /></AppLayout></AdminRedirect>} />
              <Route path="/tickets" element={<AdminRedirect><AppLayout><Tickets /></AppLayout></AdminRedirect>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </LanguageProvider>
);

export default App;
