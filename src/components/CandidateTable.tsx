import React, { useState } from "react";
import { 
  Plus, Search, Filter, RefreshCw, UserCheck, AlertCircle, 
  HelpCircle, MoreHorizontal, Check, ClipboardList, Trash, ArrowRight,
  TrendingUp, Sparkles, Brain, Eye, EyeOff, BarChart3, Clock, MapPin
} from "lucide-react";
import { Candidate, CandidateStatus } from "../types";
import { API_BASE_URL, fetchApi } from "../config";

interface CandidateTableProps {
  candidates: Candidate[];
  onAddCandidate: (candidate: Omit<Candidate, "id" | "timestamp">) => Promise<void>;
  onUpdateCandidate: (id: number, updates: Partial<Omit<Candidate, "id" | "timestamp">>) => Promise<void>;
  loading: boolean;
  onRefresh: () => void;
  ctvName: string;
}

export default function CandidateTable({ 
  candidates, 
  onAddCandidate, 
  onUpdateCandidate, 
  loading, 
  onRefresh,
  ctvName
}: CandidateTableProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Add form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  
  // Dashboard view toggle
  const [showCharts, setShowCharts] = useState(true);

  // Gemini Executive Reports Analysis State
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiReport, setAiReport] = useState<{
    summary: string;
    bottlenecks: string;
    proposals: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem("gemini_candidate_analysis_v1");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // New candidate form fields
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newCvResult, setNewCvResult] = useState("");
  const [newInterviewResult, setNewInterviewResult] = useState("");

  // Filter candidates
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ctvName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesSource = sourceFilter === "all" || c.source.toLowerCase().includes(sourceFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesSource;
  });

  // Calculate statistics
  const totalCount = candidates.length;
  const newCount = candidates.filter(c => c.status === CandidateStatus.NEW).length;
  const contactedCount = candidates.filter(c => c.status === CandidateStatus.CONTACTED).length;
  const interviewingCount = candidates.filter(c => c.status === CandidateStatus.INTERVIEWING).length;
  const offeredCount = candidates.filter(c => c.status === CandidateStatus.OFFERED).length;
  const hiredCount = candidates.filter(c => c.status === CandidateStatus.HIRED).length;
  const successCount = hiredCount + offeredCount; 
  const rejectedCount = candidates.filter(c => c.status === CandidateStatus.REJECTED).length;

  // Extract unique sources for filters
  const uniqueSources = Array.from(new Set(candidates.map(c => c.source).filter(Boolean)));

  // Trigger Gemini Analysis Call
  const handleRequestAiAnalysis = async () => {
    setLoadingAi(true);
    try {
      const response = await fetchApi("/api/gemini/analyze-candidates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ candidates })
      });
      const data = await response.json();
      if (data && !data.error) {
        setAiReport(data);
        localStorage.setItem("gemini_candidate_analysis_v1", JSON.stringify(data));
      } else {
        alert(data.error || "Gặp lỗi khi tạo báo cáo từ AI.");
      }
    } catch (err: any) {
      alert("Không kết nối được dịch vụ AI: " + err.message);
    } finally {
      setLoadingAi(false);
    }
  };

  // Funnel calculations
  const funnelStages = [
    { label: "Mới nhận hồ sơ", count: newCount, color: "bg-blue-600", border: "border-blue-100" },
    { label: "Đã liên hệ", count: contactedCount, color: "bg-slate-500", border: "border-slate-100" },
    { label: "Đang phỏng vấn", count: interviewingCount, color: "bg-amber-500", border: "border-amber-100" },
    { label: "Mời việc/Đi làm", count: successCount, color: "bg-emerald-600", border: "border-emerald-100" },
    { label: "Từ chối", count: rejectedCount, color: "bg-rose-500", border: "border-rose-100" }
  ];

  // Source Distribution Calculation
  const sourceMap: Record<string, number> = {};
  candidates.forEach(c => {
    const s = c.source ? c.source.trim() : "Mạng Xã Hội";
    sourceMap[s] = (sourceMap[s] || 0) + 1;
  });
  const topSources = Object.entries(sourceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxSourceVal = topSources.length > 0 ? topSources[0][1] : 1;

  // Role Metrics Calculation
  const roleMetrics: Record<string, { displayName: string; total: number; success: number }> = {};
  candidates.forEach(c => {
    const rawRole = c.role ? c.role.trim() : "Chưa Phân Loại";
    const key = rawRole.toLowerCase();
    if (!roleMetrics[key]) {
      roleMetrics[key] = { displayName: rawRole, total: 0, success: 0 };
    }
    roleMetrics[key].total += 1;
    if (c.status === CandidateStatus.HIRED || c.status === CandidateStatus.OFFERED) {
      roleMetrics[key].success += 1;
    }
  });
  const topRoles = Object.values(roleMetrics)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(item => [item.displayName, item] as [string, { total: number; success: number }]);
  const maxRoleVal = topRoles.length > 0 ? topRoles[0][1].total : 1;

  // Handle adding candidate
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newContact.trim() || !newRole.trim()) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    setAdding(true);
    try {
      await onAddCandidate({
        name: newName,
        contact: newContact,
        role: newRole,
        source: newSource || "Facebook Group",
        ctvName: ctvName || "Sinh viên CTV",
        status: CandidateStatus.NEW,
        notes: newNotes,
        cvResult: newCvResult,
        interviewResult: newInterviewResult,
      });

      // Reset
      setNewName("");
      setNewContact("");
      setNewRole("");
      setNewSource("");
      setNewNotes("");
      setNewCvResult("");
      setNewInterviewResult("");
      setShowAddModal(false);
    } catch (err: any) {
      alert(`Lỗi khi thêm ứng viên: ${err.message}`);
    } finally {
      setAdding(false);
    }
  };

  // Safe status update with confirmation
  const handleStatusChange = async (candidate: Candidate, newStatus: CandidateStatus) => {
    if (candidate.status === newStatus) return;

    const isConfirmed = window.confirm(
      `XÁC NHẬN CẬP NHẬT TRẠNG THÁI?\n\nHệ thống sẽ cập nhật trạng thái ứng viên:\n` +
      `- Ứng viên: ${candidate.name}\n` +
      `- Vị trí: ${candidate.role}\n` +
      `- Trạng thái cũ: ${candidate.status}\n` +
      `- Trạng thái mới: ${newStatus}\n\n` +
      `Thao tác này sẽ cập nhật dữ liệu vĩnh viễn.`
    );

    if (!isConfirmed) return;

    try {
      await onUpdateCandidate(candidate.id, { status: newStatus });
    } catch (err: any) {
      alert(`Cập nhật thất bại: ${err.message}`);
    }
  };

  // Safe notes update
  const handleNotesEditSubmit = async (candidate: Candidate) => {
    const newNotesContent = window.prompt(`Chỉnh sửa Ghi chú chi tiết cho ứng viên: ${candidate.name}`, candidate.notes);
    if (newNotesContent === null) return; // User cancelled

    const isConfirmed = window.confirm(
      `CẬP NHẬT GHI CHÚ CHO: ${candidate.name}?\n\n` +
      `Nội dung ghi chú mới:\n"${newNotesContent}"`
    );

    if (!isConfirmed) return;

    try {
      await onUpdateCandidate(candidate.id, { notes: newNotesContent });
    } catch (err: any) {
      alert(`Cập nhật ghi chú thất bại: ${err.message}`);
    }
  };

  // Safe CV update
  const handleCvResultEditSubmit = async (candidate: Candidate) => {
    const newCvRes = window.prompt(`Chỉnh sửa Kết quả CV cho ứng viên: ${candidate.name}`, candidate.cvResult);
    if (newCvRes === null) return;

    const isConfirmed = window.confirm(
      `CẬP NHẬT KẾT QUẢ CV CHO: ${candidate.name}?\n\n` +
      `Nội dung mới: "${newCvRes}"`
    );

    if (!isConfirmed) return;

    try {
      await onUpdateCandidate(candidate.id, { cvResult: newCvRes });
    } catch (err: any) {
      alert(`Cập nhật thất bại: ${err.message}`);
    }
  };

  // Safe Interview update
  const handleInterviewResultEditSubmit = async (candidate: Candidate) => {
    const newInterviewRes = window.prompt(`Chỉnh sửa Kết quả phỏng vấn cho ứng viên: ${candidate.name}`, candidate.interviewResult);
    if (newInterviewRes === null) return;

    const isConfirmed = window.confirm(
      `CẬP NHẬT KẾT QUẢ PHỎNG VẤN CHO: ${candidate.name}?\n\n` +
      `Nội dung mới: "${newInterviewRes}"`
    );

    if (!isConfirmed) return;

    try {
      await onUpdateCandidate(candidate.id, { interviewResult: newInterviewRes });
    } catch (err: any) {
      alert(`Cập nhật thất bại: ${err.message}`);
    }
  };

  // Safe Role (Vị trí) update
  const handleRoleEditSubmit = async (candidate: Candidate) => {
    const newRoleVal = window.prompt(`Chỉnh sửa Vị trí ứng tuyển cho ứng viên: ${candidate.name}`, candidate.role);
    if (newRoleVal === null) return;

    const isConfirmed = window.confirm(
      `CẬP NHẬT TRƯỜNG VỊ TRÍ UV CHO: ${candidate.name}?\n\n` +
      `Vị trí mới: "${newRoleVal}"`
    );

    if (!isConfirmed) return;

    try {
      await onUpdateCandidate(candidate.id, { role: newRoleVal });
    } catch (err: any) {
      alert(`Cập nhật thất bại: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Upper action bar to toggle dashboards & analytics */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 p-4 rounded-xl shadow-3xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <BarChart3 size={16} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Bảng Điều Khiển KPI & Báo Cáo Chuyển Đổi</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Biểu đồ hóa phễu rò rỉ ứng viên, xác định kênh nguồn và tối ưu hóa điểm số tuyển dụng.</p>
          </div>
        </div>

        <button
          onClick={() => setShowCharts(!showCharts)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer transition-colors"
        >
          {showCharts ? (
            <>
              <EyeOff size={13} />
              Ẩn Biểu Đồ
            </>
          ) : (
            <>
              <Eye size={13} />
              Xem Biểu Đồ & KPI
            </>
          )}
        </button>
      </div>

      {showCharts && (
        <div className="space-y-6 animate-fade-in animate-duration-300">
          
          {/* Top Funnel Geometric layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Stage 1: Horizontal geometric funnel conversion blocks */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs space-y-4">
              <h4 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5 font-sans">
                <TrendingUp size={13} className="text-indigo-500" />
                PHỄU CHUYỂN ĐỔI CHỮA TUYỂN
              </h4>
              <div className="space-y-2.5">
                {funnelStages.map((stage, i) => {
                  const percentage = totalCount > 0 ? (stage.count / totalCount) * 100 : 0;
                  return (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between items-center text-[11px] mb-1 font-semibold text-slate-700">
                        <span>{stage.label}</span>
                        <span className="font-mono">{stage.count} ({Math.round(percentage)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${stage.color} rounded-full transition-all`} 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage 2: Source high performer channels */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs space-y-4 font-sans">
              <h4 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <ClipboardList size={13} className="text-indigo-500" />
                KÊNH NGUỒN HIỆU QUẢ NHẤT
              </h4>
              {topSources.length > 0 ? (
                <div className="space-y-2.5">
                  {topSources.map(([source, count], i) => {
                    const widthPercent = (count / maxSourceVal) * 100;
                    return (
                      <div key={i} className="text-xs">
                        <div className="flex justify-between items-center text-[11px] mb-1 font-medium text-slate-700">
                          <span className="truncate max-w-[170px] font-semibold">{source}</span>
                          <span className="font-mono text-slate-500">{count} hồ sơ</span>
                        </div>
                        <div className="h-2 bg-slate-50/50 border border-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-900 rounded-full transition-all" 
                            style={{ width: `${widthPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 font-medium text-[11px]">Chưa tích lũy dữ liệu nguồn tuyển.</div>
              )}
            </div>

            {/* Stage 3: Top Recruitment Roles Conversion rates */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs space-y-4">
              <h4 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <UserCheck size={13} className="text-indigo-500" />
                HIỆU SUẤT VỊ TRÍ TUYỂN DỤNG
              </h4>
              {topRoles.length > 0 ? (
                <div className="space-y-2.5">
                  {topRoles.map(([role, metrics], i) => {
                    const totalWidth = (metrics.total / maxRoleVal) * 100;
                    const hiredPercent = metrics.total > 0 ? (metrics.success / metrics.total) * 100 : 0;
                    return (
                      <div key={i} className="text-xs space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-medium text-slate-700">
                          <span className="truncate max-w-[150px] font-semibold">{role}</span>
                          <span className="font-mono text-slate-500">Tỷ lệ đậu: <b className="text-emerald-600">{Math.round(hiredPercent)}%</b> ({metrics.success}/{metrics.total})</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                          <div 
                            className="h-full bg-slate-200 rounded-full" 
                            style={{ width: `${totalWidth}%` }}
                          >
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${hiredPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 font-medium text-[11px]">Chưa có dữ liệu vị trí ứng tuyển.</div>
              )}
            </div>

          </div>

          {/* Premium AI HR Consultancy Analytics report card */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-800 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3 font-sans">
                <div className="w-9 h-9 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 rounded-xl flex items-center justify-center shrink-0 animate-fade-in">
                  <Brain size={18} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 font-mono">BÁO CÁO CỐ VẤN TUYỂN DỤNG</span>
                    <span className="bg-indigo-600 text-[8px] px-1.5 py-0.5 rounded font-bold font-mono">GEMINI 3.5 FLASH</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white mt-1">Trợ Lý Phân Tích & Điểm Nghẽn AI CRM</h3>
                </div>
              </div>

              <button
                onClick={handleRequestAiAnalysis}
                disabled={loadingAi || candidates.length === 0}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-1.5 px-4 rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
              >
                {loadingAi ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Đang phân tích sâu...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    Yêu cầu AI tư vấn chiến lược
                  </>
                )}
              </button>
            </div>

            {aiReport ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
                <div className="space-y-1.5 bg-slate-950/40 p-4 rounded-lg border border-slate-800/60">
                  <h5 className="font-bold text-white text-[11px] flex items-center gap-1.5 uppercase tracking-wider text-indigo-400">
                    <TrendingUp size={12} />
                    Báo cáo tổng quan
                  </h5>
                  <p className="leading-relaxed whitespace-pre-line text-slate-200 font-sans">{aiReport.summary}</p>
                </div>

                <div className="space-y-1.5 bg-slate-950/40 p-4 rounded-lg border border-slate-800/60">
                  <h5 className="font-bold text-white text-[11px] flex items-center gap-1.5 uppercase tracking-wider text-rose-400">
                    <AlertCircle size={12} />
                    Điểm nghẽn tuyển dụng
                  </h5>
                  <p className="leading-relaxed whitespace-pre-line text-slate-200 font-sans">{aiReport.bottlenecks}</p>
                </div>

                <div className="space-y-1.5 bg-slate-950/40 p-4 rounded-lg border border-slate-800/60">
                  <h5 className="font-bold text-white text-[11px] flex items-center gap-1.5 uppercase tracking-wider text-emerald-400">
                    <Check size={12} />
                    Đề xuất & Giải pháp
                  </h5>
                  <p className="leading-relaxed whitespace-pre-line text-slate-200 font-sans">{aiReport.proposals}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <HelpCircle className="mx-auto text-slate-700 mb-2" size={24} />
                <p className="text-xs text-slate-400 font-medium">Báo cáo phân tích AI chưa được khởi tạo cho danh sách này.</p>
                <p className="text-[10px] text-slate-500 mt-1">Lấy dữ liệu từ {candidates.length} ứng viên phía dưới để bắt đầu nhận phân tích phễu chuyển đổi!</p>
              </div>
            )}
          </div>

          {/* Cards stats row - Geometric Balance Style */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">TỔNG ỨNG VIÊN</p>
                <p className="text-3xl font-light text-slate-950 font-mono">{totalCount}</p>
              </div>
              <div className="mt-4 h-1 w-full bg-slate-100 rounded-none overflow-hidden">
                <div className="h-full bg-slate-900" style={{ width: "100%" }}></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-1">MỚI CHUYỂN ĐẾN</p>
                <p className="text-3xl font-light text-blue-600 font-mono">{newCount}</p>
              </div>
              <div className="mt-4 h-1 w-full bg-slate-100 rounded-none overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${totalCount > 0 ? (newCount / totalCount) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-amber-500 text-[10px] font-bold uppercase tracking-widest mb-1">ĐANG PHỎNG VẤN</p>
                <p className="text-3xl font-light text-amber-500 font-mono">{interviewingCount}</p>
              </div>
              <div className="mt-4 h-1 w-full bg-slate-100 rounded-none overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${totalCount > 0 ? (interviewingCount / totalCount) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-1">ĐẠT YÊU CẦU</p>
                <p className="text-3xl font-light text-emerald-600 font-mono">{successCount}</p>
              </div>
              <div className="mt-4 h-1 w-full bg-slate-100 rounded-none overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${totalCount > 0 ? (successCount / totalCount) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
              <div>
                <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mb-1">ĐÃ TỪ CHỐI</p>
                <p className="text-3xl font-light text-rose-500 font-mono">{rejectedCount}</p>
              </div>
              <div className="mt-4 h-1 w-full bg-slate-100 rounded-none overflow-hidden">
                <div className="h-full bg-rose-400" style={{ width: `${totalCount > 0 ? (rejectedCount / totalCount) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Main filter & table block - Geometric Balance Style */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        
        {/* Table actions bar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row gap-3.5 justify-between items-center">
          
          {/* Quick search inputs */}
          <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm ứng viên, SĐT, vị trí tuyển dụng..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs py-2 px-3 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="all">Tất cả Trạng thái</option>
                {Object.values(CandidateStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs py-2 px-3 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[150px] font-medium"
              >
                <option value="all">Mọi nguồn tuyển</option>
                {uniqueSources.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 font-medium rounded text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="Tải lại dữ liệu từ Sheet"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-750 text-white rounded text-xs font-bold cursor-pointer transition-all"
            >
              <Plus size={14} className="stroke-[2.5px]" /> Thêm Ứng Viên Mới
            </button>
          </div>
        </div>

        {/* Real Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-indigo-600 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Đang đồng bộ dữ liệu trực tiếp với Google Sheet...</p>
            </div>
          ) : filteredCandidates.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase bg-slate-50/50">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Thông tin ứng viên</th>
                  <th className="py-3 px-4">Vị trí</th>
                  <th className="py-3 px-4">Nguồn tuyển</th>
                  <th className="py-3 px-4">Cộng tác viên</th>
                  <th className="py-3 px-4 text-center">Tình trạng ứng viên (Cột R)</th>
                  <th className="py-3 px-4">Kết Quả CV (Cột J)</th>
                  <th className="py-3 px-4">Kết Quả Phỏng vấn (Cột N)</th>
                  <th className="py-3 px-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                {filteredCandidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {cand.timestamp || "Không rõ"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{cand.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{cand.contact}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-[160px]">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="truncate" title={cand.role}>
                          {cand.role || <em className="text-slate-300">Nhấp sửa...</em>}
                        </span>
                        <button
                          onClick={() => handleRoleEditSubmit(cand)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline text-[10px] shrink-0 cursor-pointer"
                        >
                          Sửa
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                        {cand.source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {cand.ctvName}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={cand.status}
                        onChange={(e) => handleStatusChange(cand, e.target.value as CandidateStatus)}
                        className={`text-[10px] font-bold px-2 py-1.5 rounded-full border border-transparent focus:ring-1 focus:ring-indigo-400 focus:outline-none cursor-pointer ${
                          cand.status === CandidateStatus.NEW ? "bg-blue-50 text-blue-600" :
                          cand.status === CandidateStatus.CONTACTED ? "bg-slate-100 text-slate-600" :
                          cand.status === CandidateStatus.INTERVIEWING ? "bg-amber-50 text-amber-600" :
                          cand.status === CandidateStatus.OFFERED ? "bg-indigo-50 text-indigo-600" :
                          cand.status === CandidateStatus.HIRED ? "bg-emerald-50 text-emerald-600" :
                          "bg-rose-50 text-rose-500"
                        }`}
                      >
                        {Object.values(CandidateStatus).map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 max-w-[180px]">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="text-slate-500 text-[11px] truncate" title={cand.cvResult}>
                          {cand.cvResult || <em className="text-slate-300">Nhấp sửa...</em>}
                        </span>
                        <button
                          onClick={() => handleCvResultEditSubmit(cand)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline text-[10px] shrink-0 cursor-pointer"
                        >
                          Sửa
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-[180px]">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="text-slate-500 text-[11px] truncate" title={cand.interviewResult}>
                          {cand.interviewResult || <em className="text-slate-300">Nhấp sửa...</em>}
                        </span>
                        <button
                          onClick={() => handleInterviewResultEditSubmit(cand)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline text-[10px] shrink-0 cursor-pointer"
                        >
                          Sửa
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-[180px] truncate">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="text-slate-500 text-[11px] truncate">
                          {cand.notes || <em className="text-slate-300">Nhấp chỉnh sửa...</em>}
                        </span>
                        <button
                          onClick={() => handleNotesEditSubmit(cand)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline text-[10px] shrink-0 cursor-pointer"
                        >
                          Sửa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center text-slate-400">
              <ClipboardList className="mx-auto mb-3" size={32} />
              <p className="text-xs font-semibold">Không tìm thấy ứng viên thích hợp</p>
              <p className="text-[10px] mt-1 max-w-xs mx-auto">Vui lòng kiểm tra lại bộ lọc tìm kiếm, hoặc thêm ứng viên mới để bắt đầu lưu vào Google Sheets.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add New Candidate Modal - Geometric Balance Style */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded border border-slate-200 shadow-lg w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserCheck size={16} className="text-indigo-500" />
                Thêm Ứng Viên Trackings Mới
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Họ Tên Ứng Viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nhập tên ứng viên..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Số điện thoại / Link liên lạc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="SĐT, Zalo Link, Facebook Profile..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Vị Trí UV Ứng Tuyển <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="VD: NV Bán hàng, Designer..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nguồn tuyển / Channel thu hút
                </label>
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="Cộng đồng Tìm việc làm Q1, Group tìm CTV..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kết quả đánh giá hồ sơ CV (Cột J)
                </label>
                <input
                  type="text"
                  value={newCvResult}
                  onChange={(e) => setNewCvResult(e.target.value)}
                  placeholder="Đạt vòng 1, Chờ gửi bài test..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kết quả phỏng vấn (Cột N)
                </label>
                <input
                  type="text"
                  value={newInterviewResult}
                  onChange={(e) => setNewInterviewResult(e.target.value)}
                  placeholder="Pass, Failed, Hẹn PV vòng 2..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ghi chú chi tiết bổ sung
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="Kinh nghiệm của ứng viên, lịch phỏng vấn..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {adding ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Thêm & Ghi Vào Sheet"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
