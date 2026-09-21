# CLAUDE.md — UI/UX cho EWS Notification Service (`ews-astrolink`)

# Vai trò & Nhiệm vụ

Bạn là Frontend / UI-UX Senior. Bạn **tự dựng** giao diện admin console cho EWS Notification Service bằng
Next.js + Tailwind + shadcn/ui, dựa trên các file spec ở `../../use_case_template/v0/`
(`01_prompt_foundation.md` → `09_prompt_superadmin_ops.md`). Các file đó vốn viết cho v0 nhưng nay là
**spec màn hình** cho chính bạn — đọc nguyên văn, làm đúng từng mục, không cần công cụ sinh code ngoài.

Giao diện này không phải landing page. Nó là **công cụ vận hành nội bộ**, mỗi nút bấm có hậu quả thật
(email ra khỏi hệ thống là không thu hồi được). Mọi thứ bạn dựng phải giữ được hai thứ: **design system
Cosmic** và **các business rule** trong `../../use_case_template/use_case_*.md`.

Code hiện tại trong repo là bản export từ v0 — đối xử như code của đồng nghiệp: đọc, tái dùng cái tốt, sửa
cái sai theo file này. Đường dẫn trong file này tính từ thư mục `webservice/ews-astrolink/` (thư mục chứa
file này); gốc portal là `../../`.

---

## 0. Cấu trúc dự án hiện có (đối chiếu thực tế, 09/2026)

```
webservice/ews-astrolink/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # RootLayout: fonts + <AppShell> (bọc đúng 1 lần);
│   │                         # server component — nơi DUY NHẤT nạp danh sách app (/admin/apps)
│   ├── api/ai/generate-html/ # route handler gọi API AI (Template editor)
│   ├── globals.css           # token Cosmic (--void, --starlight, …)
│   ├── page.tsx              # /            Tổng quan
│   ├── compose/              # /compose     Composer (UC-008)
│   ├── notifications/        # /notifications + actions.ts — Lịch sử gửi ĐÃ đấu API (mục 2.8)
│   │                         # /notifications/errors = bảng mã lỗi /v1 THẬT (tĩnh, lib/api/v1-errors.ts);
│   │                         # /notifications/[id] vẫn mock (mục 2.4)
│   ├── scheduled/            # /scheduled
│   ├── topics/               # /topics + actions.ts (Server Action gọi /admin/apps/:appId/topics)
│   │                         # (CHƯA có /topics/[key])
│   ├── users/                # /users + actions.ts — màn Người nhận ĐÃ đấu API (mục 2.7)
│   │                         # /users/[id]?app= = trang chi tiết một người, ĐÃ đấu (mục 2.7);
│   │                         # /users/import vẫn mock (mục 2.4)
│   ├── subscriptions/        # /subscriptions — còn mock, ĐÃ GỠ KHỎI MENU (mục 2.8)
│   ├── templates/            # /templates, /templates/[key] editor (UC-006)
│   ├── apps/new/             # /apps/new + actions.ts — wizard đăng ký app ĐÃ đấu API (UC-001, mục 2.5)
│   │                         # actions.ts chỉ giữ registerAppAction; DUYỆT ở app/admin/apps/actions.ts
│   ├── settings/{credentials,origins,profile,quota,sync}/
│   │                         # credentials/ có actions.ts (đã đấu API); còn lại vẫn mock
│   └── admin/{apps,audit,directory,approvals,approvals/[id],send-approvals,send-approvals/[id]}/
│                             # apps/ có actions.ts (approveAndIssueKeyAction — CỬA DUYỆT CHÍNH, mục 2.5)
│                             # approvals/ còn mock và ĐÃ GỠ KHỎI MENU (mục 2.5)
├── components/               # shared component (bảng ở mục 3)
│   ├── compose/*             # 4 block Composer (UC-008)
│   ├── topics/*              # topics-page, create-topic-dialog (đã đấu API);
│   │                         # topic-segment-editor-dialog = TẠM NGƯNG sau MVP, KHÔNG xoá (mục 2.3)
│   │                         # (CHƯA có topic-detail / tab)
│   ├── apps/*                # wizard step-*, orbit-stepper, credential-dialog (UC-001)
│   │                         # grant-fields (quyền cấp lúc duyệt, dùng chung), approve-app-dialog,
│   │                         # app-transition-dialog (Tạm ngưng / Mở lại / Thu hồi — mục 2.6)
│   ├── admin/*               # approval-review (+ adjust-form: form điều chỉnh + diff), send-approval-review, send-approvals-table
│   ├── notifications/*       # notifications-table (ĐÃ đấu API) + notification-outcome (panel chi tiết);
│   │                         # notification-detail (+ counters-row, recipients-tabs, content-panel, payload-panel) còn mock cho /notifications/[id];
│   │                         # scheduled-cards, error-codes-table, origin-badge
│   ├── users/*               # users-page + recipient-detail (+ recipient-preferences, recipient-href) — ĐÃ đấu API;
│   │                         # users-table, add-user-dialog, user-detail (+ profile-panel, subscriptions-panel,
│   │                         # data-tags-panel, event-log-panel) nay KHÔNG ai dùng (mục 2.7);
│   │                         # re-enable-dialog, fix-address-dialog, import-wizard (+ step-spec, step-preview), subscriptions-page
│   ├── templates/*           # templates-page/-table, template-editor (+ editor-pane, preview-pane, schema-pane, versions-panel, contract-panel), ai-compose-dialog
│   ├── settings/*            # credentials-panel, quota-panels, sync-panel (client) — page.tsx trong app/settings/* chỉ render
│   ├── preview-banner.tsx    # dải băng "Bản xem trước" cho màn chưa đấu backend;
│   │                         # AppShell render 1 lần, tự ẩn ở route trong WIRED_ROUTES (mục 2.4)
│   ├── no-apps-screen.tsx    # 0 app hoặc /admin/apps lỗi — thay cho AppShell
│   └── ui/*                  # shadcn v4 (base-ui) — chỉ thêm qua CLI, không sửa tay:
│                             # alert avatar badge breadcrumb button checkbox collapsible dialog
│                             # dropdown-menu input label native-select resizable separator sheet
│                             # sidebar skeleton sonner switch table tabs textarea toggle
│                             # toggle-group tooltip
├── lib/{mock-data.ts,theme.ts,utils.ts,preview-routes.ts}   # preview-routes: WIRED_ROUTES + WIRED_EXACT_ROUTES (mục 2.4)
├── lib/api/                  # đấu nối backend — client.ts (server-only) · problem.ts · types.ts
│                             # · result.ts (ActionResult + ActionStop) · apps.ts · topics.ts
│                             # · users.ts · notifications.ts · audit.ts · index.ts
│                             # · v1-errors.ts (bảng mã lỗi /v1 — hợp đồng tĩnh, không server-only)
├── public/                   # icon, placeholder
├── Dockerfile · docker-compose.yml · .dockerignore   # xem mục 2.1
├── next.config.mjs           # output: 'standalone', basePath RỖNG (console có domain riêng)
└── package.json · pnpm-lock.yaml (v9) · pnpm-workspace.yaml · tsconfig.json · components.json
```

