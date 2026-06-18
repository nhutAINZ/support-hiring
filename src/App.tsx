import React, { useState, useEffect } from "react";
import { RecruitmentGroup } from "./types";
import AiContentGenerator from "./components/AiContentGenerator";
import CvGenerator from "./components/CvGenerator";
import { API_BASE_URL } from "./config";
import { 
  Sparkles, FileText
} from "lucide-react";

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"ai-content" | "cv-generator">("ai-content");

  // Read deep link routing on mount
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    
    if (hash === "#cv-generator" || tabParam === "cv-generator") {
      setActiveTab("cv-generator");
    }
  }, []);

  // Groups state managed completely locally (offline)
  const [groups, setGroups] = useState<RecruitmentGroup[]>(() => {
    try {
      const saved = localStorage.getItem("localAddedGroups_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Simple handler to add group locally
  const handleAddGroup = async (newGrp: Omit<RecruitmentGroup, "id">) => {
    const localId = 30000 + Date.now();
    const tempGrp: RecruitmentGroup = {
      id: localId,
      ...newGrp
    };
    
    setGroups(prev => {
      const updated = [tempGrp, ...prev];
      try {
        localStorage.setItem("localAddedGroups_v1", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased flex flex-col md:flex-row">
      
      {/* 1. Sidebar Navigation - Geometric Balance Theme */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 shrink-0 flex flex-col justify-between border-r border-slate-800/80 print:hidden">
        <div>
          {/* Brand Header */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white text-xs font-mono shrink-0">AI</div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white">Tuyển Dụng AI</h1>
              <p className="text-[9px] text-indigo-400 font-bold font-mono tracking-widest mt-0.5 uppercase">SYSTEM ACTIVE</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab("ai-content")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-all cursor-pointer ${
                activeTab === "ai-content"
                  ? "bg-slate-800 text-indigo-400 border border-slate-700/50"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${activeTab === "ai-content" ? "bg-indigo-400" : "bg-transparent"}`}></div>
              <Sparkles size={14} className="shrink-0" /> Soạn Tin Tuyển Dụng AI
            </button>

            <button
              onClick={() => setActiveTab("cv-generator")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-all cursor-pointer ${
                activeTab === "cv-generator"
                  ? "bg-slate-800 text-indigo-400 border border-slate-700/50"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${activeTab === "cv-generator" ? "bg-indigo-400" : "bg-transparent"}`}></div>
              <FileText size={14} className="shrink-0" /> Tạo CV Đại Diện AI
            </button>
          </nav>
        </div>

        {/* Action Button for User Guide */}
        <div className="px-4 py-2">
          <a
            href={API_BASE_URL + "/api/download-guide"}
            download="HDSD_He_Thong_Tuyen_Dung_AI.doc"
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors shadow-sm"
          >
            📥 HDSD Word (.doc)
          </a>
        </div>

        {/* Footer info branding */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="text-center text-slate-500 text-[10px] font-mono uppercase tracking-wide">
            💎 AI Recruiter v2.0
          </div>
        </div>
      </aside>

      {/* 2. Main Content Board - Geometric Balance Layout */}
      <main className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        
        {/* App stats bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 print:hidden">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">
                {activeTab === "ai-content" && "Soạn Tin Tuyển Dụng AI"}
                {activeTab === "cv-generator" && "Tạo CV Chuyên Nghiệp AI"}
              </h2>
              <div className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider">
                {activeTab === "ai-content" && "Sáng Tạo"}
                {activeTab === "cv-generator" && "Công Cụ Tạo CV"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={API_BASE_URL + "/api/download-guide"}
              download="HDSD_He_Thong_Tuyen_Dung_AI.doc"
              className="flex items-center gap-1.5 py-1.5 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-bold border border-indigo-100 transition-colors cursor-pointer"
            >
              📥 Tải Hướng Dẫn Sử Dụng (Word)
            </a>
          </div>
        </header>

        {/* Central interactive screen */}
        <section className="flex-1 overflow-y-auto print:overflow-visible p-6 md:p-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none">
          <div>
            {/* Connected views */}
            {activeTab === "ai-content" && (
              <AiContentGenerator savedGroups={groups} onAddGroup={handleAddGroup} />
            )}

            {activeTab === "cv-generator" && (
              <CvGenerator />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
