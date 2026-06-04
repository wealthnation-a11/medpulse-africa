import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DoctorDashboardPage from "./pages/DoctorDashboardPage";
import VolunteerDashboardPage from "./pages/VolunteerDashboardPage";
import PatientDashboardPage from "./pages/PatientDashboardPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSettings from "./pages/AdminSettings";
import SubmitObservation from "./pages/SubmitObservation";
import SubmitScreening from "./pages/SubmitScreening";
import DoctorValidations from "./pages/DoctorValidations";
import MySubmissionsPage from "./pages/MySubmissions";
import PatientProfile from "./pages/PatientProfile";
import ProfileSettings from "./pages/ProfileSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/doctor"
              element={
                <ProtectedRoute requiredRole="doctor">
                  <DoctorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/volunteer"
              element={
                <ProtectedRoute requiredRole="volunteer">
                  <VolunteerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/patient"
              element={
                <ProtectedRoute requiredRole="patient">
                  <PatientDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submit"
              element={
                <ProtectedRoute requiredRole={["volunteer", "doctor"]}>
                  <SubmitObservation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submit-screening"
              element={
                <ProtectedRoute requiredRole={["volunteer", "doctor"]}>
                  <SubmitScreening />
                </ProtectedRoute>
              }
            />
            <Route
              path="/validations"
              element={
                <ProtectedRoute requiredRole="doctor">
                  <DoctorValidations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-submissions"
              element={
                <ProtectedRoute requiredRole={["volunteer", "doctor"]}>
                  <MySubmissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/:id"
              element={
                <ProtectedRoute requiredRole={["doctor", "admin"]}>
                  <PatientProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfileSettings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