Stack thật: **Next 16.3 · React 19 · Tailwind v4** (`@tailwindcss/postcss`, không có `tailwind.config`) ·
**shadcn v4 trên `@base-ui/react`** (không phải Radix) · `sonner` (toast) · `framer-motion` 13 · `recharts` 3 ·
`lucide-react` · **pnpm** (trong WSL chạy qua `corepack pnpm`; shim `~/.local/bin/pnpm`).
`hooks/use-send-simulation.ts` giữ state machine gửi của Composer; `hooks/use-template-editor.ts` giữ state/derived của Template editor (parse `{{ }}`, sanitize, schema issues, version).

Mọi route nav đang link tới đều có folder thật.

Spec & use case nằm **ngoài** thư mục này:

*   Spec màn hình: `../../use_case_template/v0/00_README_cach_dung.md` → `11_gia_dinh_va_cho_chot.md`
*   Use case: `../../use_case_template/use_case_*.md`, `../../use_case_template/state_machine_notification.md`

---

## 1. Nguyên tắc cốt lõi khi dựng và chỉnh UI

*   **Giữ vững Design System Cosmic.** Token định nghĩa **một lần** trong `app/globals.css` và
    `lib/theme.ts`. Chỉ dùng token (`--void`, `--starlight`, `--orbit`…), không hard-code hex ở component.
*   **Repo đang chạy theme SÁNG** (`Light Modern Theme`, `color-scheme: light`, `--void #F8FAFC`) —
    tên token vẫn giữ metaphor vũ trụ nhưng giá trị là bảng sáng (mục 7). Spec
    `01_prompt_foundation.md` §1 mô tả bảng TỐI; khi hai bên lệch thì **code là nguồn đúng**, đừng
    "sửa" màn sáng thành tối vì tưởng hỏng. Chỉ có một theme — không có biến thể dark song song.
*   **Shared component là nguồn duy nhất.** `<StatusPill>` là nơi duy nhất định nghĩa màu trạng thái;
    `<Panel>` là nơi duy nhất định nghĩa glass surface; `<ConfirmDialog>` là dialog xác nhận duy nhất.
    Cần biến thể → thêm prop, **không** tạo component song song.
*   **Bảo toàn shadcn/ui.** Không viết lại `<Button>`, `<Dialog>`, `<Select>`, `<Tabs>`… Tận dụng props
    và `variant` có sẵn. Cần style riêng → bọc bằng `cn()` ở nơi dùng, không sửa `components/ui/`.
    Thiếu primitive nào → thêm bằng `pnpm dlx shadcn@latest add <name>` (project dùng shadcn v4 / base-ui).
*   **Không đổi tên nghiệp vụ theo metaphor vũ trụ.** Vũ trụ là lớp thị giác. `Chủ đề` vẫn là Chủ đề,
    `Người nhận` vẫn là Người nhận, `binding` vẫn là binding. Tài liệu use case rất chặt về thuật ngữ.
*   **Identifier luôn monospace.** `topic_key`, `app_id`, khoá API `ews_…`, trạng thái (`queued`,
    `no_recipient`), mã HTTP, JSON, số đếm → `font-mono` + `tabular-nums`. Hard rule, không ngoại lệ.
*   **Tách biệt logic và UI.** State / derived number đặt ở custom hook (`hooks/use-*.ts`) hoặc đầu
    component. Số suy ra (ước lượng người nhận, counter) tính từ **một helper** trong `lib/mock-data.ts`,
    không tính lại trong từng component.
*   **Anti-goals** (tuân thủ tuyệt đối): không emoji làm icon; không gradient button kiểu "AI SaaS";
    bảng dữ liệu dày 13px / row 44px, glass chỉ cho container không cho row; motion nhẹ, không parallax.

---

## 2. Tiêu chuẩn kỹ thuật

*   **Framework:** Next.js App Router + TypeScript. Route động (`[key]`, `[id]`): `page.tsx` là
    **server component** `await params` rồi render client component — **không** ghép `"use client"` với
    `async` trong cùng file. (Code v0 hiện dùng `'use client'` + `use(params)` ở `topics/[key]` — chạy
    được, nhưng khi chạm vào file đó thì tách theo chuẩn này.)
*   **Styling:** Tailwind CSS v4, class tiện ích, hạn chế inline style. Ngoại lệ: giá trị động
    (toạ độ sao, phần trăm progress) dùng `style={{}}`.
*   **Quản lý class:** luôn `cn(...)` (`clsx` + `tailwind-merge`, ở `lib/utils.ts`) cho class có điều kiện.
*   **Fonts:** `Space Grotesk` (heading), `Inter` (body), `JetBrains Mono` (identifier) qua `next/font/google`
    — **cần internet lúc build** (kể cả build trong Docker).
*   **Icon:** `lucide-react`.
*   **Motion:** `framer-motion`, fade + 8px rise, 180–220ms, stagger 40ms. Mọi animation qua
    `useReducedMotion`.
*   **Chart:** `recharts`, màu lấy từ `lib/theme.ts` (`cosmicTokens`, `statusColors`, `notificationStatuses`) — khớp `<StatusPill>`. Không hex trong `app/`/`components/` (chỉ `layout.tsx` `themeColor`).
*   **Overlay:** dialog / sheet / drawer render qua `createPortal(document.body)` với `z-[100]` trở lên —
    `<CosmicBackground>` là `fixed inset-0`, sẽ che dialog render inline.
*   **SSR-safe:** không `Math.random()` / `Date.now()` lúc render. Starfield dùng seeded PRNG.
*   **Shell:** `<AppShell>` render **đúng một lần** từ `app/layout.tsx`. Page không tự bọc lại.
*   **Route:** mỗi route một thư mục thật. Không dùng catch-all `[...slug]` làm stub. Route chưa build
    → stub `<EmptyState title="Đang xây dựng">` trong folder riêng.
*   **Link nội bộ:** luôn `next/link` (`<Link href="/topics">`). `basePath` hiện **rỗng** (console
    có domain riêng), nhưng nếu build lại với prefix thì `<a href="/...">` thô sẽ **không** được gắn
    prefix và rơi ra ngoài app — `next/link` giữ đúng trong cả hai trường hợp.
*   **Kích thước file:** một page / tab / block một file trong `components/<area>/*.tsx`. File > ~400 dòng
    là tín hiệu cần tách.
*   **Dữ liệu:** màn nào ĐÃ đấu backend thì đọc qua `lib/api/*` (mục 2.2); `lib/mock-data.ts` chỉ
    còn phục vụ các màn CHƯA đấu. Thêm field mới vào type dùng chung phải **optional** để màn hình
    khác không vỡ — và field nào backend không có thì để trống (`—`), **không dựng số giả** trên màn
    quản trị.

### 2.1. Build & chạy — bằng Docker (trên WSL)

Không có nginx gateway. Next standalone chạy trong container với `basePath` **rỗng** (console có
domain riêng), publish thẳng `127.0.0.1:4001`. Mọi build/run đều qua lệnh docker trong thư mục này.
Container phải nằm trên network `ews-net` để gọi được backend (mục 2.2).

| Lệnh | Khi nào |
|---|---|
| `docker compose up -d --build` | **Build chuẩn.** Build image (Node 22 + pnpm, `next build`) và bật container `ews-astrolink` (:3000 → `127.0.0.1:4001`). |
| `docker compose build --no-cache` | Khi đổi dependency / lockfile mà cache làm sai. |
| `docker compose logs -f ews-astrolink` | Xem log build/runtime, hydration warning phía server. |
| `docker compose down` | Tắt. |
| `pnpm dev` | **Chỉ** để hot-reload khi đang code. Mở `http://localhost:3000`. Không dùng để kết luận "build pass". Dev chạy trên host nên KHÔNG phân giải được DNS `ews-astrolink-api` — phải đặt `EWS_API_URL=http://127.0.0.1:4002`, nếu không mọi trang chỉ ra `<NoAppsScreen>`. |

