import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import HistoricalData from './pages/HistoricalData';
import AllTickersData from './pages/AllTickersData';
import RealtimeData from './pages/RealtimeData';
import SpecificDate from './pages/SpecificDate';
import BigQueryData from './pages/BigQueryData';
// import { apiFetch } from './utils/api'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [data, setData] = useState(null);

  // useEffect(()=>{
  //   const res = apiFetch('')

  // })

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        
        <div className="flex">
          <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
          
          <main className="flex-1 pt-16 w-full" >
            <div className="px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/historical" element={<HistoricalData />} />
                <Route path="/all-tickers" element={<AllTickersData />} />
                <Route path="/realtime" element={<RealtimeData />} />
                <Route path="/specific-date" element={<SpecificDate />} />
                <Route path="/bigquery" element={<BigQueryData />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;