import axios from "axios";
import { BASE_URL } from "./api";

export interface TickerUploadOptions {
  file?: File;
}

export interface SpecificDateOptions extends TickerUploadOptions {
  date: string;
}

export interface BigQueryOptions extends TickerUploadOptions {
  tickers: string[];
  startDate: string;
  endDate: string;
  interval?: string;
}

export interface HistoricalDataOptions extends TickerUploadOptions {
  periodType: "date_range" | "weekly" | "number_of_days";
  startDate?: string;
  endDate?: string;
  weeks?: number;
  days?: number;
  exportFormat: "single" | "multiple";
}

// axios instance
const apiClient = axios.create({
  baseURL: BASE_URL.replace(/\/$/, ""),
  withCredentials: true,
});

export const stockApi = {
  async downloadAllData(options?: TickerUploadOptions) {
    const formData = new FormData();
    if (options?.file) {
      formData.append("file", options.file);
    }
    const response = await apiClient.post("/download_all_data", formData, {
      responseType: "blob",
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data as Blob;
  },

  async downloadRealtimeData(options?: TickerUploadOptions) {
    const formData = new FormData();
    if (options?.file) {
      formData.append("file", options.file);
    }
    const response = await apiClient.post("/download_realtime_data", formData, {
      responseType: "blob",
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data as Blob;
  },

  async downloadSpecificDate(options: SpecificDateOptions) {
    const formData = new FormData();
    formData.append("specific_date", options.date);
    if (options.file) {
      formData.append("file", options.file);
    }
    const response = await apiClient.post("/download_specific_date", formData, {
      responseType: "blob",
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data as Blob;
  },

  async downloadHistoricalData(options: HistoricalDataOptions) {
    const formData = new FormData();
    formData.append("period_type", options.periodType);
    formData.append("export_format", options.exportFormat);

    if (options.file) {
      formData.append("file", options.file);
    }

    if (options.periodType === "date_range") {
      if (!options.startDate || !options.endDate) {
        throw new Error(
          "Start date and end date are required for date_range period type"
        );
      }
      formData.append("start_date", options.startDate);
      formData.append("end_date", options.endDate);
    } else if (options.periodType === "weekly" && options.weeks) {
      formData.append("weeks", options.weeks.toString());
    } else if (options.periodType === "number_of_days" && options.days) {
      formData.append("days", options.days.toString());
    }

    const response = await apiClient.post("/download", formData, {
      responseType: "blob",
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data as Blob;
  },

  async downloadBigQueryData(options: BigQueryOptions) {
    // Backend expects JSON with a list for bigquery_ticker
    const payload = {
      bigquery_ticker: options.tickers,
      bigquery_start_date: options.startDate,
      bigquery_end_date: options.endDate,
      bigquery_interval: options.interval ?? "1d",
    };
    const response = await apiClient.post("/download_bigquery_data", payload, {
      responseType: "blob",
      headers: { "Content-Type": "application/json" },
    });
    return response.data as Blob;
  },

  async downloadIndexComponents() {
    const response = await apiClient.get("/download-index-components");
    return response.data;
  },
};
