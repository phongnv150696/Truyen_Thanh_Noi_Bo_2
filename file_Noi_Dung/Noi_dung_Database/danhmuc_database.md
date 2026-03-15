# Hướng dẫn Danh mục Database OpenClaw (Tiếng Việt)

Dưới đây là danh sách các bảng trong hệ thống OpenClaw và quy tắc phân quyền chi tiết.

---

## 🔐 Quy tắc Phân quyền & Bảo mật (RBAC)

Hệ thống được thiết kế với các cấp độ truy cập nghiêm ngặt để đảm bảo an toàn thông tin quân sự.

### 1. Phân cấp Vai trò (Roles)
| Vai trò | Phạm vi quyền hạn |
| :--- | :--- |
| **Admin** | Quyền tối cao. Là người duy nhất cấu hình được `system_config` và `roles`. |
| **Chỉ huy** | Quyền rộng trên dữ liệu nghiệp vụ. Không được phép chạm vào cấu hình kỹ thuật. |
| **Biên tập viên** | Chỉ quản lý và chỉnh sửa được nội dung do chính mình tạo ra. |
| **Phát thanh viên** | Chỉ thao tác với Media/Ghi âm. Không có quyền tạo bản tin mới. |
| **Người nghe** | Chỉ có quyền đọc kênh phát và xem điểm số thi đua đơn vị. |

### 2. OpenClaw AI (Service Account)
OpenClaw hoạt động như một "AI tự động" thông qua tài khoản dịch vụ riêng:
- **Sandbox**: Bị giới hạn trong môi trường an toàn, không có quyền như người dùng thật.
- **Quyền ghi**: Chỉ được phép ghi vào `content_reviews`, `unit_scores`, và `schedule_proposals`.
- **Giám sát**: Mọi hành động đều được lưu vết chi tiết trong `openclaw_api_logs`.

### 3. Quy định đặc biệt cho bảng dữ liệu
- **`audit_logs` (Bất biến)**: Tuyệt đối không ai (kể cả Admin) được phép UPDATE hoặc DELETE. Chỉ cho phép INSERT để đảm bảo tính minh bạch.
- **`alert_messages` (Lệnh khẩn)**: Chỉ Admin và Chỉ huy mới có quyền tạo. Không phân cấp xuống dưới để tránh báo động giả.

---

## 📊 Danh mục các bảng dữ liệu

### 1. Tài khoản & Đơn vị (Accounts & Units)
| Tên bảng (Tiếng Việt) | Tên gốc (English) |
| :--- | :--- |
| **nguoi_dung** | `users` |
| **dang_ky_tai_khoan** | `user_registrations` |
| **don_vi_quan_doi** | `units` |
| **vai_tro_va_quyen** | `roles & permissions` |
| **phien_dang_nhap** | `sessions / refresh tokens` |
| **cap_lai_mat_khau** | `password_resets` |

### 2. Nội dung & Media (Content & Media)
| Tên bảng (Tiếng Việt) | Tên gốc (English) |
| :--- | :--- |
| **danh_muc_ban_tin** | `content_items` |
| **kiem_duyet_ban_tin** | `content_reviews` |
| **tep_tin_media** | `media_files` |
| **cong_viec_tts** | `tts_jobs` |
| **phien_ghi_am** | `recording_sessions` |
| **tu_dien_quan_su** | `military_dictionary` |

### 3. Phát Sóng & Lịch (Broadcasting & Scheduling)
| Tên bảng (Tiếng Việt) | Tên gốc (English) |
| :--- | :--- |
| **kenh_phat_thanh** | `channels` |
| **lich_phat_song** | `broadcast_schedules` |
| **nhat_ky_phat_song** | `broadcast_sessions` |
| **yeu_cau_phat_ngay** | `on_demand_requests` |
| **de_xuat_lich_ai** | `schedule_proposals` |
| **tin_nhan_khan_cap** | `alert_messages` |

### 4. AI Agent & Chấm Điểm (AI Agent & Scoring)
| Tên bảng (Tiếng Việt) | Tên gốc (English) |
| :--- | :--- |
| **diem_so_don_vi** | `unit_scores` |
| **bang_xep_hang** | `score_leaderboard` |
| **tac_vu_ai** | `openclaw_jobs` |
| **nhat_ky_api_ai** | `openclaw_api_logs` |
| **goi_y_tu_ai** | `ai_suggestions` |

### 5. Hệ Thống & Kiểm Toán (System & Audit)
| Tên bảng (Tiếng Việt) | Tên gốc (English) |
| :--- | :--- |
| **nhat_ky_he_thong** | `audit_logs` |
| **thong_bao** | `notifications` |
| **cau_hinh_he_thong** | `system_config` |
| **gioi_han_truy_cap** | `api_rate_limits` |
| **chi_so_suc_khoe** | `health_metrics` |
