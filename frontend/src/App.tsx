import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { RouteContent } from './components/RouteContent';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Subjects = lazy(() => import('./pages/Subjects').then(module => ({ default: module.Subjects })));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail').then(module => ({ default: module.SubjectDetail })));
const Tasks = lazy(() => import('./pages/Tasks').then(module => ({ default: module.Tasks })));
const Insights = lazy(() => import('./pages/Insights').then(module => ({ default: module.Insights })));
const AcademicLoad = lazy(() => import('./pages/AcademicLoad').then(module => ({ default: module.AcademicLoad })));
const Calendar = lazy(() => import('./pages/Calendar').then(module => ({ default: module.Calendar })));
const StudyPlanner = lazy(() => import('./pages/StudyPlanner').then(module => ({ default: module.StudyPlanner })));
const FocusMode = lazy(() => import('./pages/FocusMode').then(module => ({ default: module.FocusMode })));
const Materials = lazy(() => import('./pages/Materials').then(module => ({ default: module.Materials })));
const Notes = lazy(() => import('./pages/Notes').then(module => ({ default: module.Notes })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));

const App: React.FC = () => (
  <AuthProvider>
    <Toaster position="top-right" toastOptions={{
      style: { background: 'var(--color-surface)', color: 'var(--color-ink)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '14px' },
      success: { iconTheme: { primary: 'var(--color-success)', secondary: 'var(--color-surface)' } },
      error: { iconTheme: { primary: 'var(--color-danger)', secondary: 'var(--color-surface)' } },
    }} />
    <Router><Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<PrivateRoute />}><Route element={<DashboardLayout />}><Route element={<RouteContent />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/:id" element={<SubjectDetail />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/academic-load" element={<AcademicLoad />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/study" element={<StudyPlanner />} />
        <Route path="/study/focus" element={<FocusMode />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/settings" element={<Settings />} />
      </Route></Route></Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes></Router>
  </AuthProvider>
);
export default App;
