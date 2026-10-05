import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

// Route-level code splitting: heavy libraries (jsPDF, xlsx) used only by
// the admin report pages are no longer part of the initial bundle.
const Users = lazy(() => import('./pages/admin/Users').then(m => ({ default: m.Users })));
const Projects = lazy(() => import('./pages/admin/Projects').then(m => ({ default: m.Projects })));
const WorkTypes = lazy(() => import('./pages/admin/WorkTypes').then(m => ({ default: m.WorkTypes })));
const Approvals = lazy(() => import('./pages/admin/Approvals').then(m => ({ default: m.Approvals })));
const Reports = lazy(() => import('./pages/admin/Reports').then(m => ({ default: m.Reports })));
const LogTeam = lazy(() => import('./pages/manager/LogTeam').then(m => ({ default: m.LogTeam })));
const Validate = lazy(() => import('./pages/manager/Validate').then(m => ({ default: m.Validate })));
const LogPersonal = lazy(() => import('./pages/worker/LogPersonal').then(m => ({ default: m.LogPersonal })));

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            
            {/* Admin & Shared Routes */}
            <Route path="admin/users" element={<Users />} />
            <Route path="admin/work-types" element={<WorkTypes />} />
            <Route path="admin/projects" element={<Projects />} />
            <Route path="obras" element={<Projects />} />
            <Route path="admin/approvals" element={<Approvals />} />
            <Route path="admin/reports" element={<Reports />} />
            
            {/* Manager Routes */}
            <Route path="chefe/projects" element={<Projects />} />
            <Route path="chefe/log-team" element={<LogTeam />} />
            <Route path="chefe/validate" element={<Validate />} />
            
            {/* Worker Routes */}
            <Route path="worker/log" element={<LogPersonal />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

