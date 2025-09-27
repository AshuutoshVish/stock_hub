import React, { useState } from 'react';
import { Clock, Download, Activity } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import FileUpload from '../components/FileUpload';
import { stockApi } from '../utils/stockApi';

const RealtimeData = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async (downloadAll: boolean) => {
    setIsLoading(true);

    try {
      const blob = downloadAll
        ? await stockApi.downloadRealtimeData()
        : await stockApi.downloadRealtimeData(
            selectedFile ? { file: selectedFile } : undefined
          );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = downloadAll ? 'realtime_all_data.xlsx' : 'realtime_selected_data.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error:', error);
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Clock className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Realtime Data</h1>
          <p className="text-gray-600">Access live stock market data</p>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Market Status: OPEN</p>
            <p className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
          <div className="ml-auto">
            <Activity className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Selected Tickers - Realtime">
          <div className="space-y-4">
            <FileUpload
              label="Upload Ticker File (Optional)"
              accept=".xlsx,.xls,.csv"
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
            />
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Real-time data may have a 15-minute delay depending on your data provider.
              </p>
            </div>
            
            <Button
              onClick={() => handleDownload(false)}
              disabled={isLoading || !selectedFile}
              variant="primary"
              className="w-full flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{isLoading ? 'Fetching Data...' : 'Download Selected Realtime Data'}</span>
            </Button>
          </div>
        </Card>

        <Card title="All Tickers - Realtime">
          <div className="space-y-4">
            <p className="text-gray-600">
              Download real-time data for all available tickers. This includes current prices, 
              volume, bid/ask spreads, and market activity.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900">Real-time data includes:</h4>
              <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>Current bid and ask prices</li>
                <li>Last trade price and volume</li>
                <li>Daily high, low, and change</li>
                <li>Real-time market sentiment indicators</li>
              </ul>
            </div>
            
            <Button
              onClick={() => handleDownload(true)}
              disabled={isLoading}
              variant="primary"
              className="w-full flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{isLoading ? 'Fetching Data...' : 'Download All Realtime Data'}</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RealtimeData;