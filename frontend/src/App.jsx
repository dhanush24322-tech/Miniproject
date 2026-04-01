import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import OrganizerDashboard from './pages/OrganizerDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import DatasetManager from './pages/DatasetManager';
import ModelTraining from './pages/ModelTraining';
import PredictionResult from './pages/PredictionResult';
import PredictionHistory from './pages/PredictionHistory';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Organizer Routes */}
        <Route element={<ProtectedRoute role="organizer" />}>
          <Route path="/organizer" element={<OrganizerDashboard />} />
          <Route path="/organizer/datasets" element={<DatasetManager />} />
          <Route path="/organizer/training" element={<ModelTraining />} />
        </Route>

        {/* Doctor Routes */}
        <Route element={<ProtectedRoute role="doctor" />}>
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/doctor/history" element={<PredictionHistory />} />
          <Route path="/doctor/result/:id" element={<PredictionResult />} />
        </Route>

        {/* Home Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