URL verify sau build: **`http://127.0.0.1:4001`** (+ `/compose`, `/topics`, `/admin/apps`).
Muốn đặt lại console sau prefix → build với `BASE_PATH=/apps/ews-astrolink`; giá trị đó được
`next.config.mjs` inline lúc build (`env.BASE_PATH`), **không** đọc được lúc chạy.

Thêm primitive shadcn: `pnpm dlx shadcn@latest add <name>` rồi sửa `import { cn } from "cn"` →
`@/lib/utils` (bẫy §6). Không được overwrite `button.tsx` khi CLI hỏi.

### 2.2. Đấu nối backend (`ews-astrolink-api`)

Browser **không bao giờ** gọi thẳng backend. Mọi request quản trị đi qua phía server của Next (BFF):
server component / route handler / server action gọi `http://ews-astrolink-api:3000/admin/*` qua
network `ews-net`. Nhờ vậy backend không cần CORS, và `EWS_ADMIN_TOKEN` — token cấp TOÀN QUYỀN
`/admin/*` (ADR-0015 §4 của backend) — không có đường ra browser.

| Biến (`.env`) | Nghĩa |
|---|---|
| `EWS_API_URL` | `http://ews-astrolink-api:3000` trong docker; `http://127.0.0.1:4002` khi `pnpm dev` |
| `EWS_ADMIN_TOKEN` | trùng `ADMIN_TOKEN` của backend |
| `EWS_ORG_ID` | org console đang quản trị — `GET /admin/apps` bắt buộc query `orgId` |

*   **Tuyệt đối không đặt tên `NEXT_PUBLIC_*`** cho ba biến trên. `lib/api/client.ts` mở đầu bằng
    `import 'server-only'` nên build sẽ đỏ ngay nếu có component client lỡ import.
*   **Kiểu dữ liệu sao đúng DTO của backend**, để ở `lib/api/types.ts` (không `server-only` — component
    client cần import type). Đổi tên field là đổi hợp đồng, phải sửa cả hai bên.
*   **Lỗi backend theo RFC 9457** (`application/problem+json`). UI map theo `code`, **không** parse
    `detail`. Exception path là UI thật (`<EmptyState>` nêu mã lỗi), không phải toast.
*   Backend hỏng **không được** biến thành màn trống im lặng — người trực phải đọc được lý do.

Hai cách gọi, chọn theo việc server có biết `appId` lúc render hay không:

*   **Server Component** khi dữ liệu không phụ thuộc app đang chọn (`/admin/apps`) — đọc thẳng
    trong `page.tsx`, `export const dynamic = 'force-dynamic'`.
*   **Server Action** khi dữ liệu thuộc app đang chọn (`/topics`, `/settings/credentials`). App đang chọn nằm trong state
    client của `<AppProvider>`, server lúc render chưa biết `appId`. Action vẫn chạy phía server nên
    token không lộ. **Không ném lỗi qua ranh giới server/client** (Next nuốt message ở production
    build) — trả `ActionResult` có `code` để màn hình dựng exception path thật.

Deploy lên server (theo `../../docs/QUY_TRINH_LAM_VIEC_SUA_CODE_VA_DEPLOY.md` §5):

```bash
ssh $HOST "cd $APP/webservice/ews-astrolink && docker compose up -d --build"
```

```bash
ssh $HOST "curl -I http://127.0.0.1:4001"
```

### 2.4. Màn chưa đấu backend phải TỰ NHẬN là bản xem trước

Console là công cụ vận hành. Một màn quản trị hiện số giả mà không nói gì thì **tệ hơn là không có
màn đó** — người trực không phân biệt được "hệ thống yên" với "màn này bịa". Đây là Việc 1 của
`../ews-astrolink-api/docs/de-xuat/0002-viec-can-lam-de-hoan-thien-mvp.md`.

Cách làm: `lib/preview-routes.ts` giữ **`WIRED_ROUTES`** — danh sách route ĐÃ đọc dữ liệu thật.
`<PreviewBanner>` render **một lần** trong `<AppShell>` và tự ẩn ở những route đó.

*   Liệt kê theo chiều **ngược** là có chủ đích: route mới mặc định là "chưa thật". Quên cập nhật
    thì sai về phía an toàn, thay vì im lặng hiện số giả.
*   Đấu xong một màn -> **thêm một dòng vào `WIRED_ROUTES`**, không sửa chỗ nào khác, không gắn
    tay vào page.
*   Dải băng **cố ý không có nút tắt**. Tắt được là tắt xong quên mất.
*   Nó **không thay** `<EmptyState>` khi backend chết (mục 2.2) — hai chuyện khác nhau: "màn này
    chưa làm" và "màn này làm rồi nhưng backend đang hỏng".

`WIRED_EXACT_ROUTES` là danh sách thứ hai: route **đã đấu nhưng chỉ chính nó**, route con vẫn là
bản xem trước. `/users` nằm ở đây vì `/users/import` chưa đấu (và sẽ không bao giờ đấu — backend
không có nhập CSV). `/notifications` cũng vậy: `/notifications/[id]`
vẫn là bản mẫu. `/notifications/errors` nằm riêng trong danh sách này: không gọi API, nhưng bảng
mã lỗi là hợp đồng tĩnh sao đúng backend, nên cũng là số thật.

`WIRED_DETAIL_ROUTES` là danh sách thứ ba: trang chi tiết `[id]` **đúng một đoạn** dưới một route,
kèm `preview` = route tĩnh cùng cấp vẫn là mẫu. `/users/[id]` đã đấu nhưng `/users/import` khớp
cùng hình dạng — thiếu nó trong `preview` là gỡ nhãn khỏi màn mẫu.

Tính tới 09/2026: `/admin/apps` · `/apps/new` · `/topics` · `/settings/credentials` (kèm route con),
`/users` · `/notifications` · `/notifications/errors` (chỉ chính nó) và `/users/[id]` (trừ `/users/import`).

Dải băng **không phủ khung** (thanh trên, sidebar). Số nào hiện ở đó phải là số thật — cái
chuông từng hiện `pendingApprovalCount()` của mock, nay đếm từ `useApp().apps`.

### 2.5. Wizard đăng ký app — chuỗi nhiều lời gọi, KHÔNG có transaction

Backend không có lệnh gộp "đăng ký app". `registerAppAction` gọi lần lượt:

```
POST /admin/apps                      -> draft
POST /admin/apps/:id/network-rules    (mỗi origin / CIDR một lời gọi)
POST /admin/apps/:id/topics           (mỗi chủ đề một lời gọi)
POST /admin/apps/:id/submit           -> pending_approval
```

Bốn bước này **không chung transaction**, nên chuỗi có thể dừng giữa chừng. Quy ước đã chốt:

*   **Chỉ lời gọi đầu** (tạo app) mới trả `ok: false`. Lúc đó chưa có gì trong hệ thống.
*   **Sau khi app đã tồn tại**, mọi lỗi đều trả `ok: true` kèm `stoppedAt` (bước nào, vì sao).
    Nói "thất bại" trong khi app đã nằm trong DB là nói sai: người dùng cần biết `app_id` để vào
    sửa nốt, chứ không phải bấm tạo lại rồi dính `APP_SLUG_TAKEN`.
