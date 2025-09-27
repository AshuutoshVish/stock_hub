import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Clock, Database, Download, History, Home, X, TrendingUp } from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Historical Data', href: '/historical', icon: History },
  { name: 'All Tickers', href: '/all-tickers', icon: Download },
  { name: 'Realtime Data', href: '/realtime', icon: Clock },
  { name: 'Specific Date', href: '/specific-date', icon: BarChart3 },
  { name: 'BigQuery Data', href: '/bigquery', icon: Database },
];

const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) => {
  const location = useLocation();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:shadow-none lg:border-r lg:border-gray-200 w-64`}>
        <div className="pt-1 xs:pt-2 sm:pt-5 lg:pt-10">
          {/* Combined Header for both logo and mobile close button */}
          <div className="flex items-center justify-between px-4 pb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Stock Data Hub</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <nav className="px-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;