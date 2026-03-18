# Hướng Dẫn Sử Dụng OpenClaw V2 (Dành cho Người Vận Hành)

Chào mừng bạn đến với hệ thống **Truyền Thanh Nội Bộ OpenClaw V2** (Bản Nâng cấp V3). Tài liệu này được biên soạn ngắn gọn, dễ hiểu giúp bất kỳ ai (dù không có chuyên môn về máy tính) cũng có thể dễ dàng tạo bản tin, phát sóng và quản lý hệ thống.

---

## 🚀 1. Đăng nhập hệ thống
1. Mở trình duyệt web (Google Chrome hoặc Cốc Cốc).
2. Nhập địa chỉ hệ thống do kỹ thuật viên cung cấp (thường là `http://địa-chỉ-ip`).
3. Nhập **Tên đăng nhập** và **Mật khẩu** (Ví dụ: `admin` / `admin123`).
4. Nhấn nút **Đăng Nhập**.

---

## 🎙️ 2. Cách tạo Bản tin Âm thanh bằng Trí tuệ Nhân tạo (A.I)
Thay vì phải tự thu âm bằng micro, hệ thống cho phép bạn gõ văn bản và AI sẽ tự động đọc thành một file âm thanh chuyên nghiệp cực kỳ chuẩn xác.

1. Bấm vào nút **Quản Lý Thư viện Media** ở trình đơn bên trái.
2. Tại đây, nhấn vào nút **+ Chuyển đổi Văn bản thành Giọng nói (TTS)** (màu tím).
3. Một cửa sổ sẽ hiện lên:
   - **Tên file**: Đặt một cái tên dễ nhớ (VD: `ThongBao_Sang20.mp3`).
   - **Nội dung văn bản**: Gõ nội dung bạn muốn phát thanh vào ô trống.
   - **Giọng đọc**: Chọn giọng Nam hoặc Nữ tùy ý.
4. Bấm **Tạo âm thanh TTS**.
5. Đợi khoảng vài giây, file âm thanh sẽ tự động xuất hiện trong thư viện. Bạn có thể bấm biểu tượng "Play" (Tam giác) để nghe thử sóng âm của file vừa tạo.

> 💡 **Mẹo (Từ điển Quân sự)**: Nếu AI đọc sai các từ viết tắt chuyên ngành (như "BCH", "CQ", v.v.), bạn hãy sang mục **Từ điển Quân sự** ở menu trái để thêm luật đọc (BCH -> Ban Chỉ huy). AI sẽ thông minh tự động đọc đúng ở các lần tạo tiếp theo!

---

## 📅 3. Lên Lịch Phát Thanh Tự Động
Khi đã có file âm thanh trong thư viện, bạn cần cài đặt giờ để hệ thống tự động phát lên loa.

1. Chuyển sang mục **Quản Lý Lịch phát thanh**.
2. Bấm nút **+ Lên lịch mới**.
3. Điền các thông tin:
   - **Tên lịch phát**: Ví dụ `Thể dục Buổi sáng`.
   - **Chọn File Âm thanh**: Nhấp dể chọn file bạn đã tạo ở Bước 2.
   - **Thời gian phát**: Chọn ngày và giờ hệ thống sẽ tự động bật loa.
   - **Cụm loa phát**: Chọn "Tất cả thiết bị" hoặc chỉ phát cho một vùng nhất định.
4. Nhấn **Xác nhận**. Hệ thống lúc này đã ghi nhớ, đến đúng giờ loa sẽ tự động kêu.

---

## 📝 4. Chế độ Ban Biên Tập & Chờ Phê Duyệt
Để tránh phát sóng sai thông tin, hệ thống có chức năng Trình duyệt.

Nếu bạn là **Biên tập viên**:
1. Vào **Quản Lý Bản tin**.
2. Viết nội dung, đính kèm file âm thanh và nhấn **Lưu Bản Nháp** hoặc **Gửi Phê Duyệt**.
3. Chờ Chỉ huy xem qua. Bản tin của bạn sẽ có nút màu cam "Đang chờ duyệt".

Nếu bạn là **Chỉ huy trưởng / Quản trị viên**:
1. Vào **Kiểm duyệt AI**. Hệ thống AI quét qua văn bản và đánh giá điểm an toàn, bắt lỗi chính tả, đề xuất sửa lỗi bằng màu đỏ (nếu có).
2. Bạn đọc lướt qua để kiểm tra độ tin cậy. Dễ dàng bấm nút **Phê duyệt** (màu xanh lá) để cho phép bản tin được phát lên loa, hoặc bấm **Từ chối** (màu xám) bắt nhân viên sửa lại.

---

## 🔴 5. Phát Thanh Trực Tiếp (Live Broadcasting) & Khẩn Cấp
Trong tình huống cần nói trực tiếp qua Micro máy tính ra toàn bộ loa trong đơn vị ngay lập tức mà không cần tạo file mp3.

1. Tại **Tổng quan hệ thống (Dashboard)**, tìm đến khu vực **Phát thanh trực tiếp**.
2. Chọn khu vực loa muốn phát (Ví dụ: Tất cả loa).
3. Bấm biểu tượng Micro **Bắt đầu phát thanh**. Trình duyệt sẽ hỏi cho phép dùng Micro, bạn bấm "Allow".
4. Lúc này giao diện chớp đỏ chữ `ĐANG PHÁT THANH TRỰC TIẾP`. Mọi lời bạn nói vào máy tính sẽ vang lên tại các trụ loa ngoài trời gần như không có độ trễ.
5. Khi nói xong, bấm nút **Ngừng phát thanh**.

> ⚠️ **Báo động Khẩn Cấp (SOS)**: Ở góc trên bên trái, có một nút **Báo động Khẩn cấp** siêu to. Bấm vào đó, còi hụ sẽ lập tức vang lên toàn đơn vị bất chấp loa đang tắt hay mở. Thao tác này sẽ bị ghi lại vào **Nhật ký Hoạt động** để truy vết người thực hiện nên chỉ dùng khi thật sự cần thiết.

---

## 📊 6. Theo dõi Hệ Thống
1. **Biểu đồ Thống kê**: Vẽ các biểu đồ cột và tròn cho biết bạn đã phát bao nhiêu bản tin trong tuần qua, có bao nhiêu loa đang bị đứt cáp/mất mạng (Ngoại tuyến).
2. **Sức khỏe Thiết bị**: Xem tình trạng CPU, Nhiệt độ và RAM của Loa. Bấm nút Tải lại để ép Loa kết nối lại mạng.
3. **Nhật ký Hoạt động**: Liệt kê dưới dạng bảng "Ai đã làm gì lúc nào", dùng để rà soát khi có sự cố thao tác nhầm lẫn.

---
*OpenClaw V2 System - Tài liệu Ban hành Nội bộ*