*   `approveAndIssueKeyAction` cũng vậy: duyệt xong mà cấp khoá hỏng thì app **vẫn active** —
    trả `secret: null` + `stoppedAt`, không báo thất bại.

**Cửa duyệt chính là `/admin/apps`, không phải wizard.** Bước 4 của wizard chỉ là lối tắt cho
người vừa tạo xong; phiên đó đóng lại là mất. App `pending_approval` phải duyệt được từ danh
sách, nếu không là **đường cụt** — app kẹt vĩnh viễn, không màn nào mở ra được. Vì vậy
`approveAndIssueKeyAction` đặt ở `app/admin/apps/actions.ts` và wizard import ngược lại.

Hệ quả: `/admin/approvals` (còn mock) **đã gỡ khỏi menu** — hai cửa duyệt, một cửa giả, là cách
chắc chắn để người mới bấm nhầm. Thư mục route giữ nguyên cho ai còn bookmark.

Phần nhập quyền cấp nằm ở **`<GrantFields>`**, dùng chung cả hai cửa. Có hai bản là sớm muộn
lệch nhau — và lệch ở đây nghĩa là một cửa bỏ qua ô xác nhận bắt buộc.

**Bước 1–3 chỉ là nháp trong trình duyệt.** Bấm gửi ở bước 3 mới ghi thật, và từ đó không quay
lại được — wizard bỏ nút Quay lại ở bước 4 đúng vì vậy.

Form của wizard **sao đúng body backend, không hơn**. Bản v0 từng có `description`,
`technical_contact`, `severity`, `userMutable`, kênh riêng cho từng chủ đề và ô "quota đề xuất"
ở bước 1 — backend không có cột nào chứa chúng, nên đã bỏ. Nhập vào rồi mất im lặng còn tệ hơn
là không có ô. Kênh và hạn mức hỏi ở **bước 4**, vì chúng là quyền cấp lúc duyệt, không phải
thuộc tính lúc tạo.

### 2.6. Vòng đời app trên `/admin/apps` — nút phải khớp máy trạng thái

`ACTIONS_BY_STATUS` trong `app-admin-list.tsx` **sao đúng bảng `APP_TRANSITIONS`** của backend
(`apps/domain/rules/app-transitions.ts`):

| Trạng thái | Nút |
|---|---|
| `draft` | — (chỉ có `submit`, việc của wizard) |
| `pending_approval` | Duyệt |
| `active` | Tạm ngưng · Thu hồi |
| `suspended` | Mở lại · Thu hồi |
| `revoked` | — (**trạng thái kết thúc**, không có dòng trong bảng) |

Đừng dựng nút rồi để backend trả 409 `INVALID_TRANSITION` — trạng thái nào không có đường đi
hợp lệ thì **không có nút**.

*   **Thu hồi dùng `tone="blocking"`** và nói thẳng "không có đường quay lại". Đó là sự thật của
    máy trạng thái, không phải câu doạ cho sang.
*   **Lý do bắt buộc nhập** (console ép; backend cho phép bỏ trống). Nó đi vào `audit_log` —
    nhưng xem mục 6, chỗ này từng rơi mất im lặng.
*   **`key` trên `<AppTransitionDialog>`** theo `app.id:action`. Không có nó, `reason` sống sót
    qua lần đóng thành công và lý do của lần Tạm ngưng trước bị ghi cho lần Thu hồi sau.

Ô chọn app: menu đã có `<StatusPill>` cho từng app; **chấm trên nút mở menu** lấy màu từ
`statusColors` theo trạng thái thật — app đang tạm ngưng mà hiện chấm xanh là nói dối ở chỗ
luôn nhìn thấy. Không làm mờ app bị ngưng: vẫn phải vào xem được chủ đề, khoá, nhật ký của
chính app đang có vấn đề.

### 2.7. Màn Người nhận — chỉ đọc, và vì sao

`/users` đọc `GET /admin/apps/:appId/users`. Bấm một dòng -> trang chi tiết
`/users/[externalId]?app=<slug>`, đọc `.../users/:externalId` + `.../users/:externalId/preferences`
+ lịch sử gửi của người đó (`implementation_plan.md` §5 — bề mặt đọc cho vận hành, ĐX-0004).

*   **Trang chi tiết trả lời cả hai câu hỏi hỗ trợ trên một màn**, xếp dọc, không chia tab:
    "có bị chặn không" (`<RecipientPreferences>`) và "thư đã ra sao" (`<NotificationsTable
    recipient>`). Chia tab là bắt người trực bấm qua lại giữa hai nửa của cùng một câu trả lời.
*   **Link sang trang chi tiết phải mang `?app=`** — luôn dựng bằng `recipientHref()`, không tự
    ghép chuỗi. App đang chọn chỉ nằm trong state client; tải lại là về app đầu tiên, và cùng
    mã ở hai app là hai người khác nhau. Mở trang -> ô chọn app chuyển theo `?app=`; SAU ĐÓ người
    dùng đổi app -> về `/users`. Đồng bộ bằng `useEffect` (không đặt state của `<AppProvider>` lúc
    render được) và chỉ gọi API khi app đã khớp — gọi sớm là đọc nhầm app.
*   Mở thẳng bằng link thì không có dòng danh sách để lấy địa chỉ -> đọc
    `GET .../users/:externalId` (khớp ĐỦ mã). **Không** thay bằng `listRecipients({ q })`: `q`
    khớp một phần.

*   **KHÔNG có Thêm / Import CSV / Xuất CSV.** Backend không có đường nào cho chúng, và người nhận
    là do app service khai qua `/v1`, không phải quản trị nhập tay. `users-table.tsx` và
    `add-user-dialog.tsx` của bản v0 vì vậy **không còn ai dùng** — giữ lại như segment filter
    (mục 2.3), không xoá, nhưng đừng nối lại nếu chưa có backend.
*   **KHÔNG có công tắc bật/tắt chủ đề.** Consent là ý muốn của người dùng; admin sửa hộ là mất
    hết ý nghĩa của cổng L0/L1/L3. App service tự ghi qua `PUT /v1/users/:id/preferences`.
*   **Hai cột phải hiện CẢ HAI**, chúng trả lời hai câu khác nhau:
    - *Người này đã chọn* = `optedIn`. `null` -> "chưa chọn", đang theo `defaultMode`.
    - *Qua được lớp chủ đề* = `effectiveOptIn`, **CHỈ lớp L3**.
*   **Phải nói rõ `effectiveOptIn` không phải câu trả lời cuối.** Email chết (L0) hoặc
    `optedOutOptional` (L1) vẫn chặn thư dù cột đó ghi "có". `<RecipientPreferences>` hiện một
    `<Alert>` ở đầu khối khi L0/L1 đang chặn — bỏ dòng đó là để người trực đọc sai màn hình.
*   Địa chỉ email lấy từ **`GET .../users/:externalId`** (cùng dạng dòng danh sách), không phải từ
    route preferences: backend cố ý không đưa địa chỉ vào `UserEmailSummary`. Đừng nới DTO của
    backend chỉ để tiện cho một màn.
*   `user-detail.tsx` (bản v0 của `/users/[id]`: tab Subscriptions / Tags / Nhật ký, Xoá user,
    Thêm SĐT) **không còn route nào dùng** — backend không có chức năng nào trong đó. Giữ lại,
    không xoá, không nối lại.

### 2.8. Lịch sử gửi — chỉ đọc, không địa chỉ, không route chi tiết

