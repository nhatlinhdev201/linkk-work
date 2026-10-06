import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ImpersonationBar } from './ImpersonationBar';
import { useUIStore } from '../../stores/uiStore';

export const AdminLayout: React.FC = () => {
  const { isMobileDrawerOpen, setMobileDrawerOpen, toggleMobileDrawer } = useUIStore();

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col antialiased">
      {/* 1. Sticky Impersonation Warning Banner */}
      <ImpersonationBar />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 2. Responsive Sidebar (Desktop Fixed & Mobile Drawer) */}
        <Sidebar
          isMobileOpen={isMobileDrawerOpen}
          onMobileClose={() => setMobileDrawerOpen(false)}
        />

        {/* 3. Right Content Column */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-slate-50">
          {/* Header sits permanently on top, outside the scrollable container */}
          <Header onToggleMobileMenu={toggleMobileDrawer} />

          {/* Dedicated Scroll Container: ONLY page content scrolls, 100% full width */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
