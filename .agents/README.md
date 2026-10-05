# LinkkWork — MCP (Model Context Protocol) Setup & Usage Guide

Thư mục `.agents/` chứa cấu hình MCP tiêu chuẩn cho dự án LinkkWork, cho phép các AI coding assistants và công cụ tự động hóa kết nối an toàn với cơ sở dữ liệu, tệp tin và các API nội bộ.

---

## 🛠 Danh sách MCP Servers Đã Thiết Lập

1. **`linkkwork-postgres`:**
   - Kết nối trực tiếp cơ sở dữ liệu PostgreSQL 16 + PostGIS.
   - Hỗ trợ kiểm tra schema bảng, thẩm định các ràng buộc Row-Level Security (RLS) của Multi-tenancy và kiểm tra tính cân đối bất biến của Sổ cái kép (`ledger_entries`).

2. **`linkkwork-filesystem`:**
   - Cung cấp khả năng kiểm tra và quản lý tệp tin trong phạm vi Sandbox (`apps/`, `packages/`, `docs/`, `tools/`).
   - Ngăn chặn triệt để rò rỉ dữ liệu hoặc đọc nhầm các file ngoài workspace.

3. **`linkkwork-api-fetch`:**
   - Hỗ trợ gửi REST request kiểm thử trực tiếp tới NestJS Modular Monolith API Gateway (`http://localhost:3000/api/v1`).
   - Hỗ trợ kiểm tra header `x-tenant-id` và xác thực JWT token.

---

## 🚀 Cách Kích Hoạt

Cấu hình được khai báo tại `.agents/mcp_config.json`. Khi khởi động phiên làm việc trong Antigravity IDE hoặc các công cụ hỗ trợ MCP:
- Các máy chủ MCP sẽ tự động phát hiện và cung cấp danh sách công cụ mở rộng.
- Bạn có thể cấu hình mật khẩu thực tế tại file `.agents/.env.mcp` (sao chép từ `.env.mcp.example`).
