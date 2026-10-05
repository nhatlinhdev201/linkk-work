# LinkkWork — On-demand Service Marketplace Platform

> Nền tảng kết nối dịch vụ tiện ích gia đình & doanh nghiệp theo yêu cầu (tương tự bTaskee) với kiến trúc Hybrid Multi-tenant, Single-codebase Dual-Flavor Mobile App và Realtime Dispatching / Bidding Engine.

---

## 🏗 Cấu trúc Dự án (Monorepo Layout)

```text
linkkwork/
├── apps/
│   ├── api/                     # Backend API Core (NestJS + TypeScript, Clean Architecture)
│   ├── admin/                   # Web Admin Portal (Next.js / Vite + React + Tailwind + Shadcn UI)
│   └── mobile/                  # Mobile App (Flutter Single Codebase: Customer & Tasker Flavors)
├── packages/
│   └── shared-types/            # Shared Enums, DTOs, Business Rules
├── docs/
│   └── superpowers/specs/       # System Design Specs & Architecture Documents
└── README.md
```

---

## 🚀 Công nghệ Chủ đạo (Tech Stack)

| Thành phần | Công nghệ | Mục đích |
| :--- | :--- | :--- |
| **Mobile App** | **Flutter** (Dart) | 1 Source code build 2 app (`customer` & `tasker` flavor), tối ưu hiệu năng bản đồ & fast-finger claim |
| **Backend API** | **NestJS** (TypeScript) | Kiến trúc Modular Monolith, Clean Architecture, DDD, type-safe, sẵn sàng tách Microservices |
| **Web Admin** | **Next.js / React** + **Shadcn UI** | Cực nhẹ, mượt mà, phân quyền linh hoạt cho Super Admin & Admin Tenant |
| **Database** | **PostgreSQL** + **PostGIS** | Đảm bảo tính toàn vẹn ACID cho tài chính + Truy vấn vị trí địa lý & bán kính Tasker |
| **Cache & Realtime** | **Redis** | Redlock chống giật trùng đơn, Pub/Sub realtime, caching dữ liệu tần suất cao |
| **Storage** | **S3 / Cloudflare R2** | Lưu trữ ảnh nghiệm thu, hợp đồng, chứng từ |

---

## 👥 Vai trò & Phân quyền Hệ thống

1. **Super Admin (Platform Owner):** Quản trị toàn bộ sàn, cấu hình gói cước Tenant (Subscription/Hoa hồng), duyệt Tenant, Impersonate hỗ trợ đối tác.
2. **Admin Tenant (Doanh nghiệp đối tác):** Quản lý nhân sự Tasker nội bộ, điều phối đơn nội bộ, xem báo cáo doanh thu và đơn hàng của Tenant.
3. **Tasker (Người làm việc):** Gồm Tasker tự do (sàn điều phối) và Tasker thuộc Tenant (nhận việc nội bộ hoặc qua sàn).
4. **Customer (Khách hàng):** Đặt dịch vụ theo giờ, theo gói máy móc hoặc đăng bài đấu thầu.