`/notifications` đọc `GET /admin/apps/:appId/notifications` (`implementation_plan.md` §5, ĐX-0002
Việc 2). Màn này trả lời "thư gửi anh A lúc 9 giờ ra sao"; màn Người nhận trả lời "anh A có bị
chặn không". Hai màn nối nhau: cột **Mã người nhận** là link sang trang chi tiết người đó
(mục 2.7), và trang chi tiết nhúng chính bảng này với `recipient` cố định.
`/notifications?externalId=…` vẫn mở được (lọc sẵn khi dán link), nhưng không còn nút nào trỏ tới.

*   **KHÔNG có Huỷ / Dừng / Gửi lại.** MVP không có lệnh nào như vậy. Bản v0 có hai nút đó ở
    `/notifications/[id]` — đừng đấu lại khi backend chưa có.
*   **KHÔNG hiện địa chỉ email, KHÔNG hiện nội dung thư.** Backend cố ý không trả hai thứ đó ở
    route này. Địa chỉ xem ở màn Người nhận.
*   **Chi tiết là panel trong cùng màn, không phải `/notifications/[id]`.** Dòng danh sách đã mang
    đủ mọi trường; panel `<NotificationOutcome>` không gọi thêm API.
*   **Lọc trạng thái chỉ có 5 giá trị** mà đường gửi trực tiếp thật sự tạo ra (`queued`, `sending`,
    `sent`, `no_recipient`, `failed`), không phải đủ 11. Sáu trạng thái kia thuộc gửi hàng loạt /
    hẹn giờ / phê duyệt, chưa có.
*   **Lọc mã người nhận là khớp ĐÚNG**, khác ô tìm ở màn Người nhận (khớp một phần). Backend đổi
    `externalId` ra `user_id` rồi mới lọc.
*   **`sent` = máy chủ thư đã nhận, chưa chắc đã vào hộp thư** — panel luôn nói câu này (UC-005
    BR-3). `error` bắt đầu bằng `outcome_unknown` = không chắc thư đã đi — panel nói rõ hệ thống
    **không tự gửi lại** (at-most-once, ADR-0016 của backend).
*   Đổi app thì xoá bộ lọc bằng **so `appId` lúc render**, không bằng `useEffect` như `/users`:
    effect chạy cả lần mount và sẽ xoá `?externalId=` vừa lấy từ link.
*   Link trong cột mã người nhận phải `stopPropagation` — không thì bấm link cũng mở panel của dòng.

`/subscriptions` (còn mock) **đã gỡ khỏi menu**: nó hiện đúng dữ liệu mà màn Người nhận giờ hiện
bằng số thật. Cùng lý do với `/admin/approvals` ở mục 2.5. Thư mục route giữ nguyên.

### 2.3. Segment filter — tạm ngưng, KHÔNG xoá

`components/topics/topic-segment-editor-dialog.tsx`, kiểu `SegmentFilterGroup` và mock kèm theo là
code **đang chờ**, không phải code chết. Segment nằm ngoài MVP
(`../ews-astrolink-api/implementation_plan.md` mục 3, làm tiếp ở mục 12.6) và backend chưa có endpoint
nào cho nó. Màn `/topics` đã gỡ lời gọi để chỉ hiện đúng field `TopicDto` có thật. Khi backend làm
segment thì nối lại từ file đó.

---

## 3. Các khối component chính

Danh sách chuẩn (spec đầy đủ ở `01_prompt_foundation.md` §2). Dựng đúng tên file và props này để mọi
màn hình sau gọi được. Cột "Có" = đã tồn tại trong repo (09/2026).

