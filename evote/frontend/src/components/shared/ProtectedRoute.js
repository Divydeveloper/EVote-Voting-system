// src/components/shared/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role === 'admin' && user.role !== 'admin' && user.role !== 'superadmin') {
    return <Navigate to="/voter/dashboard" replace />;
  }
  if (role === 'voter' && (user.role === 'admin' || user.role === 'superadmin')) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
