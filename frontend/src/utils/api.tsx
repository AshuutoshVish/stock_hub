import axios, { AxiosRequestConfig } from "axios";

export const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

// Create an axios instance
const apiClient = axios.create({
  baseURL: BASE_URL.replace(/\/$/, ""), // Remove trailing slash
  withCredentials: true, // Needed for cookies/session
});

export async function apiFetch<T = any>(
  endpoint: string,
  options?: AxiosRequestConfig
): Promise<T> {
  try {
    const res = await apiClient.request<T>({
      url: endpoint.replace(/^\//, ""), // Remove leading slash
      ...options,
    });
    return res.data;
  } catch (error: any) {
    if (error.response) {
      // Server responded with error
      const { status, statusText, data } = error.response;
      throw new Error(
        `API request failed: ${status} ${statusText} - ${JSON.stringify(data)}`
      );
    } else if (error.request) {
      // No response received
      throw new Error("No response received from server");
    } else {
      // Other error (e.g., setup)
      throw new Error(`Request error: ${error.message}`);
    }
  }
}
