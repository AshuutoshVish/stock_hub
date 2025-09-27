import React, { useState } from 'react';
import { Database, Download, Search } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import DatePicker from '../components/DatePicker';
import Select from '../components/Select';
import { BASE_URL } from '../utils/api';
import axios from 'axios';

const BigQueryData = () => {
  const [tickers, setTickers] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [interval, setInterval] = useState('1d');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const intervalOptions = [
    { value: '1d', label: 'Daily' },
    { value: '1wk', label: 'Weekly' },
    { value: '1mo', label: 'Monthly' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Convert comma-separated input to array of uppercase tickers
      const tickerArray = tickers
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);

      const response = await axios.post(
        `${BASE_URL}/download_bigquery_data`,
        {
          bigquery_ticker: tickerArray,
          bigquery_start_date: startDate,
          bigquery_end_date: endDate,
          bigquery_interval: interval,
        },
        { responseType: 'blob' }
      );

      // Trigger file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bigquery_data_${interval}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download failed:', error);

      if (error.response?.data) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = JSON.parse(reader.result as string);
            setErrorMsg(json.error || 'Failed to download BigQuery data.');
          } catch {
            setErrorMsg('Failed to download BigQuery data.');
          }
        };
        reader.readAsText(error.response.data);
      } else {
        setErrorMsg('Network error. Please try again.');
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Database className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">BigQuery Data</h1>
          <p className="text-gray-600">Query large datasets with custom parameters</p>
        </div>
      </div>

      {/* Form Card */}
      <Card title="BigQuery Data Export">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              <Input
                label="Select Ticker(s)"
                placeholder="e.g., AAPL,MSFT,GOOGL"
                value={tickers}
                onChange={(e) => setTickers(e.target.value)}
                required
              />

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <strong>Tip:</strong> Separate multiple tickers with commas. They will be sent as
                  an array.
                </p>
              </div>

              <Select
                label="Data Interval"
                value={interval}
                onChange={setInterval}
                options={intervalOptions}
                required
              />
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />

              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                min={startDate}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Search className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Query Optimization</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Larger date ranges may take longer to process. Consider using weekly or
                      monthly intervals for extended periods.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900">BigQuery Features</h4>
            <ul className="mt-2 text-sm text-yellow-800 list-disc list-inside space-y-1">
              <li>Access to historical data going back 10+ years</li>
              <li>High-performance queries on large datasets</li>
              <li>Custom aggregation and interval options</li>
              <li>Advanced filtering and sorting capabilities</li>
            </ul>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading || !tickers || !startDate || !endDate}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{isLoading ? 'Querying BigQuery...' : 'Download BigQuery Data'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default BigQueryData;
