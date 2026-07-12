
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

/**
 * HTTP client utilities for OpenList backend.
 */

export const HttpClient = axios.create({
  timeout: 30000,
});

// Add interceptors if needed
HttpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Wrap common errors
    return Promise.reject(error);
  }
);

export async function get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return HttpClient.get<T>(url, config);
}

export async function post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return HttpClient.post<T>(url, data, config);
}

export async function request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return HttpClient.request<T>(config);
}

// Download file helper
export async function download(url: string, config?: AxiosRequestConfig): Promise<ArrayBuffer> {
  const response = await HttpClient.get(url, {
    ...config,
    responseType: "arraybuffer",
  });
  return response.data;
}
