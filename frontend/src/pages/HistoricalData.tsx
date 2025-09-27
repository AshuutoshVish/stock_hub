import React, { useState } from 'react';
import { History, Download } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import FileUpload from '../components/FileUpload';
import RadioGroup from '../components/RadioGroup';
import DatePicker from '../components/DatePicker';
import Checkbox from '../components/Checkbox';
import Input from '../components/Input';
import { BASE_URL } from '../utils/api';

const HistoricalData = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFile, setUploadFile] = useState(false);
  const [exportFormat, setExportFormat] = useState('single');
  const [periodType, setPeriodType] = useState('date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weeks, setWeeks] = useState('');
  const [days, setDays] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Compute start/end dates for weekly/days locally; backend expects explicit dates
      let computedStart = startDate;
      let computedEnd = endDate;

      if (periodType === 'weekly') {
        const end = new Date();
        const start = new Date();
        const weeksNum = parseInt(weeks, 10);
        if (!isNaN(weeksNum) && weeksNum > 0) {
          start.setDate(end.getDate() - weeksNum * 7);
        }
        computedStart = start.toISOString().slice(0, 10);
        computedEnd = end.toISOString().slice(0, 10);
      } else if (periodType === 'days') {
        const end = new Date();
        const start = new Date();
        const daysNum = parseInt(days, 10);
        if (!isNaN(daysNum) && daysNum > 0) {
          start.setDate(end.getDate() - daysNum);
        }
        computedStart = start.toISOString().slice(0, 10);
        computedEnd = end.toISOString().slice(0, 10);
      }

      const formData = new FormData();
      if (uploadFile && selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('start_date', computedStart);
      formData.append('end_date', computedEnd);
      formData.append('multisheet', String(exportFormat === 'multiple'));

      const response = await fetch(`${BASE_URL}/download_historic_data`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'historical_data.xlsx';
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
        <History className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historical Data</h1>
          <p className="text-gray-600">Download historical stock data for analysis</p>
        </div>
      </div>

      <Card title="Download Historical Stock Data">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Checkbox
                id="upload-file"
                label="Upload Ticker File (Excel)"
                checked={uploadFile}
                onChange={setUploadFile}
              />

              {uploadFile && (
                <FileUpload
                  label="Select File"
                  accept=".xlsx,.xls"
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                />
              )}

              <RadioGroup
                label="Export Format"
                name="export-format"
                value={exportFormat}
                onChange={setExportFormat}
                options={[
                  { value: 'single', label: 'Single Sheet' },
                  { value: 'multiple', label: 'Multiple Sheets' }
                ]}
              />
            </div>

            <div className="space-y-4">
              <RadioGroup
                label="Select Period Type"
                name="period-type"
                value={periodType}
                onChange={setPeriodType}
                options={[
                  { value: 'date', label: 'Date Range' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'days', label: 'Number of Days' }
                ]}
              />

              {periodType === 'date' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  />
                </div>
              )}

              {periodType === 'weekly' && (
                <Input
                  label="Number of Weeks"
                  placeholder="Enter number of weeks"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                  required
                />
              )}

              {periodType === 'days' && (
                <Input
                  label="Number of Days"
                  placeholder="Enter number of days"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  required
                />
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading || (periodType === 'date' && (!startDate || !endDate)) || (periodType === 'weekly' && !weeks) || (periodType === 'days' && !days)}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{isLoading ? 'Processing...' : 'Download Historical Data'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default HistoricalData;