import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Subjects } from './pages/Subjects';
import { SubjectDetail } from './pages/SubjectDetail';
import { Tasks } from './pages/Tasks';
import { Insights } from './pages/Insights';
import { Calendar } from './pages/Calendar';
import { StudyPlanner } from './pages/StudyPlanner';
import { FocusMode } from './pages/FocusMode';
import { Materials } from './pages/Materials';
import { ComingSoon } from './pages/ComingSoon';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#1c1b19',
            border: '1px solid #e4e1d8',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#2f6b4f', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#b3261e', secondary: '#ffffff' } },
        }}
      />
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected routes with sidebar layout */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/subjects/:id" element={<SubjectDetail />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/insights" element={<Insights />} />
              {/* Calendário implementado; demais placeholders aguardam a própria etapa do roadmap. */}
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/study" element={<StudyPlanner />} />
              <Route path="/study/focus" element={<FocusMode />} />
              {/* Notes/Settings ainda aguardam a própria etapa do roadmap. */}
              <Route path="/materials" element={<Materials />} />
              <Route path="/notes" element={<ComingSoon />} />
              <Route path="/settings" element={<ComingSoon />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
