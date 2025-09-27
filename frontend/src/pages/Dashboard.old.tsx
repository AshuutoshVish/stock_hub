import React, { useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Upload } from 'lucide-react';
import Card from '../components/Card';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { stockApi } from '../utils/stockApi';

interface TickerData {
  ticker: string;
  company: string;
  sector: string;
  industry: string;
  country: string;
  marketCap: string;
  pe: string;
  price: string;
  change: string;
  volume: string;
}

// Mock data for initial display
const mockTickersData: TickerData[] = [
  { ticker: 'AAPL', company: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics', country: 'US', marketCap: '2.8T', pe: '28.5', price: '189.69', change: '+2.34', volume: '45.2M' },
  { ticker: 'MSFT', company: 'Microsoft Corp.', sector: 'Technology', industry: 'Software', country: 'US', marketCap: '2.7T', pe: '32.1', price: '374.51', change: '+1.87', volume: '23.1M' },
  { ticker: 'GOOGL', company: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet', country: 'US', marketCap: '1.6T', pe: '25.8', price: '134.12', change: '-0.95', volume: '28.7M' },
  { ticker: 'AMZN', company: 'Amazon.com Inc.', sector: 'Consumer Cyclical', industry: 'E-commerce', country: 'US', marketCap: '1.4T', pe: '45.2', price: '142.87', change: '+3.21', volume: '31.5M' },
  { ticker: 'TSLA', company: 'Tesla Inc.', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', country: 'US', marketCap: '805B', pe: '65.3', price: '254.22', change: '+5.67', volume: '89.3M' },
];

const sectorData = [
  { name: 'Technology', value: 40, color: '#3B82F6' },
  { name: 'Healthcare', value: 20, color: '#10B981' },
  { name: 'Financial', value: 15, color: '#F59E0B' },
  { name: 'Consumer', value: 15, color: '#EF4444' },
  { name: 'Energy', value: 10, color: '#8B5CF6' },
];

const priceData = [
  { date: '2024-01-01', price: 180 },
  { date: '2024-01-02', price: 185 },
  { date: '2024-01-03', price: 178 },
  { date: '2024-01-04', price: 192 },
  { date: '2024-01-05', price: 189 },
];

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleDownload = async (type: 'all' | 'realtime' | 'specific-date' | 'bigquery') => {
    setIsLoading(true);
    setError(null);
    try {
      switch (type) {
        case 'all':
          await stockApi.downloadAllData({ file: selectedFile || undefined });
          break;
        case 'realtime':
          await stockApi.downloadRealtimeData({ file: selectedFile || undefined });
          break;
        // Add other cases as needed
      }
      setIsLoading(false);
    } catch (err) {
      setError(`Failed to download ${type} data`);
      setIsLoading(false);
      console.error(`Error downloading ${type} data:`, err);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Market Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome to your comprehensive stock data platform</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
              id="ticker-file"
            />
            <label
              htmlFor="ticker-file"
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Tickers
            </label>
          </div>
          <button
            onClick={() => handleDownload('all')}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Download All Data
          </button>
          <button
            onClick={() => handleDownload('realtime')}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Download Realtime
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <p className="text-blue-100 text-sm">Total Tickers</p>
              <p className="text-2xl font-bold">560</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <p className="text-green-100 text-sm">Market Cap</p>
              <p className="text-2xl font-bold">$42.8T</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <p className="text-purple-100 text-sm">Active Sectors</p>
              <p className="text-2xl font-bold">11</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingDown className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <p className="text-orange-100 text-sm">Avg P/E Ratio</p>
              <p className="text-2xl font-bold">23.4</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Sector Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={(entry) => `${entry.name} ${entry.value}%`}
              >
                {sectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Price Trend (Sample)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tickers Table */}
      <Card title="Top Tickers">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Cap</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/E</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockTickersData.map((ticker: TickerData) => (
                <tr key={ticker.ticker} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticker.ticker}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticker.company}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticker.sector}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticker.industry}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticker.marketCap}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticker.pe}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${ticker.price}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${ticker.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {ticker.change}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticker.volume}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* News Section */}
      <Card title="Trending Stock Market News">
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="text-lg font-medium text-gray-900">Fed Considers Interest Rate Changes</h4>
            <p className="text-gray-600 text-sm">Market analysts predict potential impacts on tech stocks following recent economic indicators...</p>
            <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="text-lg font-medium text-gray-900">Q4 Earnings Season Begins</h4>
            <p className="text-gray-600 text-sm">Major companies preparing to report quarterly results, with Apple and Microsoft leading the way...</p>
            <p className="text-xs text-gray-500 mt-1">4 hours ago</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="text-lg font-medium text-gray-900">Sector Rotation Continues</h4>
            <p className="text-gray-600 text-sm">Energy and financial sectors showing strength while growth stocks face headwinds...</p>
            <p className="text-xs text-gray-500 mt-1">6 hours ago</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;