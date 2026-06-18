import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, UploadCloud, FileText, Printer, CheckCircle2, 
  RefreshCw, Briefcase, GraduationCap, Award, Phone, Mail, 
  MapPin, Check, Plus, Trash2, ArrowRight, Download, ExternalLink
} from "lucide-react";
import { Candidate, CandidateStatus } from "../types";
import { API_BASE_URL } from "../config";

// Helper for dynamically rendering high-fidelity PDFs client-side without relying on blocked iframe print dialogues
const loadHtml2Pdf = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).html2pdf) {
      resolve((window as any).html2pdf);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = () => reject(new Error("Không thể tải thư viện xuất PDF. Vui lòng kiểm tra kết nối mạng."));
    document.head.appendChild(script);
  });
};

interface CvGeneratorProps {
  onAddCandidate?: any;
  ctvName?: any;
}

interface CvData {
  fullName: string;
  contact: string;
  targetRole: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
}

export default function CvGenerator({ onAddCandidate, ctvName }: CvGeneratorProps = {}) {
  // Check if running inside an iframe
  const [isIframe, setIsIframe] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsIframe(window.self !== window.top);
    }
  }, []);

  // Parsing & generation progress state
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [generatingCv, setGeneratingCv] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Personal Info Form State (backed by localStorage to prevent loss across tabs/reloads)
  const [fullName, setFullName] = useState(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_fullName")) || "");
  const [email, setEmail] = useState(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_email")) || "");
  const [phone, setPhone] = useState(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_phone")) || "");
  const [address, setAddress] = useState(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_address")) || "");
  const [targetRole, setTargetRole] = useState(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_targetRole")) || "");
  const [summary, setSummary] = useState(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_summary")) || "");
  const [experience, setExperience] = useState(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_experience")) || "");
  const [education, setEducation] = useState(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_education")) || "");
  const [skills, setSkills] = useState(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_skills")) || "");

  // Avatar upload URL
  const [avatarBase64, setAvatarBase64] = useState<string | null>(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_avatarBase64")) || null);
  const [imageFileName, setImageFileName] = useState(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_imageFileName")) || "");

  // Tone of the language optimization
  const [tone, setTone] = useState(() => (typeof window !== "undefined" && localStorage.getItem("cv_gen_tone")) || "Chuyên nghiệp, tin cậy và tự tin");
  // Visual template style
  const [selectedTemplate, setSelectedTemplate] = useState<"emerald" | "indigo" | "minimalist" | "charcoal">(
    () => ((typeof window !== "undefined" && localStorage.getItem("cv_gen_selectedTemplate")) as any) || "emerald"
  );

  // Output polished state
  const [polishedCv, setPolishedCv] = useState<CvData | null>(() => {
    try {
      const saved = typeof window !== "undefined" && localStorage.getItem("cv_gen_polishedCv");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Automatically survive reloads and route transfers
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("cv_gen_fullName", fullName);
    localStorage.setItem("cv_gen_email", email);
    localStorage.setItem("cv_gen_phone", phone);
    localStorage.setItem("cv_gen_address", address);
    localStorage.setItem("cv_gen_targetRole", targetRole);
    localStorage.setItem("cv_gen_summary", summary);
    localStorage.setItem("cv_gen_experience", experience);
    localStorage.setItem("cv_gen_education", education);
    localStorage.setItem("cv_gen_skills", skills);
    localStorage.setItem("cv_gen_tone", tone);
    localStorage.setItem("cv_gen_selectedTemplate", selectedTemplate);
    localStorage.setItem("cv_gen_imageFileName", imageFileName);
    if (avatarBase64) {
      localStorage.setItem("cv_gen_avatarBase64", avatarBase64);
    } else {
      localStorage.removeItem("cv_gen_avatarBase64");
    }
    if (polishedCv) {
      localStorage.setItem("cv_gen_polishedCv", JSON.stringify(polishedCv));
    } else {
      localStorage.removeItem("cv_gen_polishedCv");
    }
  }, [fullName, email, phone, address, targetRole, summary, experience, education, skills, tone, selectedTemplate, imageFileName, avatarBase64, polishedCv]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Handle Drag & Drop for CV Document Profile Photo/Image
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processImageForAnalysis(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processImageForAnalysis(e.target.files[0]);
    }
  };

  // Convert image file and analyze with Backend Gemini route
  const processImageForAnalysis = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Vui lòng tải lên một tệp hình ảnh hợp lệ (PNG, JPG, JPEG).");
      return;
    }

    setImageFileName(file.name);
    setErrorMessage("");
    setAnalyzingImage(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const cleanBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/, "");
      
      // Also set as candidate avatar/document preview
      setAvatarBase64(base64String);

      try {
        const response = await fetch(API_BASE_URL + "/api/gemini/analyze-cv-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: cleanBase64,
            mimeType: file.type,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Không thể phân tích tệp ảnh.");
        }

        const data: CvData = await response.json();
        
        // Populate the states
        setFullName(data.fullName || "");
        setTargetRole(data.targetRole || "");
        setSummary(data.summary || "");
        setExperience(data.experience || "");
        setEducation(data.education || "");
        setSkills(data.skills || "");

        // Split contact if possible
        if (data.contact) {
          const contactStr = data.contact.toLowerCase();
          // basic Regex parsing for quick pre-fill
          const emailMatch = contactStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/);
          if (emailMatch) {
            setEmail(emailMatch[0]);
          }
          const phoneMatch = contactStr.match(/(0[3|5|7|8|9])+([0-9]{8})\b/);
          if (phoneMatch) {
            setPhone(phoneMatch[0]);
          }
          setAddress(data.contact);
        }

        setSuccessMessage("Đã đọc và điền tự động thông tin từ ảnh thành công!");
      } catch (err: any) {
        setErrorMessage(`Lỗi phân tích bằng AI: ${err.message}. Bạn vẫn có thể điền thông tin bằng tay dưới đây.`);
      } finally {
        setAnalyzingImage(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // Handle personal photo upload purely for layout preview
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle formatting & CV Generation with Gemini AI
  const handleGenerateCv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage("Vui lòng cung cấp ít nhất Họ và Tên để bắt đầu tối ưu hóa.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setGeneratingCv(true);

    // merge custom contact info
    const contactInfoString = [
      email ? `Email: ${email}` : "",
      phone ? `SĐT: ${phone}` : "",
      address ? `Địa chỉ: ${address}` : ""
    ].filter(Boolean).join(" | ");

    try {
      const response = await fetch(API_BASE_URL + "/api/gemini/generate-cv-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          contact: contactInfoString || "Hồ sơ offline",
          targetRole,
          summary,
          experience,
          education,
          skills,
          tone,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Gặp lỗi khi tạo bản CV đánh bóng.");
      }

      const result: CvData = await response.json();
      setPolishedCv(result);
      setSuccessMessage("Đã tạo và tối ưu hóa CV Chuyên Nghiệp của bạn!");
    } catch (err: any) {
      setErrorMessage(`Lỗi tối ưu bằng AI: ${err.message}`);
    } finally {
      setGeneratingCv(false);
    }
  };

  // Direct Native Printing engine
  const handlePrint = () => {
    const printBoard = document.getElementById("printable-cv-board");
    if (!printBoard) {
      alert("Không tìm thấy dữ liệu mẫu CV để in. Hãy điền thông tin và thử lại.");
      return;
    }

    if (isIframe) {
      const confirmOpen = window.confirm(
        "Bạn đang ở khung Xem thử của AI Studio. Trình duyệt có thể chặn chức năng in ở chế độ này.\n\nNhấn 'OK' để mở ứng dụng ở một Trang Mới và tải/in mượt mà, hoặc 'Cancel' để tiếp tục cố gắng in ở trang hiện tại."
      );
      if (confirmOpen) {
        window.open(window.location.origin + window.location.pathname + "?tab=cv-generator#cv-generator", "_blank");
        return;
      }
    }

    window.print();
  };

  // Quick template preset fillers (For convenience/demo if they have empty fields)
  const loadPresetData = () => {
    setFullName("Trần Minh Quân");
    setEmail("minhquan.tran.work@gmail.com");
    setPhone("0912345678");
    setAddress("Quận Phú Nhuận, TP. Hồ Chí Minh");
    setTargetRole("Nhân viên tư vấn tuyển sinh (Telesales)");
    setSummary("Tôi là một người năng động, hướng ngoại, kiên trì và đam mê kỹ năng giao tiếp, thuyết phục khách hàng. Mong muốn cống hiến tạo doanh số cao.");
    setExperience("Tháng 09/2025 - Hiện tại: Nhân viên bán hàng & Tư vấn viên tại Highlands Coffee Việt Nam. Xử lý thanh toán, giải đáp thắc mắc dịch vụ và duy trì doanh số trà/cốc tăng trưởng 12% mỗi tháng.\nTháng 05/2024 - 02/2025: Cộng tác viên Fanpage cộng đồng sinh viên trường Đại học.");
    setEducation("Cử nhân Quản trị Kinh doanh - Đại học Tài chính Marketing HCM (Đang học năm cuối)");
    setSkills("Tư vấn telesales, Thuyết phục khách hàng, Sử dụng Google Sheets, Giải quyết khiếu nại, Làm việc nhóm");
  };

  // Reset all drafting states to start a fresh CV
  const handleResetData = () => {
    if (window.confirm("Bạn có muốn dọn sạch tất cả các trường thông tin nháp hiện tại để làm mới?")) {
      setFullName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setTargetRole("");
      setSummary("");
      setExperience("");
      setEducation("");
      setSkills("");
      setAvatarBase64(null);
      setImageFileName("");
      setPolishedCv(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("cv_gen_fullName");
        localStorage.removeItem("cv_gen_email");
        localStorage.removeItem("cv_gen_phone");
        localStorage.removeItem("cv_gen_address");
        localStorage.removeItem("cv_gen_targetRole");
        localStorage.removeItem("cv_gen_summary");
        localStorage.removeItem("cv_gen_experience");
        localStorage.removeItem("cv_gen_education");
        localStorage.removeItem("cv_gen_skills");
        localStorage.removeItem("cv_gen_avatarBase64");
        localStorage.removeItem("cv_gen_imageFileName");
        localStorage.removeItem("cv_gen_polishedCv");
      }
    }
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Introduction Intro Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 uppercase tracking-tight">
            <Sparkles size={16} className="text-indigo-500 animate-pulse" />
            Trình Tạo CV Chuyên Nghiệp Bằng AI
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ứng dụng công nghệ xử lý ảnh & ngôn ngữ của Gemini. Tải ảnh thông tin cũ lên để tự động điền mẫu, hiệu chỉnh & xuất bản CV đẹp mắt.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetData}
            className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            Dọn Sạch Nháp
          </button>
          <button
            type="button"
            onClick={loadPresetData}
            className="py-2 px-3 border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded text-xs font-bold transition-colors cursor-pointer"
          >
            Tải Mẫu Đệm Nhanh
          </button>
        </div>
      </div>

      {isIframe && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-805 rounded-xl text-xs space-y-2">
          <div className="font-extrabold flex items-center gap-1.5 uppercase text-amber-900">
            <span className="p-1 bg-amber-100 rounded text-amber-800 shrink-0">⚠️</span>
            Chế độ Bản Xem Thử (Browser iFrame Sandbox)
          </div>
          <p className="leading-relaxed">
            Nhằm bảo mật, một số trình duyệt chặn hộp thoại In ấn (Print) và Tải file PDF từ trong khung Xem Thử (iFrame Sandbox).
          </p>
          <div className="font-semibold text-slate-800">
            Hãy nhấp nút dưới đây để chuyển đổi sang Trang Mới, các tính năng Tải File PDF và In CV sẽ hoạt động đầy đủ 100%!
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => window.open(window.location.origin + window.location.pathname + "?tab=cv-generator#cv-generator", "_blank")}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-extrabold shadow-sm transition-all text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink size={13} /> Mở Trang Riêng Lẻ (Tab Mới)
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-600" />
          {successMessage}
        </div>
      )}

      {/* Main Form Split with Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Creation Panel (Inputs & AI Image Upload) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Step 1: AI Parse Image Upload */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-[11px] text-slate-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
              Bước 1: Trích Xuất Dữ Liệu Từ Ảnh CV/Sơ yếu
            </h3>
            
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive 
                  ? "border-indigo-500 bg-indigo-50/50" 
                  : "border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              
              <div className="flex flex-col items-center justify-center gap-2">
                {analyzingImage ? (
                  <RefreshCw size={28} className="text-indigo-600 animate-spin" />
                ) : (
                  <UploadCloud size={28} className="text-slate-400" />
                )}
                
                <div className="text-xs font-bold text-slate-700">
                  {analyzingImage ? "AI Đang xử lý tài liệu ảnh..." : "Kéo thả ảnh CV cũ hoặc Nhấp để tìm tệp"}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto">
                  Gemini sẽ quét và tự động trích xuất Họ tên, Kinh nghiệm, Học vấn cũ để điền vào form bên dưới.
                </p>

                {imageFileName && (
                  <div className="mt-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium truncate max-w-[200px]">
                    Tệp: {imageFileName}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Personal Details Form */}
          <form onSubmit={handleGenerateCv} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-[11px] text-slate-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
              Bước 2: Hiệu Chỉnh Thiết Lập Hồ Sơ
            </h3>

            {/* Avatar picker purely for looking pretty on CV preview */}
            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="w-12 h-12 rounded-full border border-slate-300 bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {avatarBase64 ? (
                  <img src={avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <FileText size={20} className="text-slate-400" />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Ảnh đại diện trên CV</label>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="px-2.5 py-1 text-[10px] bg-white border border-slate-200 hover:bg-slate-50 rounded text-slate-700 font-semibold cursor-pointer"
                >
                  Chọn tệp ảnh
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Anh"
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 rounded focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="091..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 rounded focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Email liên lạc</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 rounded focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Khu vực sống / Địa chỉ</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Quận Gò Vấp, Hồ Chí Minh"
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 rounded focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Vị trí mong muốn ứng tuyển *</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="VD: Telesales, Nhân viên bán hàng Part-time"
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 rounded focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Tóm tắt ngắn bản thân</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Viết một vài câu giới thiệu ngắn về điểm mạnh hoặc định hướng của bạn..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 rounded focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Kinh nghiệm làm việc</label>
                <textarea
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="Kinh nghiệm trước đây, công ty, thời gian làm làm việc..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 rounded focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Học vấn & Bằng cấp</label>
                <textarea
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Tên trường, Chuyên ngành học, Năm tốt nghiệp..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 rounded focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Kỹ năng (Cực kì quan trọng, cách nhau gạch đầu dòng hoặc dấu phẩy)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="VD: Telesales, Giải quyết vấn đề, Canva, Tư duy dịch vụ"
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 rounded focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Chọn phong cách văn phong AI</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 font-bold"
                >
                  <option value="Chuyên nghiệp, tin cậy và tự tin">Chuyên Nghiệp & Bản Lĩnh</option>
                  <option value="Trẻ trung, nhiệt huyết và năng động">Thuyết Phục & Trẻ Trung</option>
                  <option value="Nhẹ nhàng, khiêm tốn và chân thành">Cẩn Trọng & Thân Thiện</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={generatingCv}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {generatingCv ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Đang thiết kế tạo lập CV chuyên sâu...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Tạo & Đánh Bóng CV Với AI
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Professional CV Output Style & Live Preview */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Template controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-2 items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Mẫu thiết kế giao diện:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate("emerald")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTemplate === "emerald" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Màu Xanh Ngọc (Emerald)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplate("indigo")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTemplate === "indigo" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Màu Indigo (Tech)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplate("charcoal")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTemplate === "charcoal" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Màu Than Đá (Charcoal)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplate("minimalist")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTemplate === "minimalist" ? "bg-slate-200 border border-slate-400 text-slate-900" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Tối Giản Đen Trắng
              </button>
            </div>
          </div>

          {/* Interactive Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-4.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer uppercase tracking-wider"
            >
              <Printer size={16} />
              In / Xuất Bản CV Chuyên Nghiệp (A4 PDF)
            </button>
          </div>

          {/* Print instructions banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-normal">
            <strong>Mẹo Lưu File PDF:</strong> Trong cửa sổ In (Print) hiện ra, tại mục <strong>Máy in (Destination)</strong>, bạn hãy chọn <strong>Lưu dưới dạng PDF (Save as PDF)</strong> để tải file CV định dạng chuẩn A4 trực tiếp về máy tính của mình. Chức năng In bản in mượt mà 100% không bị cắt góc.
          </div>

          {/* CV Live Output Board */}
          <div 
            id="printable-cv-board" 
            className={`cv-layout bg-white p-8 md:p-12 rounded-xl border border-slate-350 shadow-md relative font-sans leading-relaxed text-slate-800 max-w-[210mm] min-h-[297mm] mx-auto`}
          >
            {/* Outline border style dependent on selected theme */}
            <div className={`absolute top-0 left-0 w-full h-3 rounded-t-xl ${
              selectedTemplate === "emerald" ? "bg-emerald-600" :
              selectedTemplate === "indigo" ? "bg-indigo-600" :
              selectedTemplate === "charcoal" ? "bg-slate-800" :
              "bg-slate-300"
            }`} />

            {/* Content values - fallback to manual values if polishedCv hasn't run yet */}
            {(() => {
              const currentData: CvData = polishedCv || {
                fullName: fullName || "TRẦN MINH QUÂN",
                contact: [
                  phone ? `SĐT: ${phone}` : "SĐT: 0912345678",
                  email ? `Email: ${email}` : "Email: candidates@example.com",
                  address ? `Đ/c: ${address}` : "Địa chỉ: Thành phố Hồ Chí Minh"
                ].filter(Boolean).join("  |  "),
                targetRole: targetRole || "VỊ TRÍ TUYỂN DỤNG MỤC TIÊU",
                summary: summary || "Tóm tắt bản cơ sở chưa được định hình. Nhấp nút 'Tạo & Đánh Bóng CV' để AI viết lại bài giới thiệu bản thân chuyên nghiệp, ấn tượng và súc tích hơn giúp gia tăng cơ hội trúng tuyển lên gấp 2 lần.",
                experience: experience || "Hãy điền sơ thảo kinh nghiệm của bạn ở cột bên trái: các việc từng làm, công việc chạy bàn, cộng tác viên bán hàng, trực ca hoặc thực tập. AI sẽ hệ thống hóa chuẩn HR chuyên ngành cho bạn.",
                education: education || "Hãy cung cấp cơ sở học vấn của bạn ví dụ tên trường học cấp 3, Cao đẳng, Đại học, Đại học học nghề, hoặc các khóa học kỹ năng.",
                skills: skills || "Giao tiếp, Phục vụ khách hàng, Thuyết phục, Làm việc nhóm"
              };

              return (
                <div className="space-y-8">
                  
                  {/* CV Header: Profile photo and candidate basic title details */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-slate-200">
                    <div className="space-y-2 max-w-lg">
                      <h1 className={`text-2xl font-black uppercase tracking-tight ${
                        selectedTemplate === "emerald" ? "text-emerald-950" :
                        selectedTemplate === "indigo" ? "text-indigo-950" :
                        selectedTemplate === "charcoal" ? "text-slate-950" :
                        "text-slate-900"
                      }`}>
                        {currentData.fullName}
                      </h1>
                      
                      <div className={`text-xs font-extrabold uppercase tracking-widest ${
                        selectedTemplate === "emerald" ? "text-emerald-600" :
                        selectedTemplate === "indigo" ? "text-indigo-600" :
                        selectedTemplate === "charcoal" ? "text-slate-700" :
                        "text-slate-500"
                      }`}>
                        {currentData.targetRole}
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium leading-relaxed font-mono mt-2 flex flex-wrap gap-x-2 gap-y-1">
                        {currentData.contact}
                      </div>
                    </div>

                    {/* Prettier Layout: Square/circular avatar container if provided */}
                    <div className="w-24 h-24 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                      {avatarBase64 ? (
                        <img src={avatarBase64} alt="Avatar profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-2 text-[9px] text-slate-400 font-mono">
                          Khung ảnh đại diện
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CV Summary section */}
                  <div className="space-y-2">
                    <h2 className={`text-xs font-extrabold uppercase tracking-widest border-l-3 pl-2.5 ${
                      selectedTemplate === "emerald" ? "text-emerald-800 border-emerald-500" :
                      selectedTemplate === "indigo" ? "text-indigo-800 border-indigo-505" :
                      selectedTemplate === "charcoal" ? "text-slate-900 border-slate-700" :
                      "text-slate-800 border-slate-400"
                    }`}>
                      Tóm tắt giới thiệu
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed text-justify">
                      {currentData.summary}
                    </p>
                  </div>

                  {/* CV Experience Section */}
                  <div className="space-y-3">
                    <h2 className={`text-xs font-extrabold uppercase tracking-widest border-l-3 pl-2.5 ${
                      selectedTemplate === "emerald" ? "text-emerald-800 border-emerald-500" :
                      selectedTemplate === "indigo" ? "text-indigo-800 border-indigo-505" :
                      selectedTemplate === "charcoal" ? "text-slate-900 border-slate-700" :
                      "text-slate-800 border-slate-400"
                    }`}>
                      Kinh nghiệm hoạt động & làm việc
                    </h2>
                    <div className="text-xs text-slate-650 whitespace-pre-line leading-relaxed space-y-1 bg-slate-50/45 p-4 rounded-lg border border-slate-100">
                      {currentData.experience}
                    </div>
                  </div>

                  {/* CV Education Section */}
                  <div className="space-y-3">
                    <h2 className={`text-xs font-extrabold uppercase tracking-widest border-l-3 pl-2.5 ${
                      selectedTemplate === "emerald" ? "text-emerald-800 border-emerald-500" :
                      selectedTemplate === "indigo" ? "text-indigo-800 border-indigo-505" :
                      selectedTemplate === "charcoal" ? "text-slate-900 border-slate-700" :
                      "text-slate-800 border-slate-400"
                    }`}>
                      Thông tin trình độ học vấn
                    </h2>
                    <div className="text-xs text-slate-650 bg-slate-50/45 p-4 rounded-lg border border-slate-100 whitespace-pre-line">
                      {currentData.education}
                    </div>
                  </div>

                  {/* CV Skills Section */}
                  <div className="space-y-3">
                    <h2 className={`text-xs font-extrabold uppercase tracking-widest border-l-3 pl-2.5 ${
                      selectedTemplate === "emerald" ? "text-emerald-800 border-emerald-500" :
                      selectedTemplate === "indigo" ? "text-indigo-800 border-indigo-505" :
                      selectedTemplate === "charcoal" ? "text-slate-900 border-slate-700" :
                      "text-slate-800 border-slate-400"
                    }`}>
                      Kỹ năng cốt lõi nổi tiếng
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {currentData.skills.split(/[,;\n]+/).map((item, index) => {
                        const trimmed = item.trim();
                        if (!trimmed) return null;
                        return (
                          <span 
                            key={index} 
                            className={`px-3 py-1 rounded text-[11px] font-medium leading-none ${
                              selectedTemplate === "emerald" ? "bg-emerald-50 text-emerald-805 border border-emerald-100" :
                              selectedTemplate === "indigo" ? "bg-indigo-55/20 text-indigo-750 border border-indigo-100" :
                              selectedTemplate === "charcoal" ? "bg-slate-100 text-slate-800 border border-slate-200" :
                              "bg-slate-100 text-slate-800 border border-slate-200"
                            }`}
                          >
                            {trimmed}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* Print style overrides embedded safely inside the preview container */}
            <style>{`
              @media print {
                /* Hide everything except the printable board and its children */
                body * {
                  visibility: hidden !important;
                }
                #printable-cv-board, #printable-cv-board * {
                  visibility: visible !important;
                }
                
                /* Reset core body and HTML margins and scale */
                html, body {
                  height: auto !important;
                  min-height: 0 !important;
                  max-height: none !important;
                  overflow: visible !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }

                /* Neutralize any grid/flex container dimensions that can restrict parent heights */
                #root, main, section, div, article {
                  height: auto !important;
                  min-height: 0 !important;
                  max-height: none !important;
                  overflow: visible !important;
                  display: block !important;
                  position: static !important;
                  float: none !important;
                  border: none !important;
                  box-shadow: none !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }

                /* Force hide sidebar, sliders, buttons and forms */
                aside, header, nav, button, form, input, textarea, .no-print {
                  display: none !important;
                }

                /* Absolute container positioning for printable board across pages */
                #printable-cv-board {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 210mm !important; /* Set standard A4 width */
                  height: auto !important;
                  min-height: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 10mm !important;
                  margin: 0 !important;
                  background: white !important;
                }

                /* Prevent page breaking inside logical items like text lines */
                p, span, li, h1, h2, h3, h4, .cv-layout .rounded-lg {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              }
            `}</style>
          </div>

        </div>

      </div>

    </div>
  );
}
