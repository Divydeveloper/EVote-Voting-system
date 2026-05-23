// src/components/shared/Header.js
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

export default function Header({ onMenuClick, title }) {
  const { user, isAdmin } = useAuth();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
        <div className="header-title">{title || 'E-Vote India'}</div>
      </div>
      <div className="header-right">
        <div className="header-date hide-mobile">{dateStr}</div>
        <div className="header-user">
          <div className="header-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div className="hide-mobile">
            <div className="header-user-name">{user?.name}</div>
            <div className="header-user-role">{isAdmin ? 'Administrator' : 'Voter'}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
