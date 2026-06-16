# support-hiring

Chào mừng quý khách đến với tài liệu hướng dẫn sử dụng và triển khai **AI Recruiter Suite (v2.0)**. Ứng dụng là một giải pháp hỗ trợ các nhà tuyển dụng và Cộng tác viên (CTV) nâng cao hiệu năng tìm kiếm ứng viên nhờ sức mạnh của Trí tuệ Nhân tạo thông qua hai module chính: **Soạn tin tuyển dụng thông minh** và **Tạo CV đại diện AI**.

---

## 📖 MỤC LỤC
1. [Giới thiệu tính năng](#1-giới-thiệu-tính-năng)
2. [Hướng dẫn sử dụng chi tiết](#2-hướng-dẫn-sử-dụng-chi-tiết)
3. [Hướng dẫn khởi chạy cục bộ (Local Development)](#3-hướng-dẫn-khởi-chạy-cục-bộ-local-development)
4. [Hướng dẫn các cách triển khai (Deploy) để người khác sử dụng](#4-hướng-dẫn-các-cách-triển-khai-deploy-để-người-khác-sử-dụng)

---

## 1. GIỚI THIỆU TÍNH NĂNG

### ✨ Soạn Tin Tuyển Dụng AI (AI Job Post Generator)
*   **Hỗ trợ đa dạng ngành nghề:** Tự động tạo tin dựa trên các thông số đầu vào cơ bản (Vị trí, Yêu cầu, Mức lương, Quyền lợi, Địa điểm).
*   **Tùy chỉnh tông giọng viết:** Chọn lựa tông giọng chuyển tải thông điệp phù hợp thương hiệu: Chuyên nghiệp, Gần gũi, Trẻ trung, hay Truyền động lực.
*   **Tích hợp Kênh Rải Tin:** Cho phép lưu trữ và dễ dàng truy xuất danh sách hội nhóm, diễn đàn xã hội để trực tiếp mở nhanh liên kết và chia sẻ tin tuyển dụng chỉ với 1 lượt bấm.

### 📄 Tạo CV Đại Diện chuyên nghiệp bằng AI (AI CV Generator)
*   **Quét thông tin thông minh:** Tự động điền nhanh các trường thông tin cơ bản bằng cách kéo thả hoặc đăng tải ảnh chân dung cận cảnh của ứng viên.
*   **Ngon lành & Toàn diện:** Trình chỉnh sửa dữ liệu CV linh hoạt gồm Thông tin cá nhân, Học vấn, Kinh nghiệm làm việc, Kỹ năng, Chứng chỉ và Mục tiêu nghề nghiệp.
*   **Trình bày mẫu mã chuẩn hóa:** Xuất file in PDF/Ảnh của CV mẫu chuẩn trực quan để gửi trực tiếp cho doanh nghiệp/đối tác.

---

## 2. HƯỚNG DẪN SỬ DỤNG CHI TIẾT

### Cách Soạn Tin Tuyển Dụng:
1.  Truy cập tab **Soạn Tin Tuyển Dụng AI** từ thanh Menu bên trái.
2.  Điền các thông tin của Job cần tìm như: *Chức danh công việc, Mức lương đề nghị, Địa điểm làm việc, và Mô tả ngắn gọn*.
3.  Lựa chọn phong cách ngôn ngữ mong muốn và nhấn **"Tạo tin tuyển dụng AI ✨"**.
4.  Bản thảo tin tuyển dụng hoàn hảo sẽ được xuất ra dưới khung Markdown bên phải. Bạn có thể dễ dàng Chỉnh sửa hoặc nhấn nút **"Sao chép nội dung"** để gửi đi.

### Cách Tạo CV Đại Diện:
1.  Truy cập tab **Tạo CV Đại Diện AI** từ thanh Menu.
2.  Tải lên ảnh chân dung của ứng viên (Dùng ảnh thẻ hoặc ảnh chân dung lịch sự chuyên nghiệp).
3.  Điền/Điều chỉnh hồ sơ ứng viên dưới các mục tương ứng. Bạn có thể nhấn nút **"Tự động điền bằng Trí Tuệ Nhân Tạo 🪄"** để tạo sinh một bản mẫu tự động.
4.  Quan sát Bản CV Xem trước thực tế (Aesthetic Preview Card) được cập nhật thời gian thực ở bên phải.
5.  Thiết lập tùy chọn Đã duyệt hoặc Lưu nháp, sau đó sử dụng tính năng **In/Xuất PDF** trực tiếp trong trình duyệt để lưu lại bản CV đẹp đẽ.

---

## 3. HƯỚNG DẪN KHỞI CHẠY CỤC BỘ (LOCAL DEVELOPMENT)

Để tải mã nguồn và chạy thử ứng dụng trên môi trường máy cá nhân của bạn, hãy lần lượt thực hiện theo các bước sau:

### Yêu cầu tiên quyết:
*   Môi trường máy tính của bạn đã cài đặt sẵn **Node.js LTS (Phiên bản v18 trở lên khuyến nghị)**.

### Các bước cài đặt:
1.  Tải mã nguồn về máy và chuyển vào thư mục thư viện dự án:
    ```bash
    cd text-recruiting-assistant
    ```
2.  Cài đặt các gói phụ thuộc (Dependencies):
    ```bash
    npm install
    ```
3.  Khai báo khóa bảo mật API cho AI. Hãy tạo một tệp tin mang tên `.env` ở gốc thư mục của bạn và dán dòng sau:
    ```env
    GEMINI_API_KEY=phím_key_gemini_của_bạn_tại_đây
    ```
4.  Chạy ứng dụng trong chế độ Phát Triển (Development mode):
    ```bash
    npm run dev
    ```
5.  Truy xuất ứng dụng thông qua địa chỉ hiển thị trên Command-Line (Thường là `http://localhost:3000` hoặc `http://localhost:5173`).

---

## 4. HƯỚNG DẪN CÁC CÁCH TRIỂN KHAI (DEPLOY) ĐỂ NGƯỜI KHÁC SỬ DỤNG

Sau khi đã lược bỏ đi các cơ chế cồng kềnh về kết nối Google Sheets bảo mật, ứng dụng hiện tại hoạt động theo mô hình **Offline-First SPA / Serverless API** vô cùng nhẹ nhàng, tối ưu, dễ dàng chia sẻ diện rộng cho mọi người dùng chung. Bạn có các hình thức phát hành sau:

### Cách 1: Chia sẻ Nhanh trực tuyến từ Google AI Studio (Khuyên dùng nhất cho CTV)
Hệ thống AI Studio cung cấp sẵn hạ tầng lưu trữ và vận hành ổn định:
1.  Tại giao diện dự án AI Studio Build này, quý khách hãy nhìn lên góc trên bên phải màn hình và nhấn vào nút **"Share"** hoặc **"Deploy"**.
2.  Thiết lập chế độ riêng tư thành **"Public" (Công khai)** hoặc chia sẻ link riêng tư dành cho đồng nghiệp.
3.  Copy liên kết nhận được (Thư mục liên kết có dạng `https://ais-pre-...asia-east1.run.app`) và gửi trực tiếp cho những người dùng khác. Họ có thể mở ứng dụng ngay trên trình duyệt điện thoại hay máy tính mà không cần cài đặt thêm bất kỳ thứ gì.

---

### Cách 2: Triển khai Tải tĩnh hoàn toàn miễn phí (Vercel, Netlify hoặc GitHub Pages)
Do ứng dụng là một dự án viết bằng nền tảng React + Vite thông minh, bạn có thể triển khai bản Build tĩnh cực nhanh:
1.  Truy cập cửa sổ dòng lệnh tại thư mục gốc dự án và chạy câu lệnh đóng gói:
    ```bash
    npm run build
    ```
2.  Hệ thống sẽ sản sinh một thư mục chứa tệp hoàn chỉnh tên là `dist/` ở gốc dự án.
3.  **Cách đăng lên Vercel/Netlify:**
    *   Đăng ký tài khoản miễn phí trên [Vercel](https://vercel.com) hoặc [Netlify](https://netlify.com).
    *   Kết nối tài khoản GitHub của bạn để tự động nạp mã nguồn dự án lên.
    *   Lựa chọn framework là **Vite** và chỉ định thư mục đăng tải (Publish directory) là `dist`.
    *   Tiến hành cấu hình Environment Variable: Thêm biến `GEMINI_API_KEY` bằng giá trị khóa của bạn trên trang Dashboard điều hướng của nhà cung cấp.
    *   Bấm **Deploy** để nhận đường link sản phẩm chính thức trọn đời miễn phí!

---

### Cách 3: Đóng gói dưới dạng dịch vụ Docker (Dành cho Lập trình viên / Hạ tầng riêng)
Nếu bạn có máy chủ riêng (VPS, GCP, AWS) và muốn chạy sản phẩm dưới dạng một dịch vụ Container hóa an toàn:
1.  Tạo tệp cấu hình có tên `Dockerfile` tại thư mục gốc với nội dung:
    ```dockerfile
    FROM node:20-slim AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    RUN npm run build

    FROM node:20-slim
    WORKDIR /app
    COPY --from=builder /app ./
    EXPOSE 3000
    ENV NODE_ENV=production
    CMD ["npm", "run", "start"]
    ```
2.  Tiến hành build ảnh Docker và khởi chạy ứng dụng:
    ```bash
    docker build -t ai-recruiter:latest .
    docker run -d -p 3000:3000 --env GEMINI_API_KEY="key_của_bạn" ai-recruiter:latest
    ```

Chúc bạn có những trải nghiệm thật sự hữu hiệu và gặt hái hiệu suất tuyển dụng cao cùng **AI Recruiter Suite**!
