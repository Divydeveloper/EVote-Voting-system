// src/components/shared/Sidebar.js
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Sidebar.css';

const voterNav = [
  { to: '/voter/dashboard',   icon: '🏠', label: 'Dashboard' },
  { to: '/voter/elections',   icon: '🗳️',  label: 'Elections' },
  { to: '/voter/my-votes',    icon: '✅',  label: 'My Votes' },
  { to: '/voter/profile',     icon: '👤',  label: 'My Profile' },
  { to: '/voter/verify-vote', icon: '🔍',  label: 'Verify Vote' },
];

const adminNav = [
  { to: '/admin/dashboard',   icon: '📊', label: 'Dashboard' },
  { to: '/admin/elections',   icon: '🗳️',  label: 'Elections' },
  { to: '/admin/candidates',  icon: '👥',  label: 'Candidates' },
  { to: '/admin/voters',      icon: '📋',  label: 'Voters' },
  { to: '/admin/audit-logs',  icon: '🔐',  label: 'Audit Logs' },
  { to: '/admin/analytics',   icon: '📈',  label: 'Analytics' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const navItems = isAdmin ? adminNav : voterNav;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-emblem">🗳️</div>
          <div>
            <div className="brand-name">E-Vote India</div>
            <div className="brand-tag">Election Commission Portal</div>
          </div>
        </div>

        {/* User Card */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">
              {isAdmin ? '⚙️ Administrator' : `🪪 ${user?.voterId || 'Voter'}`}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">
            {isAdmin ? 'Admin Panel' : 'Voter Portal'}
          </div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="sidebar-footer">
          <button className="sidebar-action" onClick={toggleTheme}>
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button className="sidebar-action logout" onClick={handleLogout}>
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
