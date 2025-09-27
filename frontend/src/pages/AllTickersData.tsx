import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import FileUpload from '../components/FileUpload';
import { BASE_URL } from '../utils/api';

const AllTickersData = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async (downloadAll: boolean) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      
      if (!downloadAll && selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await fetch(`${BASE_URL}/download_all_data`, {
        method: 'POST',
        body: downloadAll ? undefined : formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = downloadAll ? 'all_tickers_data.xlsx' : 'selected_tickers_data.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Download failed');
      }
    } catch (error) {
      console.error('Error:', error);
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <FileText className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Tickers Data</h1>
          <p className="text-gray-600">Download comprehensive ticker information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Selected Tickers">
          <div className="space-y-4">
            <FileUpload
              label="Upload Ticker File (Optional)"
              accept=".xlsx,.xls,.csv"
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
            />
            
            <Button
              onClick={() => handleDownload(false)}
              disabled={isLoading || !selectedFile}
              variant="primary"
              className="w-full flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{isLoading ? 'Processing...' : 'Download Selected Tickers Data'}</span>
            </Button>
          </div>
        </Card>

        <Card title="All Tickers">
          <div className="space-y-4">
            <p className="text-gray-600">
              Download data for all available tickers in the database. This includes comprehensive 
              information about market cap, P/E ratios, sectors, and more.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900">What's included:</h4>
              <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>Company information and financials</li>
                <li>Sector and industry classifications</li>
                <li>Market capitalization and ratios</li>
                <li>Current pricing and volume data</li>
              </ul>
            </div>
            
            <Button
              onClick={() => handleDownload(true)}
              disabled={isLoading}
              variant="primary"
              className="w-full flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{isLoading ? 'Processing...' : 'Download All Tickers Data'}</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AllTickersData;