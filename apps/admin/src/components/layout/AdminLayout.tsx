import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ImpersonationBar } from './ImpersonationBar';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* 1. Sticky Impersonation Warning Banner */}
      <ImpersonationBar />

      <div className="flex-1 flex overflow-hidden">
        {/* 2. Responsive Sidebar */}
        <Sidebar />

        {/* 3. Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
