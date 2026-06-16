import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini client to prevent server crash if key is missing on startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST API for parsing raw JD text into separate structured fields via Gemini AI
app.post("/api/gemini/parse-jd", async (req, res) => {
  try {
    const { jdText } = req.body;
    if (!jdText || !jdText.trim()) {
      res.status(400).json({ error: "Vui lòng nhập nội dung JD gốc." });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `Bạn là một chuyên gia nhân sự chuyên nghiệp tại Việt Nam. Hãy đọc kĩ văn bản mô tả công việc (JD) sau và phân tích, trích xuất thông tin một cách chuẩn xác nhất:

VĂN BẢN JD GỐC:
"""
${jdText}
"""

Hãy điền thông tin trích xuất súc tích bằng tiếng Việt vào đúng các trường tương ứng:
1. "role": Chức danh công việc / Vị trí cần tuyển (vd: Nhân viên điều phối, Cộng tác viên thiết kế).
2. "company": Tên công ty, nhãn hàng hoặc đại lý tuyển dụng (nếu không có tên cụ thể, ghi "Đang cập nhật" hoặc "Ẩn danh").
3. "description": Các đầu việc chính cần làm (Khoảng 1-3 gạch đầu dòng ngắn gọn và dễ hiểu).
4. "requirements": Yêu cầu ứng tuyển (ví dụ: trình độ, độ tuổi, kinh nghiệm hoặc kỹ năng mềm).
5. "salary": Mức thu nhập, trợ cấp, thưởng (vd: 25.000đ/giờ or 8.000.000đ - 10.000.000đ/tháng).
6. "location": Địa chỉ làm việc hoặc khu vực (vd: Quận Gò Vấp, Hà Nội, hoặc Làm việc từ xa).
7. "contactInfo": Phương thức liên lạc chính (Số điện thoại, Zalo, Email, link tuyển dụng hoặc inbox).

Trích xuất thông tin sát với thực tế trong JD đầu vào nhất có thể, tránh suy diễn hư cấu sai sự thật.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            role: { type: Type.STRING },
            company: { type: Type.STRING },
            description: { type: Type.STRING },
            requirements: { type: Type.STRING },
            salary: { type: Type.STRING },
            location: { type: Type.STRING },
            contactInfo: { type: Type.STRING },
          },
          required: ["role", "company", "description", "requirements", "salary", "location", "contactInfo"],
        }
      }
    });

    const responseText = response.text || "{}";
    const result = JSON.parse(responseText.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Lỗi khi kết nối Gemini API trích xuất JD:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ khi trích xuất thông tin mô tả tuyển dụng." });
  }
});

// REST API for recruitment content generation using Gemini AI
app.post("/api/gemini/generate-content", async (req, res) => {
  try {
    const { role, company, description, requirements, salary, location, contactInfo, tone } = req.body;

    if (!role) {
       res.status(400).json({ error: "Vui lòng nhập vị trí tuyển dụng." });
       return;
    }

    const ai = getGeminiClient();
    
    const prompt = `Bạn là một chuyên gia tuyển dụng (HR Copywriter) chuyên nghiệp tại Việt Nam. 
Hãy viết 3 mẫu tin tuyển dụng hấp dẫn khác nhau bằng tiếng Việt cho vị trí sau:
- Vị trí: ${role}
- Công ty/Dự án: ${company || "Không nêu tên"}
- Mô tả công việc: ${description || "Không có mô tả chi tiết"}
- Yêu cầu ứng viên: ${requirements || "Chăm chỉ, chịu khó, đam mê học hỏi"}
- Lương & Quyền lợi: ${salary || "Thỏa thuận hấp dẫn"}
- Địa điểm làm việc: ${location || "Toàn quốc / Remote"}
- Cách thức liên hệ / link đăng ký: ${contactInfo || "Liên hệ qua tin nhắn hoặc số điện thoại trong bài viết"}

Yêu cầu cụ thể cho 3 mẫu tin tuyển dụng:
- Tông giọng chung: ${tone || "Chuyên nghiệp, tin cậy, trẻ trung"}

Mẫu 1: Phong cách mạng xã hội (Facebook, LinkedIn) đầy đủ, cấu trúc rõ ràng, sử dụng các icon (emoji) khéo léo để phân tách các mục chính, có tiêu đề giật gân, khơi dậy động lực của ứng viên và kèm hashtag tuyển dụng phù hợp ở cuối.
Mẫu 2: Phong cách kể chuyện (Story/Conversational style) nhẹ nhàng, thân mật như một lời khuyên hoặc chia sẻ cơ hội nghề nghiệp cực tốt từ một người bạn/đồng nghiệp, ít khuôn mẫu hành chính nhưng vẫn đầy đủ thông tin cốt lõi.
Mẫu 3: Phong cách "Siêu ngắn gọn" (Bullet Points & Direct), tập trung vào các điểm mấu chốt nhất (Role - Lợi ích - Nhấp vào để ứng tuyển), thích hợp để copy-paste đi spam cmt Facebook hoặc đăng tin nhanh trên các hội nhóm.

CẢI THIỆN HASHTAG ĐẶC BIỆT:
Ở cuối mỗi mẫu tin, bạn BẮT BUỘC phải tạo riêng một khối chứa từ 10 đến 15 hashtag tuyển dụng cực kỳ chuyên nghiệp và lan tỏa cao, tối ưu thuật toán tìm kiếm trên Facebook/Zalo/LinkedIn. Các hashtag bao gồm:
1. Hashtag vị trí công việc (có dấu và không dấu, ví dụ: #KỹThuậtViênTrịLiệu #KyThuatVienTriLieu #KTVTriLieu).
2. Hashtag khu vực làm việc (ví dụ: #TuyendungHaNoi #VieclamHCM).
3. Hashtag thương hiệu, đặc thù ngành, phúc lợi (ví dụ: #TuyendungSpa #VậtLýTrịLiệu #Lương_Thưởng_Hấp_Dẫn).
4. Các hashtag tìm việc phổ biến (ví dụ: #Tuyendung #Timviecnhanh #Vieclam24h).
Phân tách các hashtag bằng dấu cách hoặc gạch đứng thanh nhã để tăng tương tác tối đa.

Hãy trả về kết quả dưới dạng cấu trúc JSON chính xác tuyệt đối như sau:
{
  "options": [
    {
      "style": "Mạng xã hội & Emojis",
      "content": "Nội Dung mẫu 1 ở đây..."
    },
    {
      "style": "Kể chuyện & Chia sẻ thân mật",
      "content": "Nội Dung mẫu 2 ở đây..."
    },
    {
      "style": "Siêu ngắn gọn & Đi thẳng vào vấn đề",
      "content": "Nội Dung mẫu 3 ở đây..."
    }
  ]
}

Chú ý: Trả về một khối JSON thuần túy mà không kèm theo markdown tag \`\`\`json ở đầu và cuối hoặc bất cứ ký tự bình luận nào thừa ngoài JSON, để có thể parse được luôn qua JSON.parse().`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "{}";
    const result = JSON.parse(responseText.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Lỗi khi kết nối Gemini API:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ khi xử lý bằng AI." });
  }
});

// REST API for Facebook, Zalo and general groups suggestions
app.post("/api/gemini/suggest-groups", async (req, res) => {
  try {
    const { role, location } = req.body;

    if (!role) {
       res.status(400).json({ error: "Vui lòng nhập vị trí tuyển dụng để gợi ý hội nhóm." });
       return;
    }

    const ai = getGeminiClient();

    const prompt = `Dựa trên thông tin vị trí công việc sau:
- Vị trí: ${role}
- Địa điểm: ${location || "Toàn quốc / Hồ Chí Minh / Hà Nội"}

Hãy gợi ý khoảng 5-6 từ khóa tìm kiếm hội nhóm trên Facebook cực kỳ chất lượng và trực diện để cộng tác viên viết bài tuyển dụng tìm kiếm ứng viên thích hợp.
Đồng thời, phân loại các hội nhóm này theo các nhóm đối tượng (vd: Nhóm Sinh viên tìm việc làm thêm, Nhóm IT chuyên nghiệp, Nhóm cộng đồng khu vực, v.v.).

Yêu Cầu Cực Kỳ Quan Trọng về trường "keyword":
- Trường "keyword" phải là chuỗi từ khóa tìm kiếm cực kỳ ngắn gọn, sạch sẽ từ 2 đến 4 từ tiếng Việt.
- Ví dụ tốt: "Tuyển dụng Spa HCM", "Tìm việc làm Quận 1", "Việc làm KTV Spa", "Hội Spa Sài Gòn", "Tìm việc Spa Hà Nội".
- TUYỆT ĐỐI KHÔNG chứa dấu ngoặc, dấu kép, không chứa từ bổ nghĩa dài dòng, không có chữ "Từ khóa..." hay dấu chấm câu, bởi vì từ khóa này sẽ được đưa thẳng vào link tìm kiếm hội nhóm của Facebook. Nếu từ khóa dài dòng hoặc chứa ký tự đặc biệt, Facebook sẽ trả về kết quả rỗng và báo lỗi.

Hãy trả về kết quả dưới dạng cấu trúc JSON chính xác tuyệt đối như sau:
{
  "keywords": [
    {
      "keyword": "từ khóa tìm nhóm ngắn gọn (ví dụ: Tuyển dụng Spa HCM)",
      "explanation": "bản chất của nhóm này và tại sao CTV nên đăng ở đây",
      "category": "Nhóm Chuyên Môn / Nhóm Bán Thời Gian / v.v."
    }
  ]
}

Chú ý: Trả về một khối JSON thuần túy không kèm markdown tag \`\`\`json hay bất cứ ký tự nào ngoài cấu trúc JSON, để có thể parse được ngay lập tức. Các từ khóa gợi ý nên bám sát thực tế tìm kiếm việc làm tại Việt Nam.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "{}";
    const result = JSON.parse(responseText.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Lỗi khi kết nối Gemini API gợi ý hội nhóm:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ khi xử lý gợi ý bằng AI." });
  }
});

// REST API for analyzing candidate dataset and providing intelligent feedback
app.post("/api/gemini/analyze-candidates", async (req, res) => {
  try {
    const { candidates } = req.body;
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      res.json({
        summary: "Chưa có đủ số lượng ứng viên trong hệ thống để thực hiện phân tích số liệu nâng cao. Hãy thêm ít nhất 1-2 ứng viên và cập nhật trạng thái của họ.",
        bottlenecks: "Dữ liệu trống hoặc chưa đủ mẫu để định dạng phễu rò rỉ.",
        proposals: "Tích cực chia sẻ bài viết lên các hội nhóm Facebook/Zalo giới thiệu và dán thông tin ứng viên thu được về bảng để kích hoạt mô hình AI phân tích hiệu suất tối ưu."
      });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `Bạn là Giám đốc Tuyển dụng kiêm Chuyên gia Phân tích dữ liệu Nhân sự (HR Analytics Director) cấp cao tại Việt Nam.
Hãy đọc kỹ danh sách hồ sơ ứng viên dưới dạng JSON sau đây:

DANH SÁCH ỨNG VIÊN:
${JSON.stringify(candidates.map(c => ({
  name: c.name,
  role: c.role,
  source: c.source,
  ctvName: c.ctvName,
  status: c.status,
  notes: c.notes
})), null, 2)}

Nhiệm vụ của bạn:
Phân tích sâu sắc và đưa ra báo cáo cố vấn tiếng Việt mang tính hành động cao (actionable insights), tập trung giải quyết các bài toán chuyển đổi thực tế.

Hãy điền phản hồi súc tích vào 3 phần có định dạng JSON sau:
1. "summary": Tóm lược bức tranh sáng sủa nhất (vd: Tổng lượng ứng tuyển, nguồn nào đang kéo CV nhiều nhất, sự đóng góp của cộng tác viên tiêu biểu).
2. "bottlenecks": "Điểm nghẽn rò rỉ" trong phễu tuyển dụng hiện thời (vd: Tỷ lệ ứng viên nộp hồ sơ nhiều nhưng tỷ lệ phỏng vấn hoặc tuyển thực tế có thấp không? Có vị trí nào cực khó tuyển bị ứ đọng không?).
3. "proposals": Giải pháp thông minh đề xuất (Đề xuất thay đổi tiêu chuẩn tin, đổi nguồn hướng mục tiêu như thế nào, và cách tuyển dụng CTV hiệu quả nhất).

Trả về một đối tượng JSON chuẩn xác 100% với cấu trúc:
{
  "summary": "Nội dung tóm lược...",
  "bottlenecks": "Nội dung điểm nghẽn...",
  "proposals": "Nội dung đề xuất..."
}

Chú ý: Chỉ trả về chuỗi JSON thuần, tránh markdown tags \`\`\`json ở đầu và cuối hoặc bất cứ ký tự bình luận nào thừa để hệ thống JSON.parse() phân tách được lập tức.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "{}";
    const result = JSON.parse(responseText.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Lỗi khi kết nối Gemini API phân tích ứng viên:", error);
    res.json({
      summary: "Có lỗi khi phân tích dữ liệu ứng viên bằng mô hình AI. Hãy tải lại trang hoặc thử lại.",
      bottlenecks: "Đường truyền API bận hoặc cấu trúc có lỗi.",
      proposals: "Hãy tiếp tục theo dõi ứng viên thủ công qua bảng báo cáo."
    });
  }
});

// REST API for parsing information from an uploaded/provided CV image or candidate photo
app.post("/api/gemini/analyze-cv-image", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: "Vui lòng chọn hoặc kéo thả tệp hình ảnh hợp lệ." });
      return;
    }

    const ai = getGeminiClient();

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: imageBase64,
      },
    };

    const textPart = {
      text: `Bạn là một chuyên gia nhân sự và trợ lý AI phân tích CV tiếng Việt xuất sắc.
      Hãy đọc kĩ hình ảnh được cung cấp (đây có thể là bản chụp CV, ảnh sơ yếu lý lịch, thông tin cá nhân, hoặc chân dung đi kèm chữ viết).
      Nhiệm vụ của bạn là phân tích và trích xuất/đọc toàn bộ các thông tin cụ thể sau đây và trả về dưới dạng JSON bằng Tiếng Việt:
      
      1. "fullName": Họ và tên của ứng viên (ví dụ: 'Nguyễn Văn A'). Nếu không tìm thấy, để trống "".
      2. "contact": Thông tin liên hệ như số điện thoại, email, địa chỉ, tài khoản cá nhân.
      3. "targetRole": Vị trí/công việc ứng tuyển mong muốn (ví dụ: 'Nhân viên bán hàng', 'Lập trình viên React').
      4. "summary": Tóm tắt ngắn gọn năng lực hoặc định hướng bản thân của ứng viên.
      5. "experience": Các kinh nghiệm làm việc đã có, kể cả làm thêm, bán thời gian, hoạt động ngoại khóa.
      6. "education": Thông tin học vấn, trường học, ngành học, chứng chỉ.
      7. "skills": Danh sách các kĩ năng, chuyên môn nổi bật phân tách bằng dấu phẩy.

      Hãy cố gắng đọc chuẩn xác nhất dựa hoàn toàn vào dữ liệu chữ viết trên ảnh. Tránh suy đoán mơ hồ, không hư cấu các câu chuyện không có thật trong ảnh. Trả về đối tượng JSON đúng cấu trúc bên dưới.`
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            contact: { type: Type.STRING },
            targetRole: { type: Type.STRING },
            summary: { type: Type.STRING },
            experience: { type: Type.STRING },
            education: { type: Type.STRING },
            skills: { type: Type.STRING },
          },
          required: ["fullName", "contact", "targetRole", "summary", "experience", "education", "skills"],
        }
      }
    });

    const responseText = response.text || "{}";
    res.json(JSON.parse(responseText.trim()));
  } catch (error: any) {
    console.error("Lỗi khi phân tích ảnh CV:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ khi xử lý phân tích hình ảnh CV bằng AI." });
  }
});

// REST API for formatting and polishing candidate details into a professional CV
app.post("/api/gemini/generate-cv-polish", async (req, res) => {
  try {
    const { fullName, contact, targetRole, summary, experience, education, skills, tone } = req.body;

    if (!fullName || !fullName.trim()) {
      res.status(400).json({ error: "Họ và tên là bắt buộc để tạo CV." });
      return;
    }

    const ai = getGeminiClient();

    const prompt = `Bạn là một chuyên gia tư vấn viết CV chuyên nghiệp và chuyên viên Nhân sự (Executive Resume Writer) tại Việt Nam.
    Hãy lấy các thông tin cá nhân hiện có dưới đây và viết lại, mài giũa chúng thành một phiên bản CV cực kỳ thu hút nhà tuyển dụng, chuyên nghiệp và có văn phong ấn tượng:

    THÔNG TIN ĐẦU VÀO:
    - Họ và tên: ${fullName}
    - Thông tin liên hệ: ${contact || "Chưa cập nhật"}
    - Vị trí mong muốn: ${targetRole || "Nhân viên ứng tuyển"}
    - Tóm tắt bản thân: ${summary || ""}
    - Kinh nghiệm làm việc: ${experience || ""}
    - Học sinh/Sinh viên & Học lực học vấn: ${education || ""}
    - Kỹ năng cốt lõi: ${skills || ""}
    
    YÊU CẦU ĐÁNH BÓNG:
    - Phong cách ngôn ngữ: ${tone || "Chuyên nghiệp, ấn tượng và tự tin"}
    - "fullName": Chuẩn hóa định dạng viết hoa chuẩn mực.
    - "contact": Trình bày gọn gàng, cách nhau bằng icon lịch sự hoặc dấu gạch đứng.
    - "targetRole": Đổi thành chức danh công việc cụ thể viết hoa nổi bật.
    - "summary": Viết thành một đoạn giới thiệu tóm lược bản thân xuất sắc, làm bật giá trị cá nhân, kỹ năng vượt trội và khao khát cống hiến cho vị trí ${targetRole}.
    - "experience": Hệ thống hóa và chia nhỏ kinh nghiệm thành các gạch đầu dòng rõ ràng, sử dụng các động từ hành động mạnh mẽ, mô tả trách nhiệm và thành tích có định hướng kết quả (VD: thay vị "phục vụ quán ăn" -> "đảm nhận điều phối phục vụ, duy trì tác phong chu đáo làm hài lòng hàng trăm khách hàng/ngày").
    - "education": Tối ưu hóa thông tin học vấn trang nghiêm, mạch lạc.
    - "skills": Trình bày các kỹ năng chuyên môn và kỹ năng mềm một cách khoa học, hiện đại.

    Hãy viết bằng tiếng Việt tự nhiên và trả về một khối JSON chuẩn xác với cấu trúc dưới đây để ứng dụng render hiển thị trực quan:
    {
      "fullName": "Họ và tên đã chuẩn hóa",
      "contact": "Thông tin liên hệ tối ưu",
      "targetRole": "Vị trí ứng tuyển chính thức",
      "summary": "Đoạn mô tả tóm tắt bản thân cực kỳ lôi cuốn, chuyên nghiệp",
      "experience": "Kinh nghiệm làm việc chi tiết được định dạng gạch đầu dòng chuyên sâu",
      "education": "Học vấn & Bằng cấp định dạng mạch lạc",
      "skills": "Kỹ năng tối ưu, phân loại ấn tượng"
    }

    Chú ý: Trả về một khối JSON thuần túy không kèm bất cứ markdown tag hay văn bản thừa nào bên ngoài cấu trúc JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            contact: { type: Type.STRING },
            targetRole: { type: Type.STRING },
            summary: { type: Type.STRING },
            experience: { type: Type.STRING },
            education: { type: Type.STRING },
            skills: { type: Type.STRING },
          },
          required: ["fullName", "contact", "targetRole", "summary", "experience", "education", "skills"],
        }
      }
    });

    const responseText = response.text || "{}";
    res.json(JSON.parse(responseText.trim()));
  } catch (error: any) {
    console.error("Lỗi khi đánh bóng tối ưu CV:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ khi tối ưu hóa bản ghi CV bằng AI." });
  }
});

