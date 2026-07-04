import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ChatBot } from "./components/ChatBot";

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent" />
    </div>
  );
}

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewMeasurement = lazy(() => import("./pages/NewMeasurement"));
const MeasurementView = lazy(() => import("./pages/MeasurementView"));
const MeasurementPrint = lazy(() => import("./pages/MeasurementPrint"));
const EditMeasurement = lazy(() => import("./pages/EditMeasurement"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PriceCatalogAdmin = lazy(() => import("./pages/PriceCatalogAdmin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ClientSummary = lazy(() => import("./pages/ClientSummary"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const LeadsList = lazy(() => import("./pages/LeadsList"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const OperationsAnalytics = lazy(() => import("./pages/OperationsAnalytics"));
const DeliverySummary = lazy(() => import("./pages/DeliverySummary"));
const PaymentSummaryPage = lazy(() => import("./pages/PaymentSummaryPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // dati considerati freschi per 5 min → nessun refetch inutile
      gcTime: 1000 * 60 * 10,     // cache tenuta 10 min dopo che il componente si smonta
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <ChatBot />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/lead" element={<LeadsList />} />
                <Route path="/dashboard/lead/:id" element={<LeadDetail />} />
                <Route path="/dashboard/tempi" element={<OperationsAnalytics />} />
                <Route path="/dashboard/clienti" element={<ClientSummary />} />
                <Route path="/dashboard/clienti/:id" element={<ClientDetail />} />
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
            </Suspense>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
