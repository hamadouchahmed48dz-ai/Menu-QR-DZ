/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { CustomerMenuView } from './views/CustomerMenuView';
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { QRPrintView } from './views/QRPrintView';
import { NetworkBanner } from './components/common/NetworkBanner';
import { ErrorView } from './views/ErrorView';

function AppRouter() {
  const { currentView, setCurrentView } = useApp();

  useEffect(() => {
    // Parse initial pathname, hash, and search query
    const pathname = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    const viewParam = searchParams.get('view')?.toLowerCase();

    if (
      viewParam === 'admin' ||
      pathname.includes('/admin') ||
      hash.includes('admin') ||
      hash.includes('type=recovery') ||
      hash.includes('access_token')
    ) {
      setCurrentView('admin');
    } else if (
      viewParam === 'qr_print' ||
      pathname.includes('/qr_print') ||
      pathname.includes('/print') ||
      hash.includes('print')
    ) {
      setCurrentView('qr_print');
    } else {
      setCurrentView('menu');
    }
  }, [setCurrentView]);

  if (currentView === 'admin') {
    return <AdminDashboardView />;
  }

  if (currentView === 'qr_print') {
    return <QRPrintView />;
  }

  return <CustomerMenuView />;
}

export default function App() {
  return (
    <AppProvider>
      <NetworkBanner />
      <AppRouter />
    </AppProvider>
  );
}
