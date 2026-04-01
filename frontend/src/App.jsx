/**
 * App.jsx — Main application with routing and layout.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import OrganizerDashboard from './pages/OrganizerDashboard';
import DatasetManager from './pages/DatasetManager';
import ModelTraining from './pages/ModelTraining';
import DoctorDashboard from './pages/DoctorDashboard';
import PredictionResult from './pages/PredictionResult';
import PredictionHistory from './pages/PredictionHistory';

function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'organizer' ? '/organizer' : '/doctor'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Organizer routes */}
      <Route
        path="/organizer"
        element={
          <ProtectedRoute requiredRole="organizer">
            <DashboardLayout><OrganizerDashboard /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer/datasets"
        element={
          <ProtectedRoute requiredRole="organizer">
            <DashboardLayout><DatasetManager /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer/training"
        element={
          <ProtectedRoute requiredRole="organizer">
            <DashboardLayout><ModelTraining /></DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Doctor routes */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute requiredRole="doctor">
            <DashboardLayout><DoctorDashboard /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/predict"
        element={
          <ProtectedRoute requiredRole="doctor">
            <DashboardLayout><DoctorDashboard /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/result/:id"
        element={
          <ProtectedRoute requiredRole="doctor">
            <DashboardLayout><PredictionResult /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/history"
        element={
          <ProtectedRoute requiredRole="doctor">
            <DashboardLayout><PredictionHistory /></DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Home redirect */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
