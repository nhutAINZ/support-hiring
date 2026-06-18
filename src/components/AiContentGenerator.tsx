import React, { useState, useEffect } from "react";
import { Sparkles, Copy, Check, Search, ExternalLink, RefreshCw, MessageSquare, Briefcase, DollarSign, MapPin, Phone, Image as ImageIcon, Download, Palette, AlertCircle, Plus, Upload, ThumbsUp, HelpCircle } from "lucide-react";
import { GeneratedPost, SuggestedGroupKeyword, RecruitmentGroup } from "../types";
import { API_BASE_URL } from "../config";

interface AiContentGeneratorProps {
  savedGroups?: RecruitmentGroup[];
  onAddGroup?: (group: Omit<RecruitmentGroup, "id">) => Promise<void>;
}

export default function AiContentGenerator({ savedGroups = [], onAddGroup }: AiContentGeneratorProps) {
  const [role, setRole] = useState("Nhân viên bán hàng");
  const [company, setCompany] = useState("Cửa hàng thời trang Bloom");
  const [description, setDescription] = useState("Tư vấn bán hàng và sắp xếp sản phẩm, hỗ trợ khách thử đồ.");
  const [requirements, setRequirements] = useState("Ngoại hình sáng, giao tiếp tốt, chăm chỉ, ưu tiên ca tối từ 18:00 - 22:00.");
  const [salary, setSalary] = useState("Lương 25k - 30k/giờ + Thưởng doanh thu");
  const [location, setLocation] = useState("Quận 1, TP. Hồ Chí Minh");
  const [contactInfo, setContactInfo] = useState("SĐT/Zalo: 0987654321 hoặc inbox Facebook");
  const [tone, setTone] = useState("Trẻ trung, năng động");

  // JD text fast input extraction
  const [jdText, setJdText] = useState("");
  const [parsingJd, setParsingJd] = useState(false);

  // States for inline recruitment groups manual feeding
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupUrl, setNewGroupUrl] = useState("");
  const [newGroupNiche, setNewGroupNiche] = useState("Spa / Trị liệu");
  const [newGroupRating, setNewGroupRating] = useState(5);
  const [newGroupNotes, setNewGroupNotes] = useState("");
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [addGroupError, setAddGroupError] = useState<string | null>(null);
  const [addGroupSuccess, setAddGroupSuccess] = useState(false);
  const [groupSectionTab, setGroupSectionTab] = useState<"matched" | "keywords" | "add">("keywords");

  const [loading, setLoading] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<SuggestedGroupKeyword[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // States for dynamic poster generation & customization
  const [posterTheme, setPosterTheme] = useState("emerald");
  const [imageSource, setImageSource] = useState<"upload" | "preset" | "ai">("preset");
  const [uploadedImgUrl, setUploadedImgUrl] = useState<string | null>(null);
  const [aiImgUrl, setAiImgUrl] = useState<string | null>(null);
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<"spa" | "tech" | "sales" | "office" | "general">("spa");
  const [dragActive, setDragActive] = useState(false);

  const handleGeneratePoster = async () => {
    if (!role.trim()) {
      alert("Vui lòng nhập vị trí tuyển dụng để AI tìm ý tưởng vẽ tranh!");
      return;
    }
    setGeneratingPoster(true);
    setPosterError(null);
    try {
      const res = await fetch(API_BASE_URL + "/api/gemini/generate-poster", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ role, company }),
      });
      if (!res.ok) {
        throw new Error("Không thể kết nối API vẽ tranh AI.");
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.imageUrl) {
        setAiImgUrl(data.imageUrl);
        setImageSource("ai");
      } else {
        throw new Error("Không nhận được dữ liệu ảnh vẽ từ AI.");
      }
    } catch (err: any) {
      setPosterError(err.message || "Lỗi vẽ ảnh minh họa tuyển dụng.");
    } finally {
      setGeneratingPoster(false);
    }
  };

  // Helper to guess preset of the poster based on the role name
  const getSuggestedPreset = (jobRole: string): "spa" | "tech" | "sales" | "office" | "general" => {
    const rLower = jobRole.toLowerCase();
    if (
      rLower.includes("spa") ||
      rLower.includes("trị liệu") ||
      rLower.includes("massage") ||
      rLower.includes("ktv") ||
      rLower.includes("điều trị") ||
      rLower.includes("mỹ phẩm") ||
      rLower.includes("bác sĩ") ||
      rLower.includes("y tá") ||
      rLower.includes("dược") ||
      rLower.includes("chăm sóc da") ||
      rLower.includes("gội đầu") ||
      rLower.includes("nails") ||
      rLower.includes("mi")
    ) {
      return "spa";
    }
    if (
      rLower.includes("lập trình") ||
      rLower.includes("dev") ||
      rLower.includes("it") ||
      rLower.includes("coder") ||
      rLower.includes("web") ||
      rLower.includes("tech") ||
      rLower.includes("kỹ thuật") ||
      rLower.includes("phần mềm") ||
      rLower.includes("thiết kế") ||
      rLower.includes("designer") ||
      rLower.includes("figma")
    ) {
      return "tech";
    }
    if (
      rLower.includes("sale") ||
      rLower.includes("bán hàng") ||
      rLower.includes("thu ngân") ||
      rLower.includes("retail") ||
      rLower.includes("kinh doanh") ||
      rLower.includes("tư vấn") ||
      rLower.includes("bán sỉ") ||
      rLower.includes("chăm sóc khách hàng") ||
      rLower.includes("cskh")
    ) {
      return "sales";
    }
    if (
      rLower.includes("tuyển dụng") ||
      rLower.includes("nhân sự") ||
      rLower.includes("hr") ||
      rLower.includes("giáo viên") ||
      rLower.includes("phẩm chất") ||
      rLower.includes("vp") ||
      rLower.includes("văn phòng") ||
      rLower.includes("kế toán")
    ) {
      return "office";
    }
    return "general";
  };

  // Synchronously watch role and update recommended preset
  useEffect(() => {
    const recommended = getSuggestedPreset(role);
    setSelectedPreset(recommended);
  }, [role]);

  // Handle local file uploads
  const handleFileUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng tải lên đúng định dạng file hình ảnh (PNG, JPG, JPEG, GIF...)!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setUploadedImgUrl(e.target.result as string);
        setImageSource("upload");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleParseJd = async () => {
    if (!jdText.trim()) {
      alert("Vui lòng dán văn bản mô tả công việc (JD) gốc trước khi thực hiện!");
      return;
    }

    setParsingJd(true);
    try {
      const res = await fetch(API_BASE_URL + "/api/gemini/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText }),
      });

      if (!res.ok) {
        throw new Error("Không thể kết nối đến máy chủ hoặc thiết bị lỗi trích xuất.");
      }

      const data = await res.json();
      if (data) {
        if (data.role && data.role !== "Đang cập nhật") setRole(data.role);
        if (data.company && data.company !== "Đang cập nhật") setCompany(data.company);
        if (data.description && data.description !== "Đang cập nhật") setDescription(data.description);
        if (data.requirements && data.requirements !== "Đang cập nhật") setRequirements(data.requirements);
        if (data.salary && data.salary !== "Đang cập nhật") setSalary(data.salary);
        if (data.location && data.location !== "Đang cập nhật") setLocation(data.location);
        if (data.contactInfo && data.contactInfo !== "Đang cập nhật") setContactInfo(data.contactInfo);
      }
    } catch (err: any) {
      alert(`Lỗi trích xuất thông tin JD: ${err.message}`);
    } finally {
      setParsingJd(false);
    }
  };

  const handleGenerate = async () => {
    if (!role.trim()) {
      alert("Vui lòng nhập vị trí tuyển dụng!");
      return;
    }

    setLoading(true);
    try {
      // 1. Generate text content
      const contentRes = await fetch(API_BASE_URL + "/api/gemini/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, company, description, requirements, salary, location, contactInfo, tone }),
      });
      if (!contentRes.ok) throw new Error("Không thể kết nối API tạo bài tuyển dụng.");
      const contentData = await contentRes.json();
      if (contentData && contentData.options) {
         setGeneratedPosts(contentData.options);
      }

      // 2. Suggest search keywords
      const groupsRes = await fetch(API_BASE_URL + "/api/gemini/suggest-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, location }),
      });
      if (!groupsRes.ok) throw new Error("Không thể kết nối API phân tích hội nhóm.");
      const groupsData = await groupsRes.json();
      if (groupsData && groupsData.keywords) {
         setSuggestedKeywords(groupsData.keywords);
      }
    } catch (error: any) {
      alert(`Đã xảy ra lỗi khi tạo nội dung: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Match algorithm for saved groups
  const getMatchedSavedGroups = (): RecruitmentGroup[] => {
    if (!savedGroups || savedGroups.length === 0) return [];
    
    const roleLower = role.toLowerCase();
    const roleNiche = getSuggestedPreset(role); // Returns "spa", "tech", "sales", "office", "general"
    
    return savedGroups.filter(grp => {
      const gNameLower = grp.name.toLowerCase();
      const gNicheLower = grp.niche.toLowerCase();
      const gNotesLower = (grp.notes || "").toLowerCase();
      
      // Strict matching based on role category first
      if (roleNiche === "spa") {
        return gNicheLower.includes("spa") || gNicheLower.includes("trị liệu") || gNicheLower.includes("thẩm mỹ") || gNameLower.includes("spa") || gNameLower.includes("trị liệu") || gNameLower.includes("gội") || gNameLower.includes("hồi tông");
      }
      
      if (roleNiche === "tech") {
        return gNicheLower.includes("máy") || gNicheLower.includes("it") || gNicheLower.includes("tech") || gNicheLower.includes("công nghệ") || gNicheLower.includes("lập trình") || gNameLower.includes("it") || gNameLower.includes("developer") || gNameLower.includes("lập trình") || gNameLower.includes("coder");
      }
      
      if (roleNiche === "sales") {
        return gNicheLower.includes("bán") || gNicheLower.includes("sale") || gNicheLower.includes("kinh doanh") || gNameLower.includes("bán hàng") || gNameLower.includes("sale") || gNameLower.includes("kinh doanh");
      }
      
      if (roleNiche === "office") {
        return gNicheLower.includes("văn phòng") || gNicheLower.includes("hr") || gNicheLower.includes("nhân sự") || gNameLower.includes("văn phòng") || gNameLower.includes("nhân sự") || gNameLower.includes("kế toán");
      }
      
      // Fallback for general matches
      const isGeneral = gNicheLower.includes("khác") || gNicheLower.includes("sinh viên") || gNicheLower.includes("việc làm thêm") || gNameLower.includes("sinh viên") || gNameLower.includes("việc làm thêm") || gNameLower.includes("part-time");
      
      // Substring words check
      const words = roleLower.split(/\s+/).filter(w => w.length > 2);
      const isWordMatch = words.some(word => {
        if (word === "tuyển" || word === "dụng" || word === "việc" || word === "làm") return false; // ignore generic words
        return gNicheLower.includes(word) || gNameLower.includes(word) || gNotesLower.includes(word);
      });
      
      return isGeneral || isWordMatch;
    }).sort((a, b) => (b.rating || 5) - (a.rating || 5)); // Higher rated groups first
  };

  const handleAddNewGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupUrl.trim()) {
      setAddGroupError("Vui lòng điền đủ Tên nhóm và Đường dẫn liên kết!");
      return;
    }
    setIsAddingGroup(true);
    setAddGroupError(null);
    setAddGroupSuccess(false);
    try {
      if (onAddGroup) {
        await onAddGroup({
          name: newGroupName.trim(),
          url: newGroupUrl.trim(),
          niche: newGroupNiche,
          rating: Number(newGroupRating),
          notes: newGroupNotes.trim()
        });
        setAddGroupSuccess(true);
        setNewGroupName("");
        setNewGroupUrl("");
        setNewGroupNotes("");
        setTimeout(() => setAddGroupSuccess(false), 4000);
      } else {
        throw new Error("Lỗi: Không tìm thấy trình xử lý database Google Sheets.");
      }
    } catch (err: any) {
      setAddGroupError(err.message || "Không thể lưu thêm nhóm vào sheet.");
    } finally {
      setIsAddingGroup(false);
    }
  };

  // Helper function to handle wrapping of text on Canvas
  const drawTextWithWrap = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
    return currentY;
  };

  const handleDownloadPoster = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Helper to wrap metadata elegantly and prevent overflowing
    const drawWrappedMetadata = (c: CanvasRenderingContext2D, icon: string, label: string, val: string, startX: number, startY: number, lineW: number) => {
      c.font = "bold 20px sans-serif";
      const leadText = `${icon} ${label}: `;
      const leadW = c.measureText(leadText).width;
      
      c.fillStyle = "#ffffff";
      c.fillText(leadText, startX, startY);
      
      c.fillStyle = "#e2e8f0";
      c.font = "medium 20px sans-serif";
      
      const fullText = val;
      const words = fullText.split(" ");
      let line = "";
      let currentY = startY;
      let isFirstLine = true;
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        c.font = "medium 20px sans-serif";
        const testW = c.measureText(testLine).width;
        
        const limitW = isFirstLine ? (lineW - leadW) : lineW;
        if (testW > limitW && n > 0) {
          const drawX = isFirstLine ? (startX + leadW) : startX;
          c.fillText(line.trim(), drawX, currentY);
          line = words[n] + " ";
          currentY += 28;
          isFirstLine = false;
        } else {
          line = testLine;
        }
      }
      const drawX = isFirstLine ? (startX + leadW) : startX;
      c.fillText(line.trim(), drawX, currentY);
      return currentY;
    };

    // 1. Draw Background Gradient based on color theme
    const grad = ctx.createLinearGradient(0, 0, 0, 800);
    if (posterTheme === "emerald") {
      grad.addColorStop(0, "#065f46");
      grad.addColorStop(1, "#022c22");
    } else if (posterTheme === "royal") {
      grad.addColorStop(0, "#1e3a8a");
      grad.addColorStop(1, "#0f172a");
    } else if (posterTheme === "lavender") {
      grad.addColorStop(0, "#581c87");
      grad.addColorStop(1, "#2e1065");
    } else if (posterTheme === "gold") {
      grad.addColorStop(0, "#1f2937");
      grad.addColorStop(1, "#0f172a");
    } else {
      grad.addColorStop(0, "#334155");
      grad.addColorStop(1, "#0f172a");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 800);

    // 2. Draw Decorative Brackets
    ctx.strokeStyle = posterTheme === "gold" ? "#d97706" : posterTheme === "emerald" ? "#10b981" : "#6366f1";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 760, 760);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, 740, 740);

    // 3. Draw Header
    ctx.fillStyle = posterTheme === "gold" ? "#fbbf24" : "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HỆ THỐNG TUYỂN DỤNG NHÂN SỰ CHẤT LƯỢNG CAO", 400, 70);

    ctx.fillStyle = posterTheme === "gold" ? "#fbbf24" : posterTheme === "emerald" ? "#34d399" : "#a5b4fc";
    ctx.font = "bold 50px sans-serif";
    ctx.fillText("TUYỂN DỤNG GẤP", 400, 130);

    // 4. Draw Role
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px sans-serif";
    drawTextWithWrap(ctx, role.toUpperCase(), 400, 185, 700, 42);

    // Divider line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.moveTo(150, 240);
    ctx.lineTo(650, 240);
    ctx.stroke();

    // 5. Image Space Dimensions (Rectangular Banner Layout)
    const imgW = 380;
    const imgH = 240;
    const imgX = 210; // (800 - 380) / 2
    const imgY = 265;

    const drawMetadataAndDownload = () => {
      // Draw Company, Salary, Location starting at Y = 545 elegantly
      ctx.textAlign = "left";
      
      let nextY = 545;
      nextY = drawWrappedMetadata(ctx, "🏢", "Đơn vị", company || "Spa / Phòng Khám", 110, nextY, 580) + 30;
      nextY = drawWrappedMetadata(ctx, "💵", "Quyền lợi", salary || "Lương & Thưởng hấp dẫn", 110, nextY, 580) + 30;
      nextY = drawWrappedMetadata(ctx, "📍", "Khu vực", location || "Toàn quốc", 110, nextY, 580) + 34;

      // Draw bottom hotline pill
      ctx.fillStyle = posterTheme === "gold" ? "rgba(245, 158, 11, 0.2)" : "rgba(99, 102, 241, 0.2)";
      ctx.strokeStyle = posterTheme === "gold" ? "#fbbf24" : "#6366f1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(100, nextY, 600, 48, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`📞 Liên hệ tuyển dụng: ${contactInfo || "Inbox trực tiếp bài viết"}`, 400, nextY + 30);

      // Trigger automatic image download
      const link = document.createElement("a");
      link.download = `Poster_Tuyen_Dung_${role.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    const drawPresetOnCanvas = (preset: string) => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgW, imgH, 12);
      ctx.clip();

      const gradPreset = ctx.createLinearGradient(imgX, imgY, imgX, imgY + imgH);
      if (preset === "spa") {
        gradPreset.addColorStop(0, "#34d399");
        gradPreset.addColorStop(1, "#047857");
      } else if (preset === "tech") {
        gradPreset.addColorStop(0, "#60a5fa");
        gradPreset.addColorStop(1, "#1d4ed8");
      } else if (preset === "sales") {
        gradPreset.addColorStop(0, "#fbcfe8");
        gradPreset.addColorStop(1, "#db2777");
      } else if (preset === "office") {
        gradPreset.addColorStop(0, "#fef08a");
        gradPreset.addColorStop(1, "#ca8a04");
      } else {
        gradPreset.addColorStop(0, "#c084fc");
        gradPreset.addColorStop(1, "#7e22ce");
      }
      ctx.fillStyle = gradPreset;
      ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.restore();

      // rectangular border stroke
      ctx.strokeStyle = posterTheme === "gold" ? "#fbbf24" : "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgW, imgH, 12);
      ctx.stroke();

      // Draw emoji icon representation centered
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 90px sans-serif";
      const centerX = imgX + imgW / 2;
      const centerY = imgY + imgH / 2;
      if (preset === "spa") ctx.fillText("🌿", centerX, centerY);
      else if (preset === "tech") ctx.fillText("💻", centerX, centerY);
      else if (preset === "sales") ctx.fillText("📈", centerX, centerY);
      else if (preset === "office") ctx.fillText("🏢", centerX, centerY);
      else ctx.fillText("✨", centerX, centerY);

      ctx.textBaseline = "alphabetic";
    };

    // Determine target active source URI
    let activeSrc = "";
    if (imageSource === "upload" && uploadedImgUrl) {
      activeSrc = uploadedImgUrl;
    } else if (imageSource === "ai" && aiImgUrl) {
      activeSrc = aiImgUrl;
    }

    if (activeSrc) {
      const imgObj = new Image();
      imgObj.crossOrigin = "anonymous";
      imgObj.src = activeSrc;
      imgObj.onload = () => {
        // Draw image frame rectangle with clipping
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, 12);
        ctx.clip();
        
        // Scale and draw image proportionally (cover style)
        const sWidth = imgObj.width;
        const sHeight = imgObj.height;
        const rRatio = imgW / imgH;
        let sx = 0;
        let sy = 0;
        let sWidthCrop = sWidth;
        let sHeightCrop = sHeight;

        if (sWidth / sHeight > rRatio) {
          sWidthCrop = sHeight * rRatio;
          sx = (sWidth - sWidthCrop) / 2;
        } else {
          sHeightCrop = sWidth / rRatio;
          sy = (sHeight - sHeightCrop) / 2;
        }

        ctx.drawImage(imgObj, sx, sy, sWidthCrop, sHeightCrop, imgX, imgY, imgW, imgH);
        ctx.restore();

        // border stroke
        ctx.strokeStyle = posterTheme === "gold" ? "#fbbf24" : "#ffffff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, 12);
        ctx.stroke();

        drawMetadataAndDownload();
      };
      imgObj.onerror = () => {
        const currentPreset = imageSource === "default" ? getSuggestedPreset(role) : selectedPreset;
        drawPresetOnCanvas(currentPreset);
        drawMetadataAndDownload();
      };
    } else {
      const currentPreset = imageSource === "preset" ? selectedPreset : getSuggestedPreset(role);
      drawPresetOnCanvas(currentPreset);
      drawMetadataAndDownload();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Form Section - Geometric Balance */}
      <div className="lg:col-span-5 bg-white p-6 rounded border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded flex items-center justify-center shrink-0">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">Bộ Lọc Sáng Tạo AI</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Sử dụng mô hình Gemini để kiến tạo đa dạng mẫu bài tuyển dụng</p>
          </div>
        </div>

        <hr className="border-slate-200" />

        {/* Panel dán JD thô và trích xuất tự động */}
        <div className="bg-indigo-50/40 border border-indigo-150 p-4 rounded space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-indigo-600 animate-pulse shrink-0" />
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
              Trích xuất nhanh từ văn bản JD gốc
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Dán văn bản chi tiết công việc hoặc bài tuyển dụng thô của bạn dưới đây, AI sẽ quét tự động và điền nhanh các trường dữ liệu bên dưới chỉ sau 3 giây.
          </p>
          <div className="space-y-2">
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="VD: Cửa hàng Zara Vincom Bà Triệu cần tuyển 3 bạn NV Kho và 2 bạn CSKH làm xoay ca, lương 30k/h, yêu cầu chăm chỉ, nhanh nhẹn..."
              rows={3}
              className="w-full p-2.5 text-xs border border-indigo-100 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 leading-relaxed font-sans"
            />
            <button
              type="button"
              onClick={handleParseJd}
              disabled={parsingJd || !jdText.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs uppercase tracking-wide"
            >
              {parsingJd ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Đang phân tích & trích xuất dữ liệu...
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  Phân tích & Tự động điền thông tin
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Briefcase size={12} /> Vị trí tuyển dụng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="VD: Thực Tập Sinh Thiết Kế Figma..."
              className="w-full px-3 py-2 text-xs border border-slate-250 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <MessageSquare size={12} /> Tên Doanh Nghiệp / Nhãn Hàng
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Bloom Fashion Store..."
              className="w-full px-3 py-2 text-xs border border-slate-250 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <DollarSign size={12} /> Lương & Phúc Lợi
              </label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="VD: 25k/giờ + Doanh số..."
                className="w-full px-3 py-2 text-xs border border-slate-250 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <MapPin size={12} /> Khu Vực Làm Việc
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="VD: TP. Hồ Chí Minh..."
                className="w-full px-3 py-2 text-xs border border-slate-250 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">Mô Tả Đầu Việc Chính</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Tư vấn sản phẩm, thanh toán và kiểm kê..."
              className="w-full px-3 py-2 text-xs border border-slate-250 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">Yêu Cầu Từ Ứng Viên</label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={2}
              placeholder="Chăm chỉ, nhanh nhẹn, ưu tiên xoay ca tốt..."
              className="w-full px-3 py-2 text-xs border border-slate-250 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Phone size={12} /> Kênh Nhận CV / SĐT
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="SĐT/Zalo: 098... hoặc Inbox"
                className="w-full px-3 py-2 text-xs border border-slate-250 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">Tông Giọng Sáng Tạo</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-250 rounded focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white focus:outline-none font-medium"
              >
                <option value="Trẻ trung, năng động">Trẻ trung, năng động (Zalo/FB)</option>
                <option value="Chuyên nghiệp, tin cậy">Chuyên nghiệp, tin cậy (LinkedIn)</option>
                <option value="Hài hước, hài hước, tạo tò mò">Kích thích, tạo tò mò</option>
                <option value="Ngắn gọn, trực quan">Tối giản, gạch đầu dòng</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 mt-2 bg-indigo-600 hover:bg-indigo-755 text-white font-bold py-2.5 px-4 rounded transition-all cursor-pointer shadow-sm"
          >
            {loading ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                Vui lòng đợi vài giây...
              </>
            ) : (
              <>
                <Sparkles size={13} />
                Tạo Bài Tuyển Dụng & Ghi Nhận
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Output Result Section */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {loading ? (
          <div className="bg-white p-8 rounded border border-slate-200 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider mb-1">Mã Hóa Bản Nháp Mới...</h3>
            <p className="text-slate-500 text-xs max-w-sm leading-relaxed">Hệ thống đang tinh chế 3 định dạng ngôn từ khác biệt cùng bộ từ vựng tìm kiếm nhóm trên Facebook hiệu quả nhất.</p>
          </div>
        ) : generatedPosts.length > 0 ? (
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            {/* Produced Texts container */}
            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-950 text-sm mb-1 flex items-center gap-2 uppercase tracking-wide">
                <Sparkles size={16} className="text-indigo-500" />
                Bộ Sản Phẩm Đăng Tin Đã Hoàn Thiện
              </h3>
              <p className="text-xs text-slate-500 mb-4">Nhấp chọn định dạng phong cách tương ứng để sao chép mẫu bài soạn sẵn:</p>

              {/* Internal tab headers */}
              <div className="flex border-b border-slate-200 mb-4 overflow-x-auto gap-2">
                {generatedPosts.map((post, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    className={`pb-2.5 px-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                      activeTab === idx
                        ? "border-indigo-600 text-indigo-650"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {post.style}
                  </button>
                ))}
              </div>

              {/* Target Tab Body Content */}
              <div className="relative bg-slate-50 p-4 rounded border border-slate-200 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[350px] overflow-y-auto">
                {generatedPosts[activeTab]?.content}
                
                <button
                  onClick={() => handleCopy(generatedPosts[activeTab]?.content, activeTab)}
                  className="absolute top-2 right-2 p-2 bg-white hover:bg-slate-50 rounded border border-slate-200 text-slate-500 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1"
                  title="Sao chép bài đăng"
                >
                  {copiedIndex === activeTab ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-sans font-bold text-[10px]">
                      <Check size={12} /> Đã sao chép!
                    </span>
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            </div>

            {/* Poster Designer and AI Graphic Generator */}
            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-950 text-sm flex items-center gap-2 uppercase tracking-wide">
                    <Palette size={16} className="text-indigo-600" />
                    Bộ Thiết Kế Poster Tuyển Dụng AI
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Xuất ngay hình ảnh truyền thông đẹp mắt để đăng Zalo, nhóm Facebook cùng bài viết.</p>
                </div>
                
                {/* Theme Controls */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 hidden sm:inline">Chủ đề:</span>
                  {[
                    { id: "emerald", label: "Spa Lá", bg: "bg-emerald-700" },
                    { id: "royal", label: "Sóng Nước", bg: "bg-blue-800" },
                    { id: "lavender", label: "Oải Hương", bg: "bg-purple-700" },
                    { id: "gold", label: "Hoàng Gia", bg: "bg-neutral-800 border border-amber-500" },
                    { id: "charcoal", label: "Cổ Điển", bg: "bg-slate-700" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setPosterTheme(t.id)}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-all flex items-center justify-center ${t.bg} ${
                        posterTheme === t.id ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      title={t.label}
                    >
                      {posterTheme === t.id && <Check size={11} className="text-white font-bold" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* 1. Real-time dynamic SVG/CSS Poster Preview */}
                <div className="md:col-span-7 flex justify-center">
                  <div 
                    id="recruitment-poster-preview"
                    className={`w-full max-w-[340px] aspect-square rounded-lg p-5 border-4 shadow-md font-sans relative flex flex-col justify-between overflow-hidden select-none transition-all duration-300 ${
                      posterTheme === "emerald" 
                        ? "bg-gradient-to-br from-emerald-800 to-emerald-950 text-emerald-50 border-emerald-500" 
                        : posterTheme === "royal"
                        ? "bg-gradient-to-br from-blue-900 to-slate-900 text-blue-50 border-blue-500"
                        : posterTheme === "lavender"
                        ? "bg-gradient-to-br from-purple-900 to-purple-980 text-purple-50 border-purple-500"
                        : posterTheme === "gold"
                        ? "bg-gradient-to-br from-neutral-800 to-neutral-950 text-amber-100 border-amber-600"
                        : "bg-gradient-to-br from-slate-700 to-slate-900 text-slate-50 border-slate-600"
                    }`}
                  >
                    {/* Inner bracket frame */}
                    <div className="absolute inset-2.5 border border-white/10 pointer-events-none rounded"></div>

                    {/* Central Image Placeholder or Custom/Preset Graphic */}
                    <div className="relative flex justify-center items-center my-1.5">
                       <div className="w-[260px] h-[150px] rounded-lg border-2 border-white/20 overflow-hidden flex items-center justify-center bg-black/10 shadow-inner relative">
                         {imageSource === "upload" ? (
                           uploadedImgUrl ? (
                             <img 
                               src={uploadedImgUrl} 
                               alt="Custom Brand Logo" 
                               className="w-full h-full object-cover" 
                             />
                           ) : (
                             <div className="text-center p-2 text-white/40">
                               <Upload size={16} className="text-white/60 mx-auto mb-1" />
                               <span className="text-[7px] text-slate-300 block leading-tight">Chưa tải ảnh lên</span>
                               <span className="text-[6px] text-slate-400 block">Chọn hoặc thả ảnh bên</span>
                             </div>
                           )
                         ) : imageSource === "ai" ? (
                           aiImgUrl ? (
                             <img 
                               src={aiImgUrl} 
                               alt="AI Generated Illustration"
                               className="w-full h-full object-cover animate-fade-in" 
                             />
                           ) : (
                             <div className="text-center p-2 text-white/40">
                               <Sparkles size={16} className="text-amber-200 mx-auto mb-1 animate-pulse" />
                               <span className="text-[7px] text-slate-300 block leading-tight">Chưa tạo ảnh AI</span>
                               <span className="text-[6px] text-slate-400 block">Chọn vẽ tranh AI ở bên</span>
                             </div>
                           )
                         ) : (
                           // Preset Mode
                           (() => {
                             const pr = selectedPreset || getSuggestedPreset(role);
                             return (
                               <div className={`w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br ${
                                 pr === "spa"
                                   ? "from-emerald-400 to-emerald-700"
                                   : pr === "tech"
                                   ? "from-blue-400 to-blue-700"
                                   : pr === "sales"
                                   ? "from-pink-400 to-pink-700"
                                   : pr === "office"
                                   ? "from-amber-400 to-amber-700"
                                   : "from-purple-400 to-purple-700"
                               }`}>
                                 {pr === "spa" ? "🌿" : pr === "tech" ? "💻" : pr === "sales" ? "📈" : pr === "office" ? "🏢" : "✨"}
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>
  
                      {/* Body Info */}
                      <div className="space-y-1 relative z-10 px-1 text-[10px] font-medium text-slate-200">
                        <p className="flex items-center gap-1.5"><span className="opacity-100">🏢</span> <strong>Đơn vị:</strong> <span className="text-white">{company || "Spa / Đơn vị tuyển dụng"}</span></p>
                        <p className="flex items-center gap-1.5"><span className="opacity-100">💵</span> <strong>Quyền lợi:</strong> <span className="text-white">{salary || "Thỏa thuận hấp dẫn"}</span></p>
                        <p className="flex items-center gap-1.5"><span className="opacity-100">📍</span> <strong>Khu vực:</strong> <span className="text-white">{location || "Toàn quốc / Remote"}</span></p>
                      </div>
  
                      {/* Action footer phone panel */}
                      <div className={`mt-2 py-1.5 px-3 rounded-md text-center text-[10px] font-bold border ${
                        posterTheme === "gold" 
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-200" 
                          : "bg-indigo-600/10 border-indigo-600/20 text-indigo-300"
                      }`}>
                        📞 Liên hệ: <span className="text-white underline">{contactInfo || "Inbox trực tiếp bài đăng"}</span>
                      </div>
                    </div>
                  </div>
  
                  {/* 2. Interactive action buttons */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Tùy Chọn Ảnh Minh Họa</h4>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Linh hoạt lựa chọn nguồn ảnh minh họa để dán lên poster tuyển dụng:
                      </p>
                    </div>
  
                    {/* Tap Choose Image Source */}
                    <div className="bg-slate-50 p-1 rounded-lg border border-slate-250 flex gap-1">
                      {[
                        { id: "preset", label: "Ảnh Đồ Họa Mẫu" },
                        { id: "upload", label: "Tải Ảnh Lên" },
                        { id: "ai", label: "Vẽ Ảnh AI" }
                      ].map((src) => (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => setImageSource(src.id as any)}
                          className={`flex-1 py-1.5 px-0.5 rounded text-center text-[10px] font-extrabold transition-all cursor-pointer ${
                            imageSource === src.id
                              ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/60"
                          }`}
                        >
                          {src.label}
                        </button>
                      ))}
                    </div>
 
                   {/* Dynamic Content based on selected Image Source */}
                   {imageSource === "preset" && (
                     <div className="space-y-3 bg-slate-50/50 p-3 rounded border border-slate-150 transition-all duration-200 animate-slideUp">
                       <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-2">Kho Minh Họa Ngành Nghề</label>
                       <div className="grid grid-cols-2 gap-2">
                         {[
                           { id: "spa", label: "🌿 Spa / Trị liệu" },
                           { id: "tech", label: "💻 Kỹ thuật / IT" },
                           { id: "sales", label: "📈 Bán hàng / Sale" },
                           { id: "office", label: "🏢 Văn phòng / HR" },
                           { id: "general", label: "✨ Linh hoạt / Khác" }
                         ].map((pres) => (
                           <button
                             key={pres.id}
                             type="button"
                             onClick={() => setSelectedPreset(pres.id as any)}
                             className={`p-2 rounded text-left text-xs transition-all border font-medium flex items-center justify-between cursor-pointer ${
                               selectedPreset === pres.id
                                 ? "bg-indigo-50 border-indigo-300 text-indigo-800 font-bold"
                                 : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50/80"
                             }`}
                           >
                             <span>{pres.label}</span>
                             {selectedPreset === pres.id && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                           </button>
                         ))}
                       </div>
                       <p className="text-[9px] text-slate-400 italic">Mẹo: Hệ thống tự động nhận diện từ khóa đề xuất ảnh minh họa tương đồng ngành nghề khi vai trò trống đổi!</p>
                     </div>
                   )}
 
                   {imageSource === "upload" && (
                     <div className="space-y-3 bg-slate-50/50 p-3 rounded border border-slate-150 transition-all duration-200 animate-slideUp">
                       <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-2">Tải Logo / Ảnh Cá Nhân</label>
                       
                       {uploadedImgUrl ? (
                         <div className="space-y-2">
                           <div className="relative w-16 h-16 rounded border overflow-hidden bg-slate-100 mx-auto">
                             <img src={uploadedImgUrl} alt="Preview" className="w-full h-full object-cover" />
                           </div>
                           <div className="text-center">
                             <button
                               type="button"
                               onClick={() => setUploadedImgUrl(null)}
                               className="text-[10px] text-rose-600 hover:underline font-bold"
                             >
                               Xóa ảnh để tải lại
                             </button>
                           </div>
                         </div>
                       ) : (
                         <div
                           onDragEnter={handleDrag}
                           onDragOver={handleDrag}
                           onDragLeave={handleDrag}
                           onDrop={handleDrop}
                           className={`border-2 border-dashed rounded-lg p-5 text-center transition-all cursor-pointer ${
                             dragActive ? "border-indigo-600 bg-indigo-50/40" : "border-slate-300 bg-white hover:bg-slate-50"
                           }`}
                           onClick={() => document.getElementById("hidden-file-input")?.click()}
                         >
                           <Upload size={22} className="text-slate-400 mx-auto mb-2 animate-bounce" />
                           <p className="text-[11px] font-bold text-slate-700">Kéo thả hoặc nhấp chọn ảnh logo</p>
                           <p className="text-[9px] text-slate-400 mt-1">Định dạng JPG, PNG, GIF... tự động bo góc phù hợp</p>
                           <input
                             id="hidden-file-input"
                             type="file"
                             accept="image/*"
                             className="hidden"
                             onChange={(e) => {
                               if (e.target.files && e.target.files[0]) {
                                 handleFileUpload(e.target.files[0]);
                                }
                             }}
                           />
                         </div>
                       )}
                     </div>
                   )}

                   {imageSource === "ai" && (
                     <div className="space-y-3 bg-slate-50/50 p-3 rounded border border-slate-150 transition-all duration-200 animate-slideUp">
                       <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Trí Tuệ Nhân Tạo Sinh Ảnh</label>
                       <p className="text-[10px] text-slate-500 leading-normal">
                         Mô hình <strong>gemini-2.5-flash-image</strong> sẽ tự động nhận diện từ khóa tuyển dụng <strong>&quot;{role}&quot;</strong> để vẽ ảnh minh họa chất lượng cao phù hợp không mang văn bản lỗi.
                       </p>
                       
                       {aiImgUrl ? (
                         <div className="border border-slate-200 rounded p-2 bg-white flex items-center gap-3 animate-slideUp">
                           <div className="relative w-14 h-14 rounded border overflow-hidden bg-slate-100 flex-shrink-0">
                             <img src={aiImgUrl} alt="AI Generated" className="w-full h-full object-cover" />
                           </div>
                           <div className="text-left">
                             <p className="text-[10px] font-bold text-slate-700">Đã vẽ thành công!</p>
                             <p className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5 mt-0.5">✔ Đang dán trên poster tuyển dụng</p>
                             <button
                               type="button"
                               onClick={() => setAiImgUrl(null)}
                               className="text-[10px] text-rose-600 hover:underline font-bold mt-1 block font-sans"
                             >
                               Xóa tranh để vẽ lại
                             </button>
                           </div>
                         </div>
                       ) : (
                         <div className="text-center p-4 bg-white rounded border border-slate-200/60 flex flex-col justify-center items-center">
                           <ImageIcon size={22} className="text-purple-400 mb-1" />
                           <p className="text-[10px] font-bold text-slate-600">Chưa có tranh minh họa AI nào</p>
                           <p className="text-[9px] text-slate-400">Nhấp nút dưới để kích hoạt vẽ tranh bằng Gemini.</p>
                         </div>
                       )}

                       <button
                         type="button"
                         onClick={handleGeneratePoster}
                         disabled={generatingPoster}
                         className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold py-2 px-3 rounded text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                       >
                         {generatingPoster ? (
                           <>
                             <RefreshCw size={12} className="animate-spin" />
                             Mô hình AI đang vẽ minh họa...
                           </>
                         ) : (
                           <>
                             <Sparkles size={12} className="text-amber-200" />
                             {aiImgUrl ? "Vẽ lại tranh minh họa AI mới" : "Vẽ tranh minh họa AI"}
                           </>
                         )}
                       </button>

                       {posterError && (
                         <div className="p-2.5 bg-red-50 text-red-700 text-[10px] rounded border border-red-200 flex items-start gap-1.5 animate-slideUp">
                           <AlertCircle size={13} className="shrink-0 mt-0.5" />
                           <span>{posterError}</span>
                         </div>
                       )}
                     </div>
                   )}
 
                   <button
                     onClick={handleDownloadPoster}
                     className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 px-3 rounded text-xs transition-all cursor-pointer shadow-md"
                   >
                     <Download size={13} />
                     Tải Xuất Poster PNG
                   </button>
 
                   <div className="p-2.5 bg-indigo-50/40 rounded border border-indigo-100 text-indigo-900 text-[10px] leading-relaxed">
                     🌟 <strong>Mẹo nhỏ:</strong> Tệp hình ảnh tải về có độ phân giải gốc <strong>800x800px</strong> cực sắc nét, lý tưởng gửi qua Zalo, Messenger hoặc đăng nhóm tin tiện lợi!
                   </div>
                 </div>
 
               </div>
             </div>
 
             {/* Smart Suggested Search Groups Container */}
             {generatedPosts.length > 0 && (
               <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-950 text-xs mb-1 flex items-center gap-2 uppercase tracking-wide">
                   <Search size={16} className="text-indigo-500" />
                   Hệ Thống Từ Khóa &amp; Gợi Ý Kênh Tuyển Dụng
                 </h3>
                 <div className="hidden bg-slate-100 p-1 mb-4 rounded-lg border border-slate-200 flex flex-wrap gap-1 select-none">
                    <button
                      type="button"
                      onClick={() => setGroupSectionTab("matched")}
                      className={`flex-1 py-1.5 px-3 rounded text-[10px] font-extrabold transition-all cursor-pointer text-center ${
                        groupSectionTab === "matched"
                          ? "bg-white text-indigo-700 shadow-xs border border-slate-250 font-black"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      📋 Nhóm Đã Lưu KTS ({savedGroups.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupSectionTab("keywords")}
                      className={`flex-1 py-1.5 px-3 rounded text-[10px] font-extrabold transition-all cursor-pointer text-center ${
                        groupSectionTab === "keywords"
                          ? "bg-white text-indigo-700 shadow-xs border border-slate-250 font-black"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      🔍 Từ Khóa Tìm Phù Hợp
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupSectionTab("add")}
                      className={`flex-1 py-1.5 px-3 rounded text-[10px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        groupSectionTab === "add"
                          ? "bg-white text-indigo-700 shadow-xs border border-slate-250 font-black"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Plus size={11} /> Thêm Kênh Mới
                    </button>
                  </div>

                  {groupSectionTab === "matched" && (() => {
                    const matches = getMatchedSavedGroups();
                    const hasMatches = matches.length > 0;
                    const itemsToRender = hasMatches ? matches : savedGroups;
                    
                    return (
                      <div className="space-y-3 pb-2 animate-slideUp">
                        {!hasMatches && savedGroups.length > 0 && (
                          <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded text-amber-900 text-[10px] leading-relaxed">
                            ⚠️ Chưa có nhóm lưu trữ nào trùng khớp cụ thể với vế vai trò <strong>&quot;{role}&quot;</strong>. 
                            Dưới đây là danh sách toàn bộ các nhóm tuyển dụng hiện có của bạn để tham khảo:
                          </div>
                        )}
                        
                        {savedGroups.length === 0 ? (
                          <div className="text-center py-6 bg-slate-50/50 border border-dashed border-slate-250 rounded">
                            <Briefcase size={20} className="text-slate-400 mx-auto mb-1" />
                            <h4 className="font-bold text-slate-800 text-[11px]">Kho nhóm đã lưu rỗng</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">Vào tab &quot;Thêm Kênh Mới&quot; để đồng bộ hội nhóm ngay!</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {itemsToRender.map((grp) => (
                              <a
                                key={grp.id}
                                href={grp.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group p-3 bg-slate-50/50 hover:bg-indigo-50/20 border border-slate-200 hover:border-indigo-250 rounded transition-all duration-150 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex justify-between items-start gap-1">
                                    <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-150 rounded text-[9px] font-extrabold tracking-wider uppercase">
                                      {grp.niche}
                                    </span>
                                    <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                      <span className="text-[10px] text-amber-400 font-extrabold">★ {grp.rating || 5}</span>
                                      <ExternalLink size={10} className="text-slate-400 group-hover:text-indigo-700 transition" />
                                    </div>
                                  </div>
                                  <h4 className="font-extrabold text-slate-900 text-xs mt-2 group-hover:text-indigo-950 transition-all">
                                    {grp.name}
                                  </h4>
                                  {grp.notes && (
                                    <p className="text-[10px] text-slate-500 mt-1 pb-1 line-clamp-2 leading-relaxed">
                                      &quot;{grp.notes}&quot;
                                    </p>
                                  )}
                                </div>
                                <div className="text-[10px] font-bold text-indigo-700 mt-2.5 pt-1.5 border-t border-slate-100 flex items-center gap-1 h-3.5">
                                  Truy cập kênh đăng bài <span>→</span>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {groupSectionTab === "add" && (
                    <div className="bg-slate-55 p-4 rounded border border-slate-200 space-y-3 pb-4 animate-slideUp">
                      <div className="border-b border-slate-200 pb-1 border-slate-150">
                        <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">Điền Thông Tin Cho Kênh Đăng Tin Mới</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Dữ liệu sẽ được lưu trữ đồng bộ trực tiếp vào trang Google Sheets</p>
                      </div>
                      
                      <form onSubmit={handleAddNewGroup} className="space-y-2.5 font-sans">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-600 uppercase tracking-widest mb-1">Tên nhóm / Kênh</label>
                            <input
                              type="text"
                              required
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              placeholder="Hội KTV Spa Mi Nail..."
                              className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-600 uppercase tracking-widest mb-1">Đường dẫn liên kết URL</label>
                            <input
                              type="url"
                              required
                              value={newGroupUrl}
                              onChange={(e) => setNewGroupUrl(e.target.value)}
                              placeholder="https://facebook.com/groups/..."
                              className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-600 uppercase tracking-widest mb-1">Ngành nghề</label>
                            <select
                              value={newGroupNiche}
                              onChange={(e) => setNewGroupNiche(e.target.value)}
                              className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-medium cursor-pointer"
                            >
                              <option value="Spa / Trị liệu">Spa / Trị liệu</option>
                              <option value="Công nghệ / IT">Công nghệ / IT</option>
                              <option value="Bán hàng / Sale">Bán hàng / Sale</option>
                              <option value="Văn phòng / HR">Văn phòng / HR</option>
                              <option value="Sinh viên / Việc làm thêm">Sinh viên / Việc làm thêm</option>
                              <option value="Khác">Phân khúc Khác</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-600 uppercase tracking-widest mb-1">Tương tác</label>
                            <div className="flex gap-1.5 pt-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setNewGroupRating(star)}
                                  className={`text-base focus:outline-none cursor-pointer ${
                                    newGroupRating >= star ? "text-amber-500 scale-105" : "text-slate-300 hover:text-amber-300"
                                  }`}
                                >
                                  ★
                                </button>
                              ))}
                              <span className="text-[10px] font-bold text-slate-500 self-center">({newGroupRating} sao)</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-600 uppercase tracking-widest mb-1">Ghi chú cụ thể</label>
                          <textarea
                            value={newGroupNotes}
                            onChange={(e) => setNewGroupNotes(e.target.value)}
                            placeholder="Duyệt bài nhanh, nhiều nhân lực chất lượng..."
                            rows={1}
                            className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                          />
                        </div>

                        {addGroupError && (
                          <div className="p-1.5 bg-red-50 text-red-700 text-[10px] rounded border border-red-200">
                            {addGroupError}
                          </div>
                        )}

                        {addGroupSuccess && (
                          <div className="p-1.5 bg-emerald-50 text-emerald-800 text-[10px] rounded border border-emerald-250 font-bold">
                            ✔ Đồng bộ dữ liệu mới lên Google Sheets thành công!
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isAddingGroup}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] py-1.5 rounded transition shadow-sm cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                        >
                          {isAddingGroup ? (
                            <>
                              <RefreshCw size={10} className="animate-spin" /> Đang đồng bộ...
                            </>
                          ) : (
                            <>
                              <Plus size={10} /> Đăng Ký Lưu Vào Google Sheets
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {groupSectionTab === "keywords" && (
 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                   {suggestedKeywords.map((item, idx) => {
                     const cleanKeyword = item.keyword.replace(/["'“”]/g, "").trim();
                     return (
                       <a
                         key={idx}
                         href={`https://www.facebook.com/groups/search/?q=${encodeURIComponent(cleanKeyword)}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="group p-4 bg-slate-50/50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 rounded transition-all duration-150 flex flex-col justify-between"
                       >
                         <div>
                           <div className="flex justify-between items-start gap-1">
                             <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold font-mono tracking-wider uppercase">
                               {item.category}
                             </span>
                             <ExternalLink size={12} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                           </div>
                           <h4 className="font-bold text-slate-900 text-xs mt-3 group-hover:text-indigo-800 transition-all">
                             &quot;{cleanKeyword}&quot;
                           </h4>
                           <p className="text-[10px] text-slate-500 mt-1 lines-2 leading-relaxed">
                             {item.explanation}
                           </p>
                         </div>
                         <div className="text-[10px] font-bold text-indigo-600 mt-3 flex items-center gap-1 h-4">
                           Tìm kiếm tức thì <span>→</span>
                         </div>
                       </a>
                     );
                   })}
                 </div>
                  )}
               </div>
             )}
          </div>
        ) : (
          <div className="bg-white p-12 rounded border border-slate-200 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded border border-dashed border-slate-300 flex items-center justify-center mb-4">
              <Sparkles size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1">Bản nháp rỗng</h3>
            <p className="text-slate-500 text-[11px] max-w-xs leading-relaxed">Điền thông tư việc làm tuyển ứng viên ở mẫu bên cạnh, sau đó nhấp &quot;Tạo Bài Tuyển Dụng&quot; để soạn bài và gợi ý nhóm tuyển dụng tự động.</p>
          </div>
        )}
      </div>
    </div>
  );
}
