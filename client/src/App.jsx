import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { lazy, Suspense, useState } from 'react';
import './App.css';

// ─── Lazy-loaded page chunks (each becomes its own JS file) ────────────────
// Public pages (used before auth — keep loading fast)
const LandingPage   = lazy(() => import('./pages/LandingPage'));
const Login         = lazy(() => import('./pages/Login'));
const Register      = lazy(() => import('./pages/Register'));

// Protected pages (only needed after login)
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const Records       = lazy(() => import('./pages/Records'));
const Prescriptions = lazy(() => import('./pages/Prescriptions'));
const Allergies     = lazy(() => import('./pages/Allergies'));
const Chat          = lazy(() => import('./pages/Chat'));
const DoctorAccess  = lazy(() => import('./pages/DoctorAccess'));
const Patients      = lazy(() => import('./pages/Patients'));
const DrugInfo      = lazy(() => import('./pages/DrugInfo'));
const Profile       = lazy(() => import('./pages/Profile'));
const Appointments  = lazy(() => import('./pages/Appointments'));

// ─── Shared page-transition fallback ──────────────────────────────────────
function PageLoader() {
  return (
    <div className="loading-page">
      <div className="spinner" />
      <p className="text-muted">Loading...</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /><p className="text-muted">Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="app-content">
          <div className="page-container">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/records" element={<Records />} />
                <Route path="/prescriptions" element={<Prescriptions />} />
                <Route path="/allergies" element={<Allergies />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/access" element={<DoctorAccess />} />
                <Route path="/patients" element={<Patients />} />
                <Route path="/drugs" element={<DrugInfo />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-page"><div className="spinner" /><p className="text-muted">Loading MeriNurse...</p></div>;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}

export default App;
