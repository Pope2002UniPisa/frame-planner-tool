import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NewMeasurement from "./pages/NewMeasurement";
import MeasurementView from "./pages/MeasurementView";
import MeasurementPrint from "./pages/MeasurementPrint";
import EditMeasurement from "./pages/EditMeasurement";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import PriceCatalogAdmin from "./pages/PriceCatalogAdmin";
import NotFound from "./pages/NotFound";
import ClientSummary from "./pages/ClientSummary";
import DeliverySummary from "./pages/DeliverySummary";
import PaymentSummaryPage from "./pages/PaymentSummaryPage";
import { ChatBot } from "./components/ChatBot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <ChatBot />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/clienti" element={<ClientSummary />} />
              <Route path="/dashboard/consegne" element={<DeliverySummary />} />
              <Route path="/dashboard/pagamenti" element={<PaymentSummaryPage />} />
              <Route path="/nuova-misurazione" element={<NewMeasurement />} />
              <Route path="/misurazione/:id" element={<MeasurementView />} />
              <Route path="/misurazione/:id/stampa" element={<MeasurementPrint />} />
              <Route path="/misurazione/:id/modifica" element={<EditMeasurement />} />
              <Route path="/profilo" element={<Profile />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/prezziario" element={<PriceCatalogAdmin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
