// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Voter Pages
import VoterDashboard from './pages/voter/VoterDashboard';
import Elections from './pages/voter/Elections';
import ElectionDetail from './pages/voter/ElectionDetail';
import VoterProfile from './pages/voter/VoterProfile';
import MyVotes from './pages/voter/MyVotes';
import VerifyVote from './pages/voter/VerifyVote';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminElections from './pages/admin/AdminElections';
import AdminCandidates from './pages/admin/AdminCandidates';
import AdminVoters from './pages/admin/AdminVoters';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AuditLogs from './pages/admin/AuditLogs';

import './styles/global.css';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'voter' ? '/voter/dashboard' : '/admin/dashboard'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '10px',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                fontSize: '0.875rem',
              },
              success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Public */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Voter Routes */}
            <Route path="/voter/dashboard"   element={<ProtectedRoute role="voter"><VoterDashboard /></ProtectedRoute>} />
            <Route path="/voter/elections"   element={<ProtectedRoute role="voter"><Elections /></ProtectedRoute>} />
            <Route path="/voter/elections/:id" element={<ProtectedRoute role="voter"><ElectionDetail /></ProtectedRoute>} />
            <Route path="/voter/profile"     element={<ProtectedRoute role="voter"><VoterProfile /></ProtectedRoute>} />
            <Route path="/voter/my-votes"    element={<ProtectedRoute role="voter"><MyVotes /></ProtectedRoute>} />
            <Route path="/voter/verify-vote" element={<ProtectedRoute role="voter"><VerifyVote /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard"   element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/elections"   element={<ProtectedRoute role="admin"><AdminElections /></ProtectedRoute>} />
            <Route path="/admin/candidates"  element={<ProtectedRoute role="admin"><AdminCandidates /></ProtectedRoute>} />
            <Route path="/admin/voters"      element={<ProtectedRoute role="admin"><AdminVoters /></ProtectedRoute>} />
            <Route path="/admin/analytics"   element={<ProtectedRoute role="admin"><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/audit-logs"  element={<ProtectedRoute role="admin"><AuditLogs /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={
              <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'var(--font)' }}>
                <div style={{ fontSize: 64 }}>🗳️</div>
                <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>404 — Page Not Found</h1>
                <a href="/" style={{ color: 'var(--primary)' }}>← Go to Home</a>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
