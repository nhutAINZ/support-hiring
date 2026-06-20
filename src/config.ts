/**
 * Configuration for the frontend.
 * VITE_API_URL allows pointing to a hosted full-stack backend (e.g., on Render, Railway, Fly.io, Cloud Run)
 * when running the client on static-only hosting like Netlify or Vercel.
 */
const getApiBaseUrl = (): string => {
  // Try custom environment variable first
  const envUrl = (((import.meta as any).env?.VITE_API_URL as string) || "").replace(/\/$/, "");
  if (envUrl) {
    return envUrl;
  }

  // If running on client-only static hosting like Netlify/Vercel (which don't have the run.app backend)
  // we automatically fall back to the live backend server of this AI Studio sandbox!
  if (typeof window !== 'undefined' && window.location) {
    const hn = window.location.hostname;
    // If it's a Netlify or other external static hosting URL
    if (hn && !hn.includes("run.app") && hn !== "localhost" && hn !== "127.0.0.1") {
      return "https://ais-pre-72xtpjkhdhemqtsxd3t4u3-653635120716.asia-east1.run.app";
    }
  }

  // Default to empty string (meaning same-domain routing, i.e. internal Express server)
  return "";
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Universal safe fetch utility for backend API calls.
 * Provides custom, friendly, and actionable Vietnamese guidelines if a connection error (Failed to fetch)
 * occurs when hosted on static platforms like Netlify.
 */
export async function fetchApi(path: string, options?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error: any) {
    // Determine if hosted on Netlify, Vercel or other external non-sandbox domain
    const isExternalHost = typeof window !== 'undefined' && 
      window.location && 
      !window.location.hostname.includes("run.app") && 
      window.location.hostname !== "localhost" && 
      window.location.hostname !== "127.0.0.1";

    if (isExternalHost) {
      throw new Error(
        `Không thể kết nối trực tiếp đến máy chủ thử nghiệm AI Studio từ Netlify do cơ chế bảo mật (IAP/CORS).\n\n` +
        `💡 Hướng dẫn kết nối máy chủ cho Netlify:\n` +
        `1. Netlify chỉ là hosting tĩnh (Frontend), không thể chạy file server.ts (Node/Express).\n` +
        `2. Bạn cần triển khai backend (file server.ts) lên các nền tảng chạy server thực tế như Render.com, Cloud Run, hoặc Railway.\n` +
        `3. Sau khi deploy backend, hãy cấu hình biến môi trường trên Netlify mang tên: VITE_API_URL trỏ thẳng tới link backend thực của bạn.\n` +
        `4. Cách đơn giản hơn để kiểm tra toàn vẹn ứng dụng: Tải file ZIP từ Settings, giải nén và chạy 'npm run dev' tại máy cá nhân.`
      );
    }

    throw new Error(`Không thể kết nối đến máy chủ backend (${url}). Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.`);
  }
}


