import React, { useState } from "react";
import { BarChart3, Download, Calendar } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import DatePicker from "../components/DatePicker";
import Checkbox from "../components/Checkbox";
import FileUpload from "../components/FileUpload";
import { stockApi } from "../utils/stockApi";

const SpecificDate = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [uploadTickers, setUploadTickers] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    if (uploadTickers && !selectedFile) return;

    setIsLoading(true);

    try {
      const blob = await stockApi.downloadSpecificDate({
        date: selectedDate,
        file: uploadTickers ? selectedFile ?? undefined : undefined,
      });
      // console.log()
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `stock_data_${selectedDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Specific Date Data
          </h1>
          <p className="text-gray-600">
            Download stock data for a specific trading date
          </p>
        </div>
      </div>

      <Card title="Download Data for Specific Date">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                max={new Date().toISOString().split("T")[0]}
              />

              <Checkbox
                id="upload-tickers"
                label="Upload Ticker File (Excel/CSV)"
                checked={uploadTickers}
                onChange={setUploadTickers}
              />

              {uploadTickers && (
                <FileUpload
                  label="Select File"
                  accept=".xlsx,.xls,.csv"
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                />
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Calendar className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900">
                    Date Selection Guidelines
                  </h3>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p>• Select any past trading date</p>
                    <p>• Weekend dates will return Friday's data</p>
                    <p>• Holiday dates will return the last trading day</p>
                    <p>• Data includes OHLCV and fundamental metrics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selectedDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900">
                Selected Date: {new Date(selectedDate).toLocaleDateString()}
              </h4>
              <p className="text-sm text-blue-800 mt-1">
                You're downloading data for{" "}
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                isLoading ||
                !selectedDate ||
                (uploadTickers && !selectedFile)
              }
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{isLoading ? "Processing..." : "Download Date Data"}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SpecificDate;
