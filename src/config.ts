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

