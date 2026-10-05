import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Users } from './pages/admin/Users';
import { Projects } from './pages/admin/Projects';
import { WorkTypes } from './pages/admin/WorkTypes';
import { Approvals } from './pages/admin/Approvals';
import { Reports } from './pages/admin/Reports';
import { LogTeam } from './pages/manager/LogTeam';
import { Validate } from './pages/manager/Validate';
import { LogPersonal } from './pages/worker/LogPersonal';
import { Dashboard } from './pages/Dashboard';

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