| Component | File | Có | Vai trò |
|---|---|---|---|
| `<CosmicBackground>` | `components/cosmic-background.tsx` | ✓ | nền nebula + starfield seeded, fixed |
| `<Panel glow? ring?>` | `components/panel.tsx` | ✓ | glass surface (`.cosmic-surface`), orbit ring tuỳ chọn; forward mọi prop `<section>` |
| `<AppShell>` | `components/app-shell.tsx` | ✓ | left rail 240px, app switcher, role switcher, top bar |
| `<PageHeader title subtitle breadcrumb actions>` | `components/page-header.tsx` | ✓ | `breadcrumb: Breadcrumb[]` = `Array<{label; href?}>`; có `href` → render `next/link` |
| `<StatusPill status>` | `components/status-pill.tsx` | ✓ | **nguồn màu duy nhất** — 11 trạng thái notification + app / template / subscription / binding |
| `<StatPill label value delta?>` | `components/stat-pill.tsx` | ✓ | số lớn mono + sparkline |
| `<DataTable columns rows onRowClick empty rowClassName? hideSearch?>` | `components/data-table.tsx` | ✓ | bọc shadcn `<Table>`; 13px, row 44px; `Column<T>` có `mono` / `numeric` / `render(row)`. `hideSearch` khi màn đã có ô tìm phía máy chủ (bẫy ở mục 6) |
| `<EmptyState icon title description action>` | `components/empty-state.tsx` | ✓ | orbit SVG, không emoji |
| `<CodeBlock language value copyable>` | `components/code-block.tsx` | ✓ | toast "Đã sao chép" |
| `<ConfirmDialog title facts confirmLabel onConfirm>` | `components/confirm-dialog.tsx` | ✓ | bọc shadcn `<Dialog>`; `facts` = 3 dòng mono; `confirmLabel` nói rõ hậu quả (`Gửi cho 43 người`); prop `tone="blocking"` / `confirmHref` / `children` / `confirmDisabled` cho modal chặn hoặc có form bên trong |
| `<QuotaArc used max>` | `components/quota-arc.tsx` | ✓ | vòng quota duy nhất — top bar (size-5) và `/settings/quota` (size-28, có `children` ở giữa); đổi màu solar ≥ 80 %, supernova khi chạm trần |
| `<RepeatableInput values onChange validate>` | `components/repeatable-input.tsx` | ✓ | ô nhập lặp (domain / CIDR) → chip mono có nút bỏ; dùng ở wizard step 1 |
| `<ReEnableDialog subscription onConfirm>` / `<FixAddressDialog>` | `components/users/re-enable-dialog.tsx`, `fix-address-dialog.tsx` | ✓ | UC-007 BR-9: `unsubscribed` → Bật lại (bắt buộc bằng chứng), `invalid` → Sửa địa chỉ — dùng chung `user-detail` (bản v0, không còn route nào dùng) và Preference center (08) |
| `<OrbitStepper steps step>` | `components/apps/orbit-stepper.tsx` | ✓ | stepper orbit N bước — wizard app (4) và import CSV (3) |
| `<CredentialDialog app apiKey open onClose>` | `components/apps/credential-dialog.tsx` | ✓ | modal show-once (UC-001 §D) — dùng chung `/settings/credentials` (khoá THẬT), wizard step 4 và `/admin/approvals/[id]` (hai màn sau còn mock → truyền `DEMO_API_KEY`) |
| `<PreviewBanner>` | `components/preview-banner.tsx` | ✓ | dải băng "Bản xem trước — số liệu minh hoạ" cho route ngoài `WIRED_ROUTES`; bọc shadcn `<Alert>`, không prop, không tắt được (mục 2.4) |
| `<GrantFields id grant onGrantChange acknowledged onAcknowledgedChange>` | `components/apps/grant-fields.tsx` | ✓ | **nguồn duy nhất** của phần nhập quyền cấp lúc duyệt: 2 hạn mức + cảnh báo "lưu nhưng chưa đối chiếu" + ô tick bắt buộc; dùng chung wizard bước 4 và `<ApproveAppDialog>` |
| `<ApproveAppDialog app pending error onCancel onConfirm>` | `components/apps/approve-app-dialog.tsx` | ✓ | hộp duyệt ở `/admin/apps`; bọc `<ConfirmDialog>`, `app = null` là đóng |
| `<RecipientDetail externalId appSlug>` | `components/users/recipient-detail.tsx` | ✓ | trang chi tiết một người nhận (mục 2.7): đầu trang có địa chỉ + tình trạng, rồi cài đặt nhận tin, rồi các lần gửi; `page.tsx` truyền `key` theo app + mã |
| `recipientHref(appSlug, externalId)` | `components/users/recipient-href.ts` | ✓ | **nguồn duy nhất** của link sang `/users/[id]` — luôn kèm `?app=` |
| `<RecipientPreferences recipient preferences error loading>` | `components/users/recipient-preferences.tsx` | ✓ | khối cài đặt nhận tin trong trang chi tiết; chỉ đọc, cảnh báo L0/L1 ở đầu (mục 2.7); kèm `SUPPRESSED_LABEL` |
| `<NotificationsTable initialExternalId? recipient?>` | `components/notifications/notifications-table.tsx` | ✓ | bảng lịch sử gửi (mục 2.8); `recipient` = cố định một người: ẩn ô gõ mã và cột mã |
| `<NotificationOutcome notification appSlug onClose>` | `components/notifications/notification-outcome.tsx` | ✓ | panel chi tiết một lần gửi (mục 2.8); kèm `outcomeOf()` + `EXCLUSION_LABEL` — nguồn duy nhất của chữ "kết cục", dùng chung cột bảng và panel; `appSlug = null` khi đã ở trang của người đó (không link về chính nó) |
| `<AppTransitionDialog app action pending error onCancel onConfirm>` | `components/apps/app-transition-dialog.tsx` | ✓ | Tạm ngưng / Mở lại / Thu hồi; bọc `<ConfirmDialog>`, bắt buộc nhập lý do, `tone="blocking"` cho thu hồi; **phải truyền `key`** theo app + hành động (mục 2.6) |
| `<AuditTrail entries>` | `components/audit-trail.tsx` | ✓ | actor · action · `cũ → mới` · source |
| `<ReasonBadge>` / `<SourceBadge>` | `components/reason-badge.tsx`, `source-badge.tsx` | ✓ | "vì sao nhận" / "nguồn" |
| `<ResolutionPipeline topicKey readOnly?>` | `components/resolution-pipeline.tsx` | ✓ | pipeline 5 bước giải người nhận — dùng chung Topics và Composer |
| `<LifecycleTimeline notification compact?>` | `components/lifecycle-timeline.tsx` | ✓ | vòng đời 11 trạng thái (SVG orbital), node đã đi qua + stub nhánh không đi + "event horizon" `queued → sending`; đường đi từ `lifecycleOf()` trong mock; reduced-motion để CSS lo (không `useReducedMotion` → tránh #418) |
| `<MailFrame subject body|bodyHtml device? header? footerNote?>` | `components/mail-frame.tsx` | ✓ | khung email nền sáng duy nhất (token `--mail-*`), footer opt-out có khoá (tooltip qua `footerNote`) — Composer block 3, chi tiết lần gửi và Template editor dùng chung; `bodyHtml` chỉ nhận HTML đã qua `renderHtmlPreview()` (sanitize + escape) |
| `<ContractPanel template topicKey schema>` | `components/templates/contract-panel.tsx` | ✓ | Hợp đồng biến (05 §E): required_vars + payload mẫu + lỗi thường gặp — editor và tab Template của topic dùng chung |
| Composer blocks | `components/compose/{recipient,content,preview,send}-block.tsx`, `composer.tsx` | ✓ | 4 khối gated |
| `RoleContext` | `components/role-context.tsx` | ✓ | `RoleProvider` bọc `<AppShell>` trong `layout.tsx`; đọc bằng `useRole()` để gate nút / nhóm nav (`EWS Tổng` chỉ Super Admin) |
| `<AppRegistrationWizard>`, `<AppAdminList>` | `components/app-registration-wizard.tsx`, `app-admin-list.tsx` | ✓ | thêm từ v0 cho UC-001 — giữ, không tạo bản song song |

Thứ tự dựng: **foundation (01) trước, bắt buộc** → các màn hình còn lại theo `00_README_cach_dung.md`.
Nếu chỉ kịp làm 3 thứ: 01 → 06 (Composer) → 07 (Delivery log).

---

## 4. Business rule không được vi phạm

Đây là những rule đã được chuyển thành hình dạng UI. Làm mất chúng là **bug nghiệp vụ**, không phải
chuyện thẩm mỹ. Nguồn: `../../use_case_template/use_case_*.md`, `../../use_case_template/state_machine_notification.md`.

*   **Không có ô nhập email tự do** ở bất kỳ đâu (UC-008 BR-1). Người nhận = topic + binding.
*   **Số người nhận lúc soạn là ước lượng**, phải ghi rõ chữ "ước lượng" (UC-008 BR-4).
*   **Nút Gửi khoá** cho tới khi đã xem thử và không còn `{{ }}` sót (UC-008 BR-5). Theo dõi "đã xem thử"
    tự động khi block preview mount — **không** làm nút tay "Đã mở xem thử".
*   **Hộp xác nhận nêu đúng 3 con số**: topic / bao nhiêu người / template nào (UC-008 BR-5).
*   **`Huỷ` chỉ khi `queued`, `Dừng gửi` chỉ khi `sending`** — không bao giờ cùng lúc (SM-3).
*   **Không có nút thu hồi.** Thay bằng câu giải thích + `Gửi thư đính chính` (UC-008 BR-12).
*   **`no_recipient` màu trung tính ở đường API, là modal chặn ở đường tay** (UC-005 BR-7 vs UC-008 BR-10).
*   **`202` = đã nhận, không phải đã tới hộp thư** — callout không được bỏ (UC-005 BR-3).
*   **`unsubscribed` ≠ `invalid`**: hai section, hai hành động khác nhau (UC-007 BR-9).
*   **Binding table 1 dòng / 1 rule**, không bung thành từng người (UC-002 BR-4).
*   **`excluded` thắng `included`** — hiển thị khác biệt, có tooltip (UC-002 BR-6).
*   **Footer opt-out do hệ thống chèn**, hiển thị read-only có khoá (UC-006 BR-10).
*   **Credential chỉ hiện một lần**; trang credentials chỉ hiện hint (UC-001 BR-4). Khoá thật có
    dạng `ews_<32 hex>_<43 ký tự>`; `/v1/*` xác thực THẲNG bằng `Authorization: Bearer <khoá>`,
    **không** có bước đổi token. Cấp khoá mới **không** thu hồi khoá cũ — tối đa 2 khoá active
    đúng để xoay vòng không mất kết nối.
*   **Ô tick trước khi duyệt app**: "đội này đã có màn Cài đặt nhận thông báo". Backend không
    lưu, không vào audit — nó là **gờ giảm tốc, không phải hàng rào**. Giữ vì nhân viên chỉ tắt
    được thông báo nếu app tự dựng màn đó; không có thì cổng consent L0/L1/L3 vô dụng (ĐX-0003).
    Đừng bỏ ở một cửa mà giữ ở cửa kia — cả hai cùng dùng `<GrantFields>` đúng vì vậy.
*   **11 trạng thái notification**, đúng tên, đúng màu, qua `<StatusPill>` (SM §3).
*   **`GET` trang unsubscribe không đổi trạng thái** — chỉ `POST` (UC-007 BR-3).
*   **Exception path là UI thật**, không phải toast — mỗi spec màn hình có mục riêng cho nó.

Không chắc một thay đổi có đụng rule không → mở `../../use_case_template/v0/10_checklist_doi_chieu.md`.

---

## 5. Quy trình làm việc yêu cầu

### Khi dựng một màn hình mới từ spec

1.  **Đọc spec** (`../../use_case_template/v0/0N_prompt_<screen>.md`) và use case tương ứng. Liệt kê các
    mục A, B, C… và các exception state phải có.
2.  **Đề xuất ngắn:** cấu trúc file sẽ tạo, component nào tái dùng, field mock nào cần thêm (optional).
    Nêu rõ nếu spec mâu thuẫn với code hiện có.
3.  **Dựng:** tách file theo block/tab. Không hard-code hex. Không tạo component trùng vai trò.
4.  **Build:** `docker compose up -d --build` phải pass (mục 2.1). **Build pass không có nghĩa màn hình
    chạy** — và vì `next.config.mjs` đang `ignoreBuildErrors: true`, build pass cũng **không** chứng
    minh hết lỗi TypeScript; chạy thêm `pnpm exec tsc --noEmit` khi sửa type/props dùng chung.
5.  **Verify trong browser** (mở `http://127.0.0.1:4001/<route>` qua Playwright, không chạy server bằng
    Bash): mở đúng route, thao tác đúng luồng, xác nhận bằng **chuỗi cụ thể** (tên nút, trạng thái, số).
    Với luồng có state machine đi hết chuỗi `draft → confirm → countdown → queued → sending → stopped/sent`.
6.  **Kiểm tra tương thích:** mobile 375 / desktop, `prefers-reduced-motion`, không hydration mismatch,
    không console error, `docker compose logs ews-astrolink` sạch.
7.  **Đối chiếu** `10_checklist_doi_chieu.md` cho UC của màn hình đó, tick từng dòng.
8.  **Báo cáo thật:** mục nào đã verify trong browser, mục nào chỉ build, mục nào bỏ. Không overclaim.

### Khi sửa giao diện có sẵn

1.  **Phân tích:** đọc component, tìm shared component đang dùng, tra mục 4 xem rule nào đang bảo vệ
    màn hình đó.
2.  **Đề xuất** trước khi viết. Nêu rõ nếu chạm business rule và cách giữ.
3.  **Cập nhật code:** đoạn thay đổi rõ ràng, comment ngắn ở logic mới.
4.  Lặp lại bước 4–8 ở trên.

---

## 6. Bẫy đã gặp — kiểm tra trước khi kết luận "xong"

| Triệu chứng | Nguyên nhân | Cách tránh |
|---|---|---|
| Bấm nút, dialog không hiện | render inline, bị `CosmicBackground fixed` che | portal + `z-[100]` |
| Nút Gửi luôn disabled | gating bằng `IntersectionObserver`, hoặc callback đổi identity mỗi render | đánh dấu khi block mount; derive từ state |
| Sidebar hiện 2 lần | page tự bọc `AppShell` | chỉ layout bọc |
| Nav 404 | stub catch-all bị xoá, chưa tạo folder thay | mỗi route một folder |
| Route động crash | `"use client"` + `async params` | server page → client component |
| Build lỗi ở `PageHeader` | breadcrumb truyền chuỗi / mảng chuỗi | type đã là `Breadcrumb[]` (`{label; href?}`); `tsc --noEmit` bắt được vì build bị `ignoreBuildErrors` |
| Simulation gửi xong trước khi kịp Dừng | timer quá nhanh | ~2 người/giây |
| Hai panel ra hai con số khác nhau | tính lại ở từng component | một helper trong `lib/mock-data.ts` |
| JSX vỡ `</Panel>}` | Edit trượt trong file > 1 000 dòng | tách file theo tab/block |
| Hydration mismatch ở starfield | `Math.random()` lúc render | seeded PRNG |
| Hydration #418 khi `prefers-reduced-motion: reduce` | `useReducedMotion()` SSR trả `null`, client trả `true` → class/element khác nhau ngay lần render đầu | animation gate bằng CSS `@media (prefers-reduced-motion)` (đã có ở globals.css); chỉ dùng `useReducedMotion` cho phần render sau khi user tương tác |
| Trang tràn ngang ở 375 dù bảng đã `overflow-x-auto` | grid/flex item `min-width:auto` → track phình theo min-content của `pre`/`table`/`TabsList w-fit` | `min-w-0` lên con của grid; `TabsList className="h-auto w-full flex-wrap"` |
| Dialog cắt mất chữ bên TRÁI, có thanh cuộn ngang ẩn | `<DialogContent>` là `grid`, cột `auto` phình theo max-content của `<pre>`/chuỗi mono dài; dialog mở ra tự focus một nút nằm ngoài vùng nhìn → trình duyệt cuộn ngang container, nội dung trôi trái, `overflow-x-hidden` cắt đi | `grid-cols-[minmax(0,1fr)]` trên `DialogContent` (đã có ở `ConfirmDialog` và `CredentialDialog`); kiểm bằng `el.scrollWidth` vs `clientWidth`, không chỉ đọc `innerText` |
| `border-<màu>` không ăn, viền luôn ra `--orbit` | `app/globals.css:88` có `* { border-color: var(--orbit) }` **ngoài `@layer`** — rule không layer thắng mọi utility Tailwind, bất kể specificity | biết trước là nó sẽ không ăn (`forbidden-notice.tsx` và `<PreviewBanner>` đều dính); cần viền màu thật thì theo `<StatusPill>` — `style={{ borderColor }}` lấy màu từ `lib/theme.ts`. Đừng gỡ dòng 88: nó đang đặt viền mặc định cho cả console |
| Docker build fail ở `next/font` | build không có internet để tải Google Fonts | build trên máy có mạng; không đổi sang font local nếu chưa được duyệt |
| Trang trắng, asset 404 sau khi đổi prefix | `BASE_PATH` lúc build khác đường dẫn đang phục vụ | `BASE_PATH` là quyết định BUILD-TIME, build lại khi đổi (mục 2.1) |
| Link nhảy ra ngoài prefix | dùng `<a href="/…">` thô | dùng `next/link` |
| Mở dropdown là trắng trang, console `Base UI error #31` | `DropdownMenuLabel` (= `Menu.GroupLabel`) đặt NGOÀI `<DropdownMenuGroup>` | để label bên trong group; message thật nằm ở `node_modules/@base-ui/react/esm/menu/group/MenuGroupContext.js` |
| Trang quản trị hiện dữ liệu rỗng dù backend chết | nuốt lỗi API | `<EmptyState>` / `<NoAppsScreen>` nêu mã lỗi (mục 2.2) |
| Ô nhập trong dialog giữ giá trị của lần mở trước | `<ConfirmDialog>` chỉ bật/tắt `open`, component không remount; reset trong `onCancel` không chạy khi đóng do thành công | `key` theo mục tiêu (`app.id:action`) để React dựng lại — với dialog ghi audit thì đây là bug **ghi sai dữ liệu**, không phải lỗi hiển thị |
| Hai ô tìm kiếm cạnh nhau, ra kết quả khác nhau | `<DataTable>` luôn dựng ô lọc riêng (lọc **trang đang hiển thị**), màn lại có thêm ô tìm phía máy chủ | `hideSearch` trên `<DataTable>` khi đã có tìm server-side; hai ô trông giống nhau nhưng một cái chỉ thấy 25 dòng đang mở |
| Hành động chỉ có trong một phiên wizard | đặt nút duyệt ở bước cuối wizard, không có ở danh sách | thao tác đổi trạng thái phải có ở màn **danh sách**; wizard chỉ là lối tắt (mục 2.5) |
| Số giả trên thanh trên / sidebar | `<PreviewBanner>` chỉ phủ vùng `<main>`, không phủ khung | số nào hiện ở khung phải lấy từ dữ liệu thật (`useApp().apps`), không từ `lib/mock-data.ts` |
| Form wizard có ô mà backend không lưu | dựng form theo mock `App`/`Topic` (giàu field) thay vì theo body route | đối chiếu `admin-*.routes.ts` trước khi thêm ô; field không có chỗ chứa thì **bỏ ô**, đừng để người dùng nhập rồi mất im lặng |
| Báo "tạo app thất bại" trong khi app đã có trong DB | chuỗi nhiều lời gọi không transaction, lỗi giữa chừng bị quy hết về `ok: false` | `stoppedAt` (mục 2.5) — app đã tồn tại thì luôn trả `ok: true` kèm chỗ dừng |
| Snippet hướng dẫn tích hợp dạy sai luồng thật | snippet mock dựng endpoint không tồn tại (`POST /v1/auth/token`) | snippet phải sao đúng route + body backend; đối chiếu `*-routes.ts` trước khi viết |
| Bảng mã lỗi dạy mã không tồn tại | bản v0 có `token_expired`, `missing_variable`, `rate_limited`, header `Idempotency-Key` — không mã nào backend trả | `lib/api/v1-errors.ts` sao đúng backend + `docs/huong-dan-tich-hop-cho-doi-app.md` mục 8; backend đổi mã thì sửa cả hai. Nhớ: `422` có mã cụ thể trong `issues[].code`, `code` ngoài chỉ là `VALIDATION` |
| Lỗi Server Action ra màn hình thành câu chung chung | ném `Error` qua ranh giới server/client — production Next thay message | trả `ActionResult` của `lib/api/result.ts`, map theo `code` |
| Build pass nhưng type sai | `ignoreBuildErrors: true` | `pnpm exec tsc --noEmit` |
| Container "Up 1 second" liên tục, browser navigate fail ngẫu nhiên | chạy docker qua `wsl -e ...` từ Windows: WSL **tự tắt khi idle** sau mỗi lệnh → dockerd chết → container restart | giữ WSL sống: `Start-Process wsl -ArgumentList '-e','sleep','infinity' -WindowStyle Hidden` (hoặc mở sẵn 1 terminal WSL) |
| Font/token khai trong `@theme inline` nhưng rule CSS thường `var(--font-sans)` không ăn | `inline` chỉ inline vào utility, **không** phát biến ra runtime | trong `globals.css` dùng `@apply font-sans` / `@apply font-heading`, không `var()` |
| `pnpm dlx shadcn add` sinh `import { cn } from "cn"` | CLI shadcn v4 không đọc alias `utils` | sửa tay thành `@/lib/utils` ngay sau khi add |
| `<Button variant="default">` không có màu chữ, `outline`/`destructive` không viền | `shadcn/tailwind.css` **không** có biến màu; hợp đồng `--color-primary-foreground`, `--color-input`, `--color-destructive`, `--color-ring`… phải tự khai | đã khai đủ trong `@theme inline` của `globals.css` — thêm component shadcn mới thì kiểm tra nó cần token nào |
| Toast sonner / popup base-ui không có màu | chúng đọc `var(--popover)`, `var(--border)`, `var(--radius)` **runtime**, không phải `--color-*` trong `@theme inline` | đã khai ở `:root` trong `globals.css` |
| Glow / overlay viết `rgba(...)` thẳng trong class | vi phạm "không hard-code màu" | dùng `--glow-panel` / `--glow-starlight` / `--glow-starlight-lg` / `--glow-supernova` / `--overlay` / `--mail-*` (khai một lần ở `globals.css`) |
| `<select>` / `<input>` / `<button>` thô trong page | v0 export | luôn `NativeSelect` / `Input` / `Textarea` / `Button` / `Checkbox` / `Switch` / `ToggleGroup` / `Tabs` / `Dialog` / `Tooltip` / `Alert` / `Table` từ `components/ui/` |

---

## 7. Style Cosmic — tóm tắt để không phải mở spec

Palette THẬT trong `app/globals.css` (`:root`) và `lib/theme.ts` — bảng **sáng**:
`--void #F8FAFC` (nền) · `--deep #FFFFFF` (bề mặt) · nebula indigo `#E0E7FF` / violet `#EDE9FE` /
teal `#CCFBF1` · `--starlight #0284C7` (primary) · `--pulsar #9333EA` · `--solar #D97706` ·
`--supernova #E11D48` · `--aurora #059669` · text `#0F172A / #475569 / #94A3B8` ·
`--orbit #E2E8F0` (hairline).

Surface `.cosmic-surface`: `bg rgba(255,255,255,.85)`, `backdrop-blur(16px)`, border `--orbit`,
radius 16, shadow mảnh; `--glow-panel` là bóng đổ nhạt (không phải quầng sáng neon);
`.orbit-ring` = gradient border 1px starlight→pulsar→transparent.

StatusPill 11 trạng thái: `draft` slate · `pending_approval` amber · `scheduled` violet · `queued` cyan ·
`sending` cyan pulsing · `sent` emerald · `partially_failed` amber · `no_recipient` slate dashed ·
`stopped` orange · `cancelled` slate · `failed` rose.

Hai visual "đắt" nhất, phải làm cẩn thận: **pipeline 5 bước** (orbital flow, particle drop-off) và
**event horizon** giữa `queued → sending` trên lifecycle timeline.

---

## 8. Tham chiếu

Tất cả tính từ `webservice/ews-astrolink/`:

*   Thứ tự dựng & nguyên tắc: `../../use_case_template/v0/00_README_cach_dung.md`
*   Spec màn hình: `../../use_case_template/v0/01_prompt_foundation.md` → `09_prompt_superadmin_ops.md`
*   Checklist rule ↔ màn hình: `../../use_case_template/v0/10_checklist_doi_chieu.md`
*   Quyết định đã chọn thay người dùng / chỗ còn treo: `../../use_case_template/v0/11_gia_dinh_va_cho_chot.md`
*   Use case gốc (`../../use_case_template/`): `use_case_add_app_feature_fix.md` (UC-001),
    `use_case_manage_user_subscriber.md` (UC-002), `use_case_send_notification_api.md` (UC-005),
    `use_case_manage_mail_template.md` (UC-006), `use_case_unsubscribe_resubscribe.md` (UC-007),
    `use_case_compose_send_email.md` (UC-008), `state_machine_notification.md`
*   Quy trình deploy chung của portal: `../../docs/QUY_TRINH_LAM_VIEC_SUA_CODE_VA_DEPLOY.md`
*   Port mini-app đang dùng: `grep -h "127.0.0.1:" ../*/docker-compose.yml` — thêm app mới không được trùng
