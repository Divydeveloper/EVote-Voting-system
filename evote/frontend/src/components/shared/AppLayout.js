// src/components/shared/AppLayout.js
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children, title }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="main-content">
        <Header onMenuClick={() => setMobileOpen(true)} title={title} />
        <main>{children}</main>
      </div>
    </div>
  );
}