// REST API for generating a beautiful, textless context-relevant recruitment illustration using Gemini's image generation model
function generateFallbackSvg(role: string, company: string): string {
  const roleLower = role.toLowerCase();
  let bgColor1 = "#0f172a";
  let bgColor2 = "#1e293b";
  let primaryColor = "#6366f1";
  let title = role.toUpperCase();
  let subtitle = company || "Đơn vị tuyển dụng";
  let iconSvg = "";

  if (roleLower.includes("spa") || roleLower.includes("massage") || roleLower.includes("trị liệu") || roleLower.includes("da") || roleLower.includes("nails") || roleLower.includes("thẩm mỹ")) {
    bgColor1 = "#064e3b";
    bgColor2 = "#022c22";
    primaryColor = "#10b981";
    iconSvg = `
      <circle cx="200" cy="180" r="70" fill="none" stroke="#fbbf24" stroke-width="2" opacity="0.3"/>
      <path d="M200 130 C160 180, 200 240, 200 240 C200 240, 240 180, 200 130 Z" fill="#34d399" opacity="0.85"/>
      <path d="M200 150 C180 190, 200 230, 200 230 C200 230, 220 190, 200 150 Z" fill="#fbbf24" opacity="0.6"/>
      <circle cx="200" cy="130" r="8" fill="#fef08a" opacity="0.9"/>
    `;
  } else if (roleLower.includes("lập trình") || roleLower.includes("dev") || roleLower.includes("it") || roleLower.includes("code") || roleLower.includes("web") || roleLower.includes("tech") || roleLower.includes("phần mềm") || roleLower.includes("kỹ thuật")) {
    bgColor1 = "#1e1b4b";
    bgColor2 = "#0f052d";
    primaryColor = "#3b82f6";
    iconSvg = `
      <rect x="120" y="110" width="160" height="110" rx="8" fill="none" stroke="#60a5fa" stroke-width="4"/>
      <line x1="100" y1="225" x2="300" y2="225" stroke="#60a5fa" stroke-width="6" stroke-linecap="round"/>
      <line x1="170" y1="220" x2="180" y2="240" stroke="#3b82f6" stroke-width="4"/>
      <line x1="230" y1="220" x2="220" y2="240" stroke="#3b82f6" stroke-width="4"/>
      <text x="200" y="175" fill="#38bdf8" font-family="monospace" font-size="22" font-weight="bold" text-anchor="middle">&lt;/&gt;</text>
    `;
  } else if (roleLower.includes("sale") || roleLower.includes("bán hàng") || roleLower.includes("tư vấn") || roleLower.includes("kinh doanh") || roleLower.includes("thu ngân") || roleLower.includes("khách hàng")) {
    bgColor1 = "#4c0519";
    bgColor2 = "#881337";
    primaryColor = "#f43f5e";
    iconSvg = `
      <circle cx="200" cy="180" r="50" fill="none" stroke="#fda4af" stroke-width="3" stroke-dasharray="8 4"/>
      <path d="M165 180 L191 206 L235 150" stroke="#fb7185" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <text x="200" y="120" fill="#fecdd3" font-family="sans-serif" font-size="14" font-weight="extrabold" text-anchor="middle" letter-spacing="1">SALES &amp; VIP</text>
    `;
  } else {
    bgColor1 = "#1e293b";
    bgColor2 = "#0f172a";
    primaryColor = "#818cf8";
    iconSvg = `
      <rect x="130" y="125" width="140" height="130" rx="12" fill="none" stroke="#a5b4fc" stroke-width="3"/>
      <circle cx="200" cy="180" r="25" fill="none" stroke="#818cf8" stroke-width="3"/>
      <line x1="200" y1="130" x2="200" y2="150" stroke="#818cf8" stroke-width="3"/>
      <line x1="200" y1="210" x2="200" y2="230" stroke="#818cf8" stroke-width="3"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <defs>
      <linearGradient id="fallbackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgColor1}"/>
        <stop offset="100%" stop-color="${bgColor2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#fallbackGrad)"/>
    <circle cx="200" cy="200" r="180" fill="none" stroke="${primaryColor}" stroke-width="1" opacity="0.15"/>
    <circle cx="200" cy="200" r="150" fill="none" stroke="${primaryColor}" stroke-width="1" opacity="0.1"/>
    ${iconSvg}
    <rect x="50" y="295" width="300" height="60" rx="8" fill="rgba(0, 0, 0, 0.45)" stroke="${primaryColor}" stroke-width="1" opacity="0.9"/>
    <text x="200" y="322" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">${title}</text>
    <text x="200" y="342" fill="#94a3b8" font-family="sans-serif" font-size="10" text-anchor="middle" letter-spacing="1">${subtitle}</text>
  </svg>`.trim();

  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

app.post("/api/gemini/generate-poster", async (req, res) => {
  const { role, company } = req.body;
  if (!role) {
    res.status(400).json({ error: "Vui lòng cung cấp vị trí tuyển dụng." });
    return;
  }

  try {
    const ai = getGeminiClient();

    let detailsPrompt = `A high-quality, professional, modern and contextually relevant recruitment illustration or photo for the role: "${role}"${company ? ` at company: "${company}"` : ""}.
Visual guidelines:
- If the role relates to Spa, massage, skin care, beauty or therapy, depict a warm, clean, friendly, professional female spa therapist/staff member wearing a clean uniform in an elegant, soothing, warmly-lit aesthetic spa room, smiling welcomingly.
- If the role is Tech, IT, office, coding, depict a clean modern office or desk setup with a professional developer or office worker focused, high tech, clean environment.
- If the role is Sales, Retail, customer service, depict a friendly smiling shop assistant or sales advisor helping customers or welcoming guests with a professional warm gesture.
- If the role is manual labor, delivery, transport, students, depict energetic and positive people working productively.
Style options: High-end professional illustration or realistic clean stock photo, modern composition, warm and positive colors, inviting aesthetic. DO NOT generate any text, words, labels or random gibberish letters on the image itself. Frame it beautifully, leaving ample negative space.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: detailsPrompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    let base64Data: string | null = null;
    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Data = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Data) {
      const imageUrl = `data:image/png;base64,${base64Data}`;
      res.json({ imageUrl });
    } else {
      // Fallback if no binary data returned
      console.warn("Lỗi vẽ tranh từ AI (không có part data), chuyển sang ảnh vectơ chất lượng cao.");
      res.json({ imageUrl: generateFallbackSvg(role, company), isFallback: true });
    }

  } catch (error: any) {
    console.log(`[Auto-Recovery] Sử dụng đồ họa minh họa mẫu cho vị trí: ${role}`);
    // Graceful auto-recovery fallback to ensure perfect reliability
    try {
      const fallbackUrl = generateFallbackSvg(role, company);
      res.json({ imageUrl: fallbackUrl, isFallback: true });
    } catch (fallbackError) {
      res.status(500).json({ error: "Lỗi máy chủ khi dùng AI để vẽ tranh minh họa." });
    }
  }
});

// Endpoint for downloading Word Guide Document (.doc format with Word styling compatibility)
app.get("/api/download-guide", (req, res) => {
  res.setHeader("Content-Type", "application/msword");
  res.setHeader("Content-Disposition", "attachment; filename=HDSD_He_Thong_Tuyen_Dung_AI.doc");

  const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Hướng Dẫn Sử Dụng Hệ Thống Tuyển Dụng AI</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Arial', 'Segoe UI', sans-serif; line-height: 1.6; color: #1e293b; background-color: #ffffff; margin: 1in; }
    h1 { color: #1e3a8a; font-size: 24pt; font-weight: bold; text-align: center; margin-bottom: 20pt; border-bottom: 3px solid #3b82f6; padding-bottom: 10pt; }
    h2 { color: #2563eb; font-size: 16pt; font-weight: bold; margin-top: 24pt; margin-bottom: 12pt; border-left: 5px solid #2563eb; padding-left: 10pt; }
    h3 { color: #1d4ed8; font-size: 13pt; font-weight: bold; margin-top: 16pt; margin-bottom: 8pt; }
    p, li { font-size: 11pt; color: #334155; margin-bottom: 8pt; text-align: justify; }
    ul, ol { margin-bottom: 12pt; padding-left: 24pt; }
    li { margin-bottom: 5pt; }
    .note-box { background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 12pt; margin: 16pt 0; border-radius: 4px; }
    .highlight { color: #4338ca; font-weight: bold; }
    .step-num { display: inline-block; background-color: #3b82f6; color: #ffffff; width: 22px; height: 22px; text-align: center; border-radius: 50%; font-weight: bold; font-size: 10pt; margin-right: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 16pt 0; }
    th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 10pt; text-align: left; font-weight: bold; font-size: 11pt; color: #0f172a; }
    td { border: 1px solid #cbd5e1; padding: 10pt; font-size: 10.5pt; color: #334155; vertical-align: top; }
  </style>
</head>
<body>

  <h1>HƯỚNG DẪN SỬ DỤNG HỆ THỐNG TUYỂN DỤNG THÔNG MINH AI<br/><span style="font-size: 14pt; color: #64748b; font-weight: normal;">Phiên Bản v2.0 - Tích Hợp Mô Hình Trí Tuệ Nhân Tạo Gemini</span></h1>

  <div class="note-box">
    <p style="margin: 0; font-weight: bold; color: #4338ca;">TỔNG QUAN HỆ THỐNG:</p>
    <p style="margin: 5pt 0 0 0; font-style: italic;">Hệ thống Hỗ Trợ Tuyển Dụng Thông Minh là giải pháp giúp Cộng tác viên (CTV) và nhà tuyển dụng tự động hóa các khâu thủ công phức tạp trong quy trình đăng tuyển và sàng lọc hồ sơ. Hệ thống tập trung tối ưu hóa hiệu suất thông qua 2 tính năng chính: <span class="highlight">Soạn Tin Tuyển Dụng AI</span> và <span class="highlight">Tạo CV Đại Diện Chuyên Nghiệp AI</span>.</p>
  </div>

  <h2>TÍNH NĂNG 1: SOẠN TIN TUYỂN DỤNG THÔNG MINH BẰNG AI</h2>
  <p>Tính năng này giúp bạn loại bỏ rào cản viết lách, nhanh chóng xuất bản các tin tuyển dụng đa dạng phong cách từ một bản mô tả công việc (JD) thô sơ hoặc có sẵn.</p>

  <h3>Bước 1: Trích xuất thông tin tự động bằng AI (Hoặc Nhập Thủ Công)</h3>
  <ul>
    <li>Mở mục <span class="highlight">Soạn Tin Tuyển Dụng AI</span> từ menu bên trái.</li>
    <li>Tại vùng <strong>"Nhập Mô Tả Công Việc (JD)"</strong>, dán văn bản JD thô có sẵn (chưa định dạng, tài liệu nháp hoặc nội dung trao đổi nhanh từ đối tác).</li>
    <li>Nhấn nút <strong>"Trích xuất nhanh tin tuyển dụng AI 🪄"</strong>. Mô hình Gemini AI sẽ lập tức phân tích văn bản thô để tự động bóc tách và điền chuẩn xác vào các trường biểu mẫu: <em>Vị trí tuyển dụng, Dự án/Nhà tuyển dụng, Mô tả công việc, Yêu cầu hồ sơ, Lương & Quyền lợi, Địa điểm làm việc, và Liên hệ ứng tuyển</em>.</li>
    <li>Bạn cũng có thể tự do nhập trực tiếp hoặc sửa đổi văn bản trong biểu mẫu này theo ý muốn.</li>
  </ul>

  <h3>Bước 2: Lựa chọn phong cách và Tạo Bản Thảo</h3>
  <ul>
    <li>Lựa chọn <strong>Tông giọng bài viết</strong> phù hợp với vị thế thương hiệu tuyển dụng: 
      <ul>
        <li><em>Chuyên nghiệp (Lịch sự, nghiêm túc)</em></li>
        <li><em>Gần gũi & Thân thiện (Ấm áp, tự nhiên)</em></li>
        <li><em>Trẻ trung & Năng động (Thu hút thế hệ trẻ, gen Z)</em></li>
        <li><em>Truyền cảm hứng & Động lực (Thách thức bứt phá)</em></li>
      </ul>
    </li>
    <li>Nhấn nút <strong>"Tạo tin tuyển dụng AI ✨"</strong> để kích hoạt công cụ xử lý.</li>
  </ul>

  <h3>Bước 3: Nhận bản thảo đa dạng phong cách</h3>
  <p>Mô hình AI sẽ cùng lúc trả về cho bạn <strong>3 mẫu bản thảo khác biệt hoàn toàn</strong> nhằm đáp ứng mọi kênh đăng tải khác nhau:</p>
  <table>
    <thead>
      <tr>
        <th style="width: 30%">Phong cách mẫu</th>
        <th style="width: 70%">Mô tả chi tiết mục đích sử dụng</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Mạng xã hội & Emojis</strong></td>
        <td>Bản thảo sinh động, đầy ắp biểu tượng cảm xúc, cấu trúc phân đoạn rõ nét, có lối giật tít truyền thông cực tốt. Thích hợp đăng bài tường cá nhân, Fanpage Facebook, Instagram và Zalo. Ở cuối bài luôn có hệ thống 10-15 hashtag chuyên nghiệp tối ưu thuật toán tìm kiếm (SEO).</td>
      </tr>
      <tr>
        <td><strong>2. Kể chuyện thân mật</strong></td>
        <td>Giọng văn chia sẻ ấm áp, nhẹ nhàng của một người đi trước giới thiệu cơ hội cho đàn em, giảm tính hành chính khô khan. Rất hiệu quả khi đăng bài trên các hội nhóm chia sẻ kinh nghiệm hoặc đăng tin nhắn rỉ tai.</td>
      </tr>
      <tr>
        <td><strong>3. Siêu ngắn gọn & Đi thẳng vào vấn đề</strong></td>
        <td>Nội dung cô đọng cực độ, làm bật duy nhất Vị trí - Mức thu nhập - Cách thức ứng tuyển. Thích hợp để đi rải nhanh bình luận (comment) dạo thúc đẩy tương tác hoặc đăng đàn tin nhanh giới hạn độ dài.</td>
      </tr>
    </tbody>
  </table>

  <h3>Bước 4: Sử dụng bộ công cụ vệ tinh gia tăng hiệu quả (Rải tin và Tạo Ảnh)</h3>
  <ul>
    <li><strong>Sao chép nội dung:</strong> Nhấn trực tiếp nút <em>"Sao chép nội dung"</em> tại tab mẫu bạn ưng ý để lưu về bộ nhớ đệm và dán lên trang tuyển dụng.</li>
    <li><strong>Gợi ý & Tiếp cận Nhóm Facebook:</strong> Bạn sẽ thấy hệ thống Gemini tự động đề xuất 5 cụm từ tìm kiếm hội nhóm hiệu quả nhất dựa trên công việc của bạn. Hãy bấm trực tiếp nút <strong>"Tìm nhóm trên Facebook ↗"</strong> nằm bên cạnh mỗi từ khoá để mở nhanh trình duyệt rải tin.</li>
    <li><strong>Vẽ Poster minh hoạ AI:</strong> Bạn có thể nhấn nút <strong>"Tạo ảnh minh họa AI"</strong> để AI sáng sinh ra một bức ảnh đại diện đẹp đẽ, phù hợp với nghề nghiệp của tin tuyển dụng, giúp tăng tương tác bài đăng lên gấp 3 lần.</li>
  </ul>

  <h2>TÍNH NĂNG 2: TRÌNH TẠO CV ĐẠI DIỆN CHUYÊN NGHIỆP BẰNG AI</h2>
  <p>Đây là công cụ đắc lực dành cho Cộng tác viên để chuyển hóa các thông tin rời rạc hoặc hình ảnh thô sơ của ứng viên thành một bản CV đại diện gửi cho đối tác/doanh nghiệp vô cùng đẹp mắt.</p>

  <h3>Bước 1: Quét và phân tách thông tin từ hình ảnh (AI Vision Reader)</h3>
  <ul>
    <li>Nếu ứng viên chỉ gửi cho bạn một bức ảnh chụp CV cũ, ảnh hồ sơ sơ sài hoặc ảnh chân dung có ghi thông tin, hãy nhấn vào vùng <strong>"Tải lên ảnh CV"</strong> hoặc kéo thả file ảnh trực tiếp vào đây.</li>
    <li>Hệ thống sẽ tải ảnh lên và nút <strong>"Quét ảnh ứng viên bằng AI 🪄"</strong> sẽ xuất hiện.</li>
    <li>Bấm nút này để AI tự động thực hiện nhận diện ký tự quang học thông minh (Optical Character Recognition) kết hợp phân tích ngữ cảnh, tự động trích xuất các thông tin về: <em>Họ tên, Thông tin liên hệ, Mục tiêu nghề nghiệp, Học vấn, Kinh nghiệm, Kỹ năng</em> và điền đầy đủ vào biểu mẫu chuẩn hóa chỉ sau vài giây.</li>
  </ul>

  <h3>Bước 2: Sử dụng các công cụ điền nhanh chuẩn mực</h3>
  <ul>
    <li>Nếu bạn tự tay viết, bạn có thể nhấn nút <strong>"Tự động điền dữ liệu mẫu 🪄"</strong> để điền toàn bộ thông tin mô phỏng của một ứng viên chuẩn chỉ, sau đó sửa lại để học cách vận hành.</li>
    <li>Biểu mẫu có đầy đủ các tab trực quan: <em>1. Thông tin cá nhân, 2. Tóm tắt & Học vấn, 3. Kinh nghiệm làm việc, 4. Kỹ năng & Khác</em> để bạn dễ dàng biên tập.</li>
  </ul>

  <h3>Bước 3: Công cụ Đánh bóng & Mài giũa CV bằng AI (Gemini AI Resume Polisher)</h3>
  <ul>
    <li>Mục này giúp nâng cấp toàn diện chất lượng hành văn trên CV.</li>
    <li>Bấm nút <strong>"Đánh bóng CV bằng AI ✨"</strong> ở thanh hành động.</li>
    <li>Mô hình AI sẽ phân tích các câu từ đơn giản bạn đã ghi (Ví dụ: "chạy bàn", "làm văn phòng") và nâng cấp thành các động từ hành động chuyên nghiệp (Action Verbs) cùng định hướng thành tích xuất sắc (Ví dụ: "Đảm nhận điều phối đón tiếp, tối ưu hóa quy trình phục vụ hỗ trợ đắc lực nâng cao sự hài lòng cho hơn 200 lượt khách hàng/ngày").</li>
  </ul>

  <h3>Bước 4: Quản lý trạng thái và Xuất bản (Lưu PDF)</h3>
  <ul>
    <li><strong>Xem trước thời gian thực (Live Preview):</strong> Phía bên phải màn hình luôn hiển thị bản xem trước trực quan chuẩn Thụy Sỹ của CV ứng viên với đầy đủ bố cục sắc sảo, tinh gọn nghệ thuật.</li>
    <li><strong>Phân loại trạng thái:</strong> Đánh dấu CV là <strong>"Đã duyệt CV" (Approved)</strong> hoặc <strong>"Lưu nháp" (Draft)</strong> để quản trị cá nhân hữu hiệu.</li>
    <li><strong>In & Xuất file PDF chất lượng cao:</strong> Bấm nút <strong>"In / Xuất PDF CV" 🖨️</strong>. Trình duyệt sẽ mở hộp thoại in hệ thống. Hãy chọn mục <em>Máy in là "Lưu dưới dạng PDF" (Save as PDF)</em>, chọn kích cỡ khổ giấy <em>A4</em>, và nhấn Lưu để có ngay một tệp tài liệu PDF CV đẹp không tì vết gửi trực tiếp cho đối tác tuyển dụng!</li>
  </ul>

  <hr style="border: 0; border-top: 1px solid #cbd5e1; margin-top: 40pt;"/>
  <p style="text-align: center; font-size: 9.5pt; color: #64748b; font-family: monospace;">Tài liệu biên soạn tự động bởi AI Recruiter Suite v2.0 - 2026. Chúc bạn tuyển dụng thành công rực rỡ!</p>

</body>
</html>`;

  res.send(docHtml);
});

// Setup Vite Dev server middleware or static assets production path
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

setupServer();
