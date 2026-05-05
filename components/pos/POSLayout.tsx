'use client';

import { ReactNode } from 'react';

interface POSLayoutProps {
  topBar: ReactNode;
  categoriesSidebar?: ReactNode;
  main: ReactNode;
  orderPanel: ReactNode;
  numberpad: ReactNode;
  bottomActions: ReactNode;
}

export function POSLayout({
  topBar,
  categoriesSidebar,
  main,
  orderPanel,
  numberpad,
  bottomActions,
}: POSLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar */}
      {topBar}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Categories Sidebar (optional) */}
        {categoriesSidebar && (
          <div className="flex-shrink-0 overflow-hidden">
            {categoriesSidebar}
          </div>
        )}

        {/* Product Grid */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {main}
        </div>

        {/* Right Panel: Order + Numberpad */}
        <div className="flex flex-col gap-4 w-96">
          {/* Order Summary Panel */}
          <div className="flex-1 overflow-hidden">
            {orderPanel}
          </div>

          {/* Numberpad */}
          <div className="flex-shrink-0">
            {numberpad}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      {bottomActions}
    </div>
  );
}
