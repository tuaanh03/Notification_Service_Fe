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
│   ├── layout.tsx            # RootLayout: fonts + <AppProvider> > <AppGate> > <AppShell> (bọc đúng 1 lần);
│   │                         # server component — nơi DUY NHẤT nạp danh sách app (/admin/apps)
│   ├── globals.css           # token Cosmic (--void, --starlight, …)
│   ├── page.tsx              # /            Tổng quan + actions.ts — ĐÃ đấu API (mục 2.11)
│   ├── compose/              # /compose     Composer (UC-008)
│   ├── notifications/        # /notifications + actions.ts — Lịch sử gửi ĐÃ đấu API (mục 2.8)
│   │                         # /notifications/errors = bảng mã lỗi /v1 THẬT (tĩnh, lib/api/v1-errors.ts);
│   ├── topics/               # /topics + actions.ts (Server Action gọi /admin/apps/:appId/topics)
│   │                         # (CHƯA có /topics/[key])
│   ├── users/                # /users + actions.ts — màn Người nhận ĐÃ đấu API (mục 2.7)
│   │                         # /users/[id]?app= = trang chi tiết một người, ĐÃ đấu (mục 2.7);
│   ├── templates/            # /templates + actions.ts — ĐÃ đấu API (mục 2.12); /templates/new tạo,
│   │                         # /templates/[id] màn soạn (id = templateId, UUID)
│   ├── apps/new/             # /apps/new + actions.ts — wizard đăng ký app ĐÃ đấu API (UC-001, mục 2.5)
│   │                         # actions.ts chỉ giữ registerAppAction; DUYỆT ở app/admin/apps/actions.ts
│   ├── settings/{credentials,webhooks,tracking,limits}/
│   │                         # credentials/, webhooks/ có actions.ts (đã đấu API); còn lại vẫn mock
│   ├── orgs/                 # /orgs, /orgs/[orgId], /orgs/[orgId]/members — trang Tổ chức + màn Thành viên (mục 2.9)
│   └── admin/{apps,audit,directory,settings,security}/
│                             # KHU QUẢN TRỊ EWS — chỉ Super Admin, khung riêng <AdminShell> (mục 2.9);
│                             # layout.tsx chặn người khác bằng 404; page.tsx chuyển /admin -> /admin/apps
│                             # apps/ có actions.ts (approveAndIssueKeyAction — chỉ còn cho app CŨ chờ duyệt, mục 2.5)
│                             # apps/[appId]/network/ = Giới hạn IP của một app (mục 2.10) — ĐÃ đấu API
│                             # settings/ = Cài đặt hệ thống (ADR-0030 của backend, mục 2.14) — ĐÃ đấu API
│                             # security/ = Theo dõi & Bảo mật (ADR-0039 của backend, mục 2.15) — ĐÃ đấu API
│                             # directory/ = Danh bạ (ADR-0027 của backend) — ĐÃ đấu API: nút Đồng bộ M365 (CHỈ ở đây,
│                             # không ở màn Thành viên) + tích ai hiện trong hộp "Thêm thành viên" của các org
├── components/               # shared component (bảng ở mục 3)
│   ├── compose/*             # 4 block Composer (UC-008)
│   ├── topics/*              # topics-page, create-topic-dialog (đã đấu API);
│   │                         # topic-segment-editor-dialog = TẠM NGƯNG sau MVP, KHÔNG xoá (mục 2.3)
│   │                         # (CHƯA có topic-detail / tab)
│   ├── apps/*                # wizard step-*, orbit-stepper, credential-dialog (UC-001)
│   │                         # grant-fields (quyền cấp lúc duyệt, dùng chung), approve-app-dialog,
│   │                         # app-transition-dialog (Tạm ngưng / Mở lại / Thu hồi — mục 2.6)
│   ├── admin/*               # approval-review (+ adjust-form: form điều chỉnh + diff), send-approval-review, send-approvals-table,
│                             # system-settings-panel, directory-page (màn Danh bạ), network-rules-panel (Giới hạn IP)
│   ├── notifications/*       # notifications-table (ĐÃ đấu API) + notification-outcome (panel chi tiết);
│   │                         # notification-detail (+ counters-row, recipients-tabs, content-panel, payload-panel) còn mock cho /notifications/[id];
│   │                         # scheduled-cards, error-codes-table, origin-badge
│   ├── users/*               # users-page + recipient-detail (+ recipient-preferences) — ĐÃ đấu API;
│   │                         # users-table, add-user-dialog, user-detail (+ profile-panel, subscriptions-panel,
│   │                         # data-tags-panel, event-log-panel) nay KHÔNG ai dùng (mục 2.7);
│   │                         # re-enable-dialog, fix-address-dialog, import-wizard (+ step-spec, step-preview), subscriptions-page
│   ├── templates/*           # templates-page/-table, template-create, template-editor (+ editor-top-bar, editor-error-alert,
│   │                         # compose-tab, integration-tab,
│   │                         # template-actions-menu, field-hint, editor-pane, preview-pane, schema-pane, versions-panel,
│   │                         # contract-panel) — ĐÃ đấu API (mục 2.12);
│   │                         # ai-compose-dialog = hộp thoại "Nhờ AI soạn" (gọi backend);
│   │                         # visual/* = bộ soạn trực quan GrapesJS + MJML (visual-editor + -loader nạp động, chip-plugin,
│   │                         # left-panel, properties-panel, color-field, blocks, email-settings, block-lint, subject-field,
│   │                         # grapes-i18n, insert-variable-dialog, compile-mjml, visual-editor.css) — ADR-0036 / 0037 của backend
│   │                         # (trình kéo-thả cũ đã gỡ hẳn — ADR-0037)
│   ├── settings/*            # credentials-panel, webhooks-page (2 tab) + webhooks-panel + webhook-dialogs + incoming-hooks-panel + incoming-hook-guide (mục 2.13), quota-panels, sync-panel (client) — page.tsx trong app/settings/* chỉ render
│   ├── app-context.tsx · app-gate.tsx · app-link.tsx · app-switcher.tsx
│   │                         # app đọc từ ?app=, cổng (thiếu app -> trang Tổ chức), link tự mang app (mục 2.9)
│   ├── preview-banner.tsx    # dải băng "Bản xem trước" cho màn chưa đấu backend;
│   │                         # AppShell render 1 lần, tự ẩn ở route trong WIRED_ROUTES (mục 2.4)
│   ├── no-apps-screen.tsx    # 0 app hoặc /admin/apps lỗi — thay cho AppShell
│   ├── admin-shell.tsx       # khung khu Quản trị EWS (/admin/*) — không ô chọn app, không cần ?app=
│   ├── orgs-shell.tsx · orgs/*   # trang Tổ chức /orgs (bảng org) + /orgs/[orgId] (bảng app của org) — cũng là nơi chọn app
│   ├── shell-parts.tsx       # mảnh dùng chung của AppShell + AdminShell: logo, nút thu gọn, menu tài khoản
│   └── ui/*                  # shadcn v4 (base-ui) — chỉ thêm qua CLI, không sửa tay:
│                             # alert avatar badge breadcrumb button checkbox collapsible dialog
│                             # dropdown-menu input label native-select resizable separator sheet
│                             # sidebar skeleton sonner switch table tabs textarea toggle
│                             # toggle-group tooltip
├── lib/{mock-data.ts,theme.ts,utils.ts,preview-routes.ts,app-routes.ts}
│                             # preview-routes: WIRED_ROUTES + WIRED_EXACT_ROUTES + WIRED_DETAIL_ROUTES (mục 2.4)
│                             # app-routes: ?app= trên đường dẫn — ORG_ROUTES, APP_DETAIL_ROUTES (mục 2.9)
├── lib/api/                  # đấu nối backend — client.ts (server-only) · problem.ts · types.ts
│                             # · result.ts (ActionResult + ActionStop) · apps.ts · topics.ts
│                             # · users.ts · notifications.ts · audit.ts · templates.ts · webhooks.ts · incoming.ts · system-settings.ts · index.ts
│                             # · v1-errors.ts (bảng mã lỗi /v1 — hợp đồng tĩnh, không server-only)
├── public/                   # icon, placeholder
├── Dockerfile · docker-compose.yml · .dockerignore   # xem mục 2.1
├── next.config.mjs           # output: 'standalone', basePath RỖNG (console có domain riêng)
└── package.json · pnpm-lock.yaml (v9) · pnpm-workspace.yaml · tsconfig.json · components.json
```

Stack thật: **Next 16.3 · React 19 · Tailwind v4** (`@tailwindcss/postcss`, không có `tailwind.config`) ·
**shadcn v4 trên `@base-ui/react`** (không phải Radix) · `sonner` (toast) · `framer-motion` 13 · `recharts` 3 ·
`lucide-react` · **pnpm** (trong WSL chạy qua `corepack pnpm`; shim `~/.local/bin/pnpm`).
`hooks/use-send-simulation.ts` giữ state machine gửi của Composer; `hooks/use-template-editor.ts` giữ state của màn soạn template (nạp / lưu nháp / xuất bản qua Server Action, biến chưa khai, xem thử); `lib/template-syntax.ts` là bản sao PHÍA TRÌNH DUYỆT của luật biến backend, chỉ để tô màu và xem thử.

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
*   **Shared component là nguồn duy nhất.** `<StatusPill>` là nơi duy nhất định nghĩa màu VÀ chữ của trạng thái
    (màu tra giá trị thô, chữ dịch qua nhóm `status`; chỗ khác cần chữ trạng thái — nút lọc, tuỳ chọn lọc, audit
    `from → to` — dùng `useStatusLabel()`, không in thẳng `active` / `draft`);
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
network `ews-net`. Nhờ vậy backend không cần CORS.

**Xác thực là PHIÊN ĐĂNG NHẬP, không còn token dùng chung** (ADR-0019 của backend). Token phiên nằm
trong cookie `httpOnly` `ews_session`: JavaScript trong browser không đọc được, `lib/api/client.ts`
đọc nó ở phía server rồi gắn vào `Authorization`. Đăng xuất gọi `/auth/logout` để backend XOÁ phiên
— không chỉ xoá cookie, vì xoá cookie mà phiên còn sống thì ai đã sao được token vẫn dùng tiếp.

| Biến (`.env`) | Nghĩa |
|---|---|
| `EWS_API_URL` | `http://ews-astrolink-api:3000` trong docker; `http://127.0.0.1:4002` khi `pnpm dev` |

*   **Không còn `EWS_ORG_ID`** (ADR-0022 của backend): `layout.tsx` gọi `GET /admin/me` lấy org + vai của
    người đăng nhập, rồi `GET /admin/apps?orgId=` cho từng org của `consoleOrgs(me)` (`lib/access.ts`): Super Admin MỌI org (xem được tất cả — ADR-0023
    của backend), người khác org mình là thành viên. Một console phục vụ mọi org. Hai khu qua lại bằng
    mục trong menu tài khoản (`switchArea` của `<AccountMenu>`).
*   **Tuyệt đối không đặt tên `NEXT_PUBLIC_*`** cho biến trên. `lib/api/client.ts` mở đầu bằng
    `import 'server-only'` nên build sẽ đỏ ngay nếu có component client lỡ import.
*   **Kiểu dữ liệu sao đúng DTO của backend**, để ở `lib/api/types.ts` (không `server-only` — component
    client cần import type). Đổi tên field là đổi hợp đồng, phải sửa cả hai bên.
*   **Lỗi backend theo RFC 9457** (`application/problem+json`). UI map theo `code`, **không** parse
    `detail`. Exception path là UI thật (`<EmptyState>` nêu mã lỗi), không phải toast.
*   Backend hỏng **không được** biến thành màn trống im lặng — người trực phải đọc được lý do.

Hai cách gọi, chọn theo việc server có biết `appId` lúc render hay không:

*   **Server Component** khi dữ liệu không phụ thuộc app đang chọn (`/admin/apps`) — đọc thẳng
    trong `page.tsx`, `export const dynamic = 'force-dynamic'`.
*   **Server Action** khi dữ liệu thuộc app đang chọn (`/topics`, `/settings/credentials`). App đang chọn đọc từ `?app=`
    ở client (`<AppProvider>`, mục 2.9) — server component của từng màn không nhận nó. Action vẫn chạy phía server nên
    token không lộ. **Không ném lỗi qua ranh giới server/client** (Next nuốt message ở production
    build) — trả `ActionResult` có `code` để màn hình dựng exception path thật.

Deploy lên server (theo `../../docs/QUY_TRINH_LAM_VIEC_SUA_CODE_VA_DEPLOY.md` §5):

```bash
ssh $HOST "cd $APP/webservice/ews-astrolink && docker compose up -d --build"
```

```bash
ssh $HOST "curl -I http://127.0.0.1:4001"
```

### 2.0. Màn mẫu ĐÃ XOÁ (đợt "Củng cố 1", 10/2026)

Mọi màn chỉ dựng bằng `lib/mock-data.ts` đã xoá hẳn (route + component chỉ chúng dùng + nhóm câu dịch): `/scheduled`,
`/settings/{profile,quota,sync}`, `/subscriptions`, `/users/import`, `/notifications/[id]`, `/admin/approvals(/[id])`,
`/admin/send-approvals(/[id])` — gõ URL ra 404. Đoạn nào bên dưới còn nhắc tới chúng (hoặc tới `users-table`, `user-detail`,
`notification-detail`, `MailFrame`, `QuotaArc`, `LifecycleTimeline`, `ResolutionPipeline`, `ReEnableDialog`…) là lịch sử,
không phải code đang có. Giữ lại có chủ đích: `topic-segment-editor-dialog.tsx` (chờ backend segment, mục 2.3) và
`lib/mock-data.ts` (code thật còn import KIỂU từ đó). Màn mới chưa có backend thì KHÔNG dựng bản mẫu nữa.

### 2.4. Màn chưa đấu backend phải TỰ NHẬN là bản xem trước

Console là công cụ vận hành. Một màn quản trị hiện số giả mà không nói gì thì **tệ hơn là không có
màn đó** — người trực không phân biệt được "hệ thống yên" với "màn này bịa". Đây là Việc 1 của
`../ews-astrolink-api/docs/de-xuat/0002-viec-can-lam-de-hoan-thien-mvp.md`.

Cách làm: `lib/preview-routes.ts` giữ **`WIRED_ROUTES`** — danh sách route ĐÃ đọc dữ liệu thật.
`<PreviewBanner>` render **một lần** trong `<AppShell>` và tự ẩn ở những route đó.

*   **Mục menu trỏ tới màn bản xem trước bị ẩn** (`<AppShell>` và `<AdminShell>` lọc bằng
    `isPreviewRoute`) — người dùng không thấy màn số giả. Gõ thẳng URL vẫn vào được, kèm dải băng.
    Đấu xong một màn thì thêm vào `WIRED_ROUTES` là mục tự hiện lại.

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

Tính tới 10/2026 (sau khi xoá màn mẫu, mục 2.0): mọi route còn lại đều đã đấu — `/admin/apps` · `/admin/audit` · `/admin/security` · `/apps/new` · `/topics` · `/templates` · `/settings/*` · `/admin/settings` (kèm route con),
`/` · `/users` · `/notifications` · `/notifications/errors` (chỉ chính nó) và `/users/[id]`.

Dải băng **không phủ khung** (thanh trên, sidebar). Số nào hiện ở đó phải là số thật — cái
chuông từng hiện `pendingApprovalCount()` của mock; nay đã bỏ hẳn vì không còn hàng chờ duyệt (ADR-0023).

### 2.5. Wizard đăng ký app — chuỗi nhiều lời gọi, KHÔNG có transaction

**App tự phục vụ (ADR-0023 của backend):** tạo xong là `active`, cấp sẵn kênh `email`, không
còn bước duyệt. Người tạo nhận khoá API ngay ở bước 4. Super Admin chỉ tạm ngưng / thu hồi app rác.

Backend không có lệnh gộp "đăng ký app". `registerAppAction` gọi lần lượt:

```
POST /admin/apps                      -> active (kênh email)
POST /admin/apps/:id/topics           (mỗi chủ đề một lời gọi)
POST /admin/apps/:id/secrets          -> khoá API đầu tiên (plaintext CHỈ ở đây, hiện một lần)
```

Bốn bước này **không chung transaction**, nên chuỗi có thể dừng giữa chừng. Quy ước đã chốt:

*   **Chỉ lời gọi đầu** (tạo app) mới trả `ok: false`. Lúc đó chưa có gì trong hệ thống.
*   **Sau khi app đã tồn tại**, mọi lỗi đều trả `ok: true` kèm `stoppedAt` (bước nào, vì sao).
    Nói "thất bại" trong khi app đã nằm trong DB là nói sai: người dùng cần biết `app_id` để vào
    sửa nốt, chứ không phải bấm tạo lại rồi dính `APP_SLUG_TAKEN`.
*   Bước cấp khoá hỏng thì app **vẫn active** — `secret: null` + `stoppedAt`, cấp lại ở Khoá API.
    `approveAndIssueKeyAction` (duyệt app CŨ) theo cùng quy ước.

**App CŨ** còn `draft` / `pending_approval` từ trước ADR-0023: duyệt ở `/admin/apps` (mục 2.6),
hộp `<ApproveAppDialog>` + `<GrantFields>`. Wizard không còn phần duyệt. `/admin/approvals`
(còn mock) vẫn **gỡ khỏi menu**; thư mục route giữ nguyên cho ai còn bookmark.

**Bước 1–3 chỉ là nháp trong trình duyệt.** Bấm tạo ở bước 3 mới ghi thật, và từ đó không quay
lại được — wizard bỏ nút Quay lại ở bước 4 đúng vì vậy. Bước 4 (`components/apps/step-done.tsx`)
hiện khoá qua `<CredentialDialog>` — đóng là mất.

Form của wizard **sao đúng body backend, không hơn**. Bản v0 từng có `description`,
`technical_contact`, `severity`, `userMutable`, kênh riêng cho từng chủ đề và ô "quota đề xuất"
ở bước 1 — backend không có cột nào chứa chúng, nên đã bỏ. Nhập vào rồi mất im lặng còn tệ hơn
là không có ô. Kênh cấp sẵn là `email` (backend), wizard không hỏi.

### 2.6. Vòng đời app trên `/admin/apps` — nút phải khớp máy trạng thái

`ACTIONS_BY_STATUS` trong `app-admin-list.tsx` **sao đúng bảng `APP_TRANSITIONS`** của backend
(`apps/domain/rules/app-transitions.ts`):

| Trạng thái | Nút |
|---|---|
| `draft` | — (chỉ app CŨ; app mới tạo đã `active`) |
| `pending_approval` | Duyệt (chỉ app CŨ — ADR-0023) |
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

Ô chọn app (đổi `?app=`, mục 2.9): menu đã có `<StatusPill>` cho từng app; **chấm trên nút mở menu** lấy màu từ
`statusColors` theo trạng thái thật — app đang tạm ngưng mà hiện chấm xanh là nói dối ở chỗ
luôn nhìn thấy. Không làm mờ app bị ngưng: vẫn phải vào xem được chủ đề, khoá, nhật ký của
chính app đang có vấn đề.

### 2.7. Màn Người nhận — chỉ đọc, và vì sao

`/users` đọc `GET /admin/apps/:appId/users`. Bấm một dòng -> trang chi tiết
`/users/[externalId]?app=<app_id>`, đọc `.../users/:externalId` + `.../users/:externalId/preferences`
+ lịch sử gửi của người đó (`implementation_plan.md` §5 — bề mặt đọc cho vận hành, ĐX-0004).

*   **Trang chi tiết trả lời cả hai câu hỏi hỗ trợ trên một màn**, xếp dọc, không chia tab:
    "có bị chặn không" (`<RecipientPreferences>`) và "thư đã ra sao" (`<NotificationsTable
    recipient>`). Chia tab là bắt người trực bấm qua lại giữa hai nửa của cùng một câu trả lời.
*   App đi theo đường dẫn như mọi màn (mục 2.9). `/users/[id]` nằm trong `APP_DETAIL_ROUTES`:
    đổi app ở đây thì về `/users` — cùng mã ở hai app là hai người khác nhau.
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

**"Người nhận" là MỘT mục menu**, không nhóm, không mục con. Kênh mới (SMS, Teams…) là thông tin của từng
người nhận — thành cột trong danh sách và khối trong trang chi tiết, không thành mục menu. Chỉ dựng lại
nhóm khi có màn KHÁC HẲN về người nhận (nhập CSV, phân nhóm). Không gọi "Danh bạ": tên đó là tài khoản EWS
(đồng bộ M365) ở Quản trị EWS — người nhận ≠ tài khoản EWS.

### 2.9. App trên đường dẫn (`?app=<app_id>`) — không đoán, bắt chọn

**Đường dẫn là nguồn DUY NHẤT** cho câu hỏi "đang xem app nào" (`lib/app-routes.ts`).
`<AppProvider>` đọc `?app=`, không giữ state; ô chọn app chỉ hiển thị và đổi tham số đó. Trước
đây app nằm trong state client: tải lại / mở tab mới / gửi link là rơi về app đầu tiên và màn
hiện dữ liệu của app khác mà không báo gì.

`<AppGate>` (bọc ngoài `<AppShell>` trong `layout.tsx`) quyết định theo đường dẫn:

| Đường dẫn | Hiện |
| --- | --- |
| `/admin/*` (`isAdminRoute` — khu Quản trị EWS) | Super Admin: `<AdminShell>`, không cần app (kể cả khi 0 app); người khác: 404 |
| `/orgs/*` (`isOrgsRoute` — trang Tổ chức) | `<OrgsShell>`, không cần app |
| `ORG_ROUTES` (`/apps` — đăng ký app) | vào thẳng, có hay không có `?app=` |
| màn của app, `?app=` hợp lệ | màn như thường |
| thiếu `?app=`, người này CHỈ thấy 1 app | tự thêm `?app=` (`router.replace`) |
| thiếu hoặc sai `?app=` | chuyển sang trang Tổ chức (`chooseAppPath`): mọi app thuộc 1 org -> `/orgs/<orgId>`, còn lại `/orgs` |

*   **Không đoán app**, và **không có trang chọn app riêng** — trang Tổ chức là cửa vào duy nhất
    (trước đây có `<AppChooser>` toàn màn làm trùng việc với `/orgs`, đã bỏ cùng nhãn "dùng gần nhất").
*   **Chọn xong là tới đúng màn đã định**: `<AppGate>` gắn `?next=<màn định mở>` (+ `?missing=<giá trị
    sai>` để trang Tổ chức báo "không có app «x»" — `<ChooseAppNotice>`); bảng org chuyển tiếp hai tham
    số đó sang `/orgs/<orgId>`, bảng app mở `next` kèm `?app=` (`/users/NV-01` -> `/users/NV-01?app=x`).
    `next` luôn qua `safeNext()`: chỉ đường dẫn nội bộ, bỏ `?app=` cũ, không nhận `//host`, `/orgs`, `/admin`.
*   **Route mới mặc định CẦN app** (liệt kê theo chiều `ORG_ROUTES`) — quên khai báo thì bị bắt
    chọn app, sai về phía an toàn.
*   **Đổi app** = `switchAppPath()`: ở lại màn đang xem, hoặc về danh sách nếu đang ở
    `APP_DETAIL_ROUTES`; **bỏ mọi tham số khác** (`?externalId=` của app cũ vô nghĩa ở app mới).
    Màn vẫn không dựng lại khi chỉ đổi `?app=`, nên các chỗ xoá bộ lọc theo `appId` ở `/users` và
    `/notifications` **vẫn cần**.
*   **Ô chuyển app / org** (`components/app-switcher.tsx`): nút ghi tên app + tên org; menu chỉ có app
    của org đang xem (org = org của app đang mở, đường dẫn vẫn chỉ có `?app=`), menu con là
    `consoleOrgs(me)`. **Chọn org không đoán app**: org có 1 app -> mở app đó; còn lại -> `/orgs/<orgId>`
    (bảng app của org). "Xem tất cả org" -> `/orgs`.
*   **Trang Tổ chức** (`/orgs`, `/orgs/<orgId>` — `isOrgsRoute`, khung `<OrgsShell>`): bảng org (tên, vai
    của mình, số app) và bảng app của một org; bấm dòng là đi tiếp. CHỈ cột có dữ liệu thật — không
    thêm Plan / MAU kiểu OneSignal. Không cần `?app=`, link tới đây không mang `?app=` (`withApp`).
    Nút **"Tạo tổ chức"** (`<CreateOrgDialog>`, `app/orgs/actions.ts` -> `POST /admin/organizations`): ai
    đăng nhập cũng tạo được, người tạo thành Owner (ADR-0025 của backend). Tạo xong `router.push` tới org
    mới RỒI MỚI `router.refresh()` — refresh trước thì push đè mất, layout giữ danh sách org cũ và trang
    org mới báo "không có". Người chưa thuộc org nào: `<NoAppsScreen>` dẫn tới `/orgs` để tạo.
*   **Màn Thành viên** (`/orgs/<orgId>/members`, ADR-0026 của backend): Server Component đọc thành viên +
    vai app (`lib/api/organizations.ts`), ghi qua Server Action (`app/orgs/actions.ts`) rồi
    `router.refresh()`. Mọi thành viên xem; Owner / Org Admin thêm, đổi vai, cấp vai app, gỡ. Hộp Thêm
    là DANH SÁCH CHỌN (ADR-0027 của backend): mỗi lần mở gọi `listCandidatesAction` (người cùng công ty
    Super Admin đã cho hiện, chưa thuộc org, có tên từ M365), lọc tại chỗ theo tên / email. Danh sách đến
    từ nút **Đồng bộ M365** ở màn **Danh bạ** của khu Quản trị (`/admin/directory`, `syncDirectoryAction`
    trong `app/admin/directory/actions.ts`, chờ tối đa 2 phút) hoặc lần đăng nhập M365 đầu tiên. Người mới
    từ đồng bộ mặc định ẨN — Super Admin tích ở màn Danh bạ; thêm người chưa tích -> 422 `ADMIN_NOT_LISTED`.
*   **Màn Danh bạ** (`/admin/directory`, `components/admin/directory-page.tsx`): bảng mọi tài khoản phân
    trang phía máy chủ (50 / trang, tìm theo tên / email, lọc Đang hiện / Đang ẩn), ô tích ghi ngay
    (`setMemberListedAction`, hiện trước rồi trả lại nếu backend từ chối), "Hiện / Ẩn cả trang" gửi một lô.
    Bảng hiện tên (`displayName`) kèm email; chưa có tên thì chỉ email. Lựa chọn vai Owner chỉ hiện với
    Owner / Super Admin — backend vẫn chặn (`OWNER_REQUIRED`). Owner / Org Admin hiện "Mọi app" và không có hộp Quyền app (ngầm là App Admin).
    Vào từ sidebar khung Tổ chức (Apps · Thành viên) hoặc mục "Thành viên" của ô chuyển app/org.
*   **`messageOf` ưu tiên mã trong `issues`** (lỗi 422 `VALIDATION`) nếu mã đó có câu dịch ở nhóm
    `errors` — ví dụ `ADMIN_NOT_REGISTERED` nằm trong `issues`, không ở `code`.
*   **Link nội bộ CHỈ qua `<AppLink>` / `useAppRouter()`** (`components/app-link.tsx`) — tự gắn
    `?app=`. `app-link.tsx` là file duy nhất được import `next/link` và `useRouter`. Link tới app
    KHÁC app đang xem thì truyền `app=` (bảng app của org, bước 4 wizard tạo app); `app={null}` = cố ý
    bỏ app. Link tới `/admin/*` không bao giờ mang `?app=`.
*   `useApp()` (luôn có app) cho màn của một app; `useAppSelection()` (app có thể null) cho khung
    — sidebar, ô chọn app, `<AppLink>`. Gọi `useApp()` trong màn `/admin` là ném lỗi.
*   **Danh sách app nạp ở `layout.tsx` (server)**: thêm / duyệt app xong phải `router.refresh()`,
    không thì app mới không có trong danh sách và link `?app=<app_id mới>` bị đưa sang trang Tổ chức báo "không có".
*   **Danh sách app đã lọc theo vai ở backend** (ADR-0022): mọi org người này thuộc về, Member chỉ
    thấy app được cấp vai. Ô chọn app chỉ liệt kê app của org đang xem.
*   **Giá trị `?app=` lấy bằng `appKey(app)` = `app_id`**, không dùng slug: slug chỉ duy nhất trong một
    org, hai org trùng slug thì cùng một link mở ra app khác nhau tuỳ người xem. id không trùng, không
    đổi. Link cũ dạng `?app=<slug>` không còn chạy — bị đưa sang trang Tổ chức chọn lại.
*   **Nút ghi ẩn theo vai** (`useRole().canManage(app)`): App Viewer không thấy thêm topic, cấp / thu
    hồi khoá, soạn / xuất bản template. Chỉ để giao diện gọn — backend vẫn trả 403.

### 2.10. Giới hạn IP (`/admin/apps/<appId>/network`) — chỉ Super Admin, IP đơn

Bổ sung ADR-0023 của backend: giới hạn IP do **Super Admin** quản lý (backend đòi `platform.manage`), vào
từ Quản trị EWS → Tất cả app → menu ⋯ → "Giới hạn IP". Console của end user **không** có màn này, wizard
tạo app **không** có ô IP. **Không còn Origin** (backend bỏ hẳn — header Origin chỉ trình duyệt gửi, không
chặn được ai cầm khoá). Đọc / thêm / gỡ qua `GET|POST|DELETE /admin/apps/:appId/network-rules`; nhật ký lọc
`AppNetworkRuleAdded` / `AppNetworkRuleRemoved`. Luật chặn áp cho cả `/v1` và `/hooks`.

*   **IP ĐƠN, KHÔNG nhận dải** (`ipError` trong `wizard-types.ts`). Backend so khớp chính xác và **không
    kiểm định dạng**: lưu `10.20.0.0/16` là app bị chặn `IP_NOT_ALLOWED` với MỌI IP. Console là chỗ duy nhất
    đang chặn — đừng nới regex.
*   **Xác nhận** khi thêm IP ĐẦU TIÊN (từ "không giới hạn" thành "chỉ danh sách này") và khi gỡ bất kỳ IP
    nào (gỡ IP cuối = mở cho tất cả). Thêm IP thứ hai trở đi chỉ nới ra — không hỏi.
*   App `external` chưa có IP nào -> cảnh báo trên màn (luật của console, backend không ép).

### 2.11. Tổng quan (`/`) — chỉ số thật, bỏ ô không có nguồn

`/` đọc `GET /admin/apps/:appId/overview` (một lời gọi cho mọi con số: 24 giờ gần nhất + hàng chờ),
cộng 5 dòng `GET /admin/apps/:appId/notifications` và nhật ký `GET /admin/audit?targetType=App`.
Ba lời gọi gộp trong `loadOverviewAction` (`app/actions.ts`); một cái hỏng là cả màn hiện `<EmptyState>` kèm mã.

*   **Không có tỉ lệ bounce.** Thư trả về chưa được backend xử lý (ADR-0018) — ô đó từng là số bịa.
    Thay bằng "Gửi lỗi 24h". "Topic đang rỗng" (khái niệm của segment, chưa có) thay bằng "Đang chờ gửi".
*   **Không có "theo origin".** MVP chỉ gửi qua API; biểu đồ chia theo kết cục: đã gửi / lỗi / bị chặn.
*   **Donut chỉ 5 trạng thái** của đường gửi trực tiếp, như bộ lọc ở mục 2.8.
*   **Backend trả giờ UTC**; màn đổi sang giờ của trình duyệt khi vẽ trục giờ.
*   **"Cần chú ý" tính từ chính số liệu của màn** (`alertsOf` trong `app/page.tsx`): chưa có chủ đề
    active, có thư lỗi, thư chờ quá 10 phút, thư bị chặn vì chưa có email, người nhận không có email dùng được.
    Không thêm cảnh báo nào không suy ra được từ `AppOverviewDto`.
*   Tải khi mở / đổi app / bấm Làm mới — không tự cập nhật, nên không có nhãn "LIVE".

### 2.12. Templates — admin soạn và xuất bản, app gửi bằng `templateId`

Đọc / ghi `/admin/apps/:appId/templates…` (ADR-0020 của backend). App service KHÔNG tạo / sửa template;
nó gửi `POST /v1/notifications` với `templateId` + `payload`, backend đổ biến vào bản đang xuất bản.

*   **Định danh là `templateId` (UUID), không có `key`.** Mã + nút sao chép ở tab "Tích hợp cho đội app" và
    mục "Sao chép mã template" của menu ⋯ — KHÔNG ở đầu tab Soạn thư. Tên chỉ cho người đọc, không trùng trong app — so KHÔNG phân biệt hoa thường và dấu
    (`TEMPLATE_NAME_TAKEN`).
*   **Cú pháp biến là `{{ payload.x }}` / `{{ user.external_id }}`.** `{{ x }}` (thiếu nguồn) bị tô đỏ và
    backend từ chối. Mặc định viết trong nội dung: `{{ payload.x | default: "…" }}` — bảng biến KHÔNG có
    cột "Kiểu" / "Mặc định" (backend không có chỗ chứa, mục 6 "form có ô backend không lưu").
    **"Tên dễ đọc" = `description` của biến** (UX-5B, không có trường riêng ở backend): cột chính của tab Biến (mã
    `payload.x` là dòng mờ bên dưới, quá 24 ký tự thì báo nhẹ), nhãn của chip, cột đầu bảng "App phải gửi kèm" ở tab
    Tích hợp. Tab Biến kiểu trực quan không nhắc cú pháp `| default:` (đặt lúc chèn biến); kiểu HTML vẫn nhắc.
*   **Bố cục màn soạn `/templates/[id]`** — tách việc soạn thư khỏi phần cho lập trình viên. Năm tab (`?tab=`,
    đổi bằng `history.replaceState` — không chuyển trang, không mất nội dung chưa lưu): **Soạn thư** (mặc định:
    tiêu đề trên cùng → khung soạn; kiểu HTML thêm xem thử + "Nâng cao" thu gọn chỉ chứa bản chữ thường) · **Biến**
    (`<SchemaPane>`) · **Tích hợp cho đội app** (UX-6, bản phác TichHop: từ `lg` hai cột — trái mã template + `<ContractFields>`, phải `<ContractRequest>` + `<ContractErrors>` thu gọn; điện thoại một cột, bảng biến thành danh sách, lời gọi xuống dòng; chữ giải thích `--text-secondary`) · **Phiên bản**. Tab Soạn thư
    không có chữ "payload", "templateId", "escape" — thuật ngữ chỉ ở tab Biến / Tích hợp. Biến chưa khai / thiếu
    nguồn vẫn báo ở đầu tab Soạn thư (một dòng + nút sang tab Biến; tab Biến có chấm đỏ) — đừng để cảnh báo chỉ
    nằm ở tab khác. Tên + nhóm đổi bằng bút chì cạnh tên (`onEdit` của `<EditorTopBar>`) -> hộp "Tên và nhóm" (`<ConfirmDialog>`, chỉ gửi phần đã
    đổi, lỗi như tên trùng hiện trong hộp); dòng nhỏ dưới tên có tên nhóm. Thanh đầu chỉ có trạng thái + Lưu nháp + Xuất bản (hoặc "Sửa" khi không có nháp); Sao chép
    mã / Nhân bản / Lưu trữ ở menu ⋯ (`<TemplateActionsMenu>`, Lưu trữ cuối, sau vạch ngăn,
    màu nguy hiểm; mục ghi ẩn theo `canManage`). Chú thích dưới ô là dấu (?) `<FieldHint>` (tooltip); lỗi của ô
    (link sai…) vẫn hiện thành dòng đỏ, không giấu vào tooltip.
*   **Tab "Hiệu quả" (`?tab=stats`, UX-24)** — số liệu theo template, CHỈ thứ EWS đo thật (`<StatsTab>` +
    `<TemplateRecipients>`, `app/templates/stats-actions.ts` -> `GET …/templates/:id/stats[/recipients]`). Lọc 7 / 30 / 90
    ngày (giờ Việt Nam) + phiên bản. Hai thẻ: **Đã chuyển đi** (= Microsoft 365 đã nhận, KHÔNG gọi "delivered") với Lỗi /
    Bỏ qua (lý do theo nhóm `exclusion`) · **Tỉ lệ mở** (ước lượng, mẫu số = thư có ảnh theo dõi; chưa có thì "—" + lý do +
    nút bật, không 0%). Biểu đồ 4 đường, chú thích bật / tắt, vạch đứt ngày xuất bản. Người nhận theo tab (Đã mở / Chưa mở
    chỉ khi có thư được theo dõi), bấm mã -> Lịch sử gửi. **KHÔNG có ô thư trả về, lượt bấm link, "reported spam"** — đã kiểm
    tenant, thiếu quyền `Mail.Read` / endpoint công khai ổn định (ADR-0031 backend, bổ sung 2026-10-23); đừng dựng ô "—"
    chờ chúng. Danh sách template có 2 cột "Đã gửi 30 ngày" / "Tỉ lệ mở", bấm số mở thẳng tab này.
*   **Hỏi khi rời trang chưa lưu.** Chưa lưu = `ed.dirty` (tên / nhóm lưu ngay trong hộp, không tính). `useLeaveGuard(dirty)`
    (`components/app-link.tsx`): `beforeunload` khi đóng tab / tải lại; link `<AppLink>` (`onNavigate`) và
    `useAppRouter().push/replace` (vd đổi app) bị giữ lại để màn hiện `<ConfirmDialog>` "Rời trang?". Nút Back
    của trình duyệt KHÔNG chặn được (App Router không có sự kiện huỷ). Link trần không qua `<AppLink>` thì lọt —
    thêm một lý do cho luật mục 2.9.
*   **Một nháp + một bản đang xuất bản.** Không có nháp thì khung soạn chỉ đọc, nút "Sửa" tạo nháp từ
    bản đang xuất bản. "Quay về bản cũ" = "Tạo nháp từ bản này", người soạn tự Xuất bản — không có
    xuất bản lại tại chỗ.
*   **Xuất bản = lưu nháp rồi xuất bản** trong một Server Action (`saveAndPublishAction`): backend xuất
    bản bản nháp ĐANG NẰM trên server, bỏ bước lưu là xuất bản nhầm bản cũ.
*   **Kiểm tra chính thức ở backend.** Lỗi 422 hiện TỪNG vi phạm (`issues[].code` + `path`, câu tiếng
    Việt ở `TEMPLATE_ISSUE_MESSAGES` của `problem.ts`) — `ActionResult` vì vậy mang thêm `issues`.
    `lib/template-syntax.ts` chỉ để tô màu / xem thử, đừng biến nó thành cổng chặn thứ hai.
*   **Xuất bản kiểu HTML chạy bộ kiểm HTML an toàn** (ADR-0038 của backend, công tắc `templates.html_check_enabled` ở Cài
    đặt hệ thống, mặc định bật): thẻ / thuộc tính / link / ảnh / CSS không an toàn -> 422 cùng mã kiểu Trực quan
    (`HTML_TAG_NOT_ALLOWED`…, `path = html`). Lưu nháp KHÔNG bị chặn; bản đã xuất bản không bị đụng. `<ErrorAlert>` hiện
    thêm chi tiết nguyên văn của backend cho mã `HTML_*` (chỉ đúng thẻ / thuộc tính sai).
*   **Biến bắt buộc mới so với bản đang xuất bản → hộp chặn trước khi xuất bản**: app chưa gửi biến đó
    thì mọi lần gửi bị `MISSING_VARIABLE`.
*   **Lưu trữ không có đường quay lại** — `tone="blocking"`, nêu `TEMPLATE_ARCHIVED`.
*   **Nhóm, tìm, nhân bản (ADR-0033 của backend).** Nhóm là bộ cố định `lib/template-categories.ts` (sao
    `TEMPLATE_CATEGORIES` của backend), chữ ở nhóm `templateCategory` của `messages/*.json`. Danh sách lọc nhóm
    + tìm tên ở BACKEND (`?category=&q=`, so theo collation nên "canh bao" ra "Cảnh báo"); trạng thái vẫn lọc
    tại chỗ. Màn soạn đổi nhóm bằng ô chọn (lưu ngay); đổi tên / nhóm dùng `runMeta` — GIỮ nội dung đang soạn
    chưa lưu. "Nhân bản" ra template MỚI (id mới, chỉ nháp v1), hộp hỏi tên (gợi ý "… (bản sao)" / "… (copy)" theo ngôn ngữ — backend BẮT BUỘC `name`, không tự đặt), lỗi như
    tên trùng hiện trong hộp; bản gốc đã lưu trữ vẫn nhân bản được.
*   **KHÔNG có "Gửi thử", "Import từ API", binding template ↔ topic.** Backend không có đường nào cho chúng.
*   **"Nhờ AI soạn" gọi BACKEND** (`POST …/templates/:id/ai-compose`, ADR-0020 §7) — console không giữ khoá
    AI, không có route `/api/ai/*`. `<AiComposeDialog>` gửi mô tả + biến đã khai (+ nội dung đang soạn khi
    "Sửa"), KHÔNG gửi giá trị mẫu; hiện đề xuất + `issues`; "Dùng bản này" chỉ điền vào ô soạn, không lưu.
    Lời gọi này chờ 70 giây (`timeoutMs` của `adminFetch`), mọi lời gọi khác vẫn 10 giây.
    AI thiếu biến thì trả `suggestedVariables`: hộp hiện có ô tick (mặc định tick hết), "Dùng bản này"
    chỉ thêm biến ĐÃ TICK vào bảng biến (`applyAi(content, addVariables)`). Không bao giờ thêm biến ngầm —
    biến là khuôn body mà app và incoming webhook phải gửi.
*   Lịch sử gửi có cột **Template** ("tên · vN", "—" = nội dung viết thẳng) — `templateLabelOf()` trong
    `notification-outcome.tsx`, dùng chung bảng và panel.
*   **Hai kiểu soạn theo VERSION** (`editor`, `lib/template-editors.ts`): **Trực quan** (`visual`, mặc định) và **HTML**
    (`html`, tự viết + "Nhờ AI soạn"). Màn tạo mới có đúng hai thẻ đó (`TEMPLATE_EDITORS`), không còn cờ bật / tắt.
*   **Trình kéo-thả cũ ĐÃ GỠ HẲN (ADR-0037 của backend, migration 0027 — ENUM `editor` chỉ còn `html` / `visual`).**
    Không còn `components/templates/blocks/*`, `@dnd-kit`, `hooks/use-design-preview.ts`, `lib/email-design.ts`,
    "Chuyển sang HTML", màn chỉ đọc kiểu cũ. Đừng dựng lại trình kéo-thả.
*   **Bộ soạn trực quan (ADR-0036 của backend) — NGOẠI LỆ của luật "HTML thư do BACKEND sinh".** Kiểu `visual`:
    GrapesJS 0.23.8 + grapesjs-mjml 1.0.8 (ghim đúng bản, không `^`) chạy ở trình duyệt, **grapesjs-mjml sinh
    HTML**, backend KIỂM (`checkEmailHtml`) và từ chối 422 nếu không an toàn (`HTML_TAG_NOT_ALLOWED`…, câu ở
    `templateIssues`), rồi tự sinh bản chữ thường. Console vẫn KHÔNG tự viết hàm sinh HTML — chỉ gọi grapesjs-mjml;
    lưu nháp gửi `{ editor: 'visual', subject, html, design: { format: 'grapesjs-mjml', version: 1, project, mjml } }`
    (không gửi `text`). Dự án rỗng mà có `mjml` (dữ liệu dựng ngoài bộ soạn) thì bộ soạn nạp MJML đó; không có gì thì
    thư mở đầu (`starterMjml`).
    *   **Nạp động, chỉ client**: `visual-editor-loader.tsx` (`next/dynamic`, `ssr: false`) — GrapesJS + mjml-browser
        ~650 KB nén, không vào gói trang khác. `telemetry: false` (mặc định GrapesJS gọi `app.grapesjs.com`), `cssIcons: ''` (mặc định tải Font Awesome từ cdnjs — biểu tượng bảng kiểu chữ vẽ bằng SVG mặt nạ trong bảng của GrapesJS không dùng nữa nên không cần biểu tượng `fa-*`), không font
        Google (`fonts: {}`, font hệ thống `VISUAL_FONT_STACK`), không tải ảnh lên (asset manager chỉ dán link https),
        gỡ hết thanh nút của GrapesJS / grapesjs-mjml (không có xem / nhập mã), bảng mặc định tắt (`custom: true` cho
        block / trait / style / layer / selector manager), bấm đúp ảnh không mở hộp ảnh (`core:open-assets` rỗng).
        Khối tự khai ở `blocks.ts` (bộ khối của grapesjs-mjml tắt `blocks: []`): Tiêu đề, Đoạn chữ, Nút, Ảnh, Đường kẻ,
        Khoảng trống + bố cục 1 / 2 / 3 cột, hẹp|rộng, rộng|hẹp — chữ mẫu theo ngôn ngữ màn; ảnh chưa có link để `src`
        rỗng (`imageDefaultsPlugin` — mặc định GrapesJS là ảnh SVG giả, lọt ra HTML bị backend chặn).
    *   **Màn soạn là BÀN LÀM VIỆC (UX-5A, bản phác Main / DienThoai)** — áp cho MỌI kiểu soạn. `isWorkspaceRoute`
        (`lib/app-routes.ts`, `/templates/<id>` trừ `/templates/new`): `<AppShell>` thu menu trái (trạng thái riêng — rời
        màn là menu về đúng như người dùng để), bỏ thanh breadcrumb và lề của `<main>`. Màn soạn tự dựng một khối DÍNH
        `top-0`: `<EditorTopBar>` (‹ Templates · tên · dòng "vN · kiểu · trạng thái" · Máy tính / Điện thoại + Hoàn tác /
        Làm lại + trạng thái + Lưu nháp / Xuất bản / ⋯; cao 64px, điện thoại 56px chỉ còn mũi tên, Xuất bản, ⋯) + hàng tab
        GẠCH CHÂN (`tab-styles.ts`; một hàng, điện thoại cuộn ngang, tab Tích hợp ghi ngắn "Tích hợp"; gạch là `after:` của `TabsTrigger` — `border` bị `* { border-color }`
        của globals.css đè thành ô viền). Lề trang (`PAGE_PAD`) do từng tab tự chừa; tab Soạn thư kiểu trực quan là khung
        TRÀN MÉP cao `100dvh` trừ khối dính (6.25rem điện thoại / 6.75rem máy tính + 1px viền) — cả màn không cuộn, không có
        khối "Nâng cao" bên dưới (UX-5C) —, không bọc `<Panel>` (viền / bóng của
        `.cosmic-surface` ngoài layer, không gỡ được). Tab Soạn thư: thẻ "Tiêu đề thư" nằm ở cột giữa NGAY TRÊN tờ thư, rộng bằng thư (`subject` của
        `VisualEditor`, nền dải = nền ngoài của thư), giữa là thư thật (không còn khung xem trước riêng). Tờ thư trên khung
        là CSS RIÊNG của khung soạn (`CANVAS_CSS` + `paintCanvas` trong `visual-editor.tsx`: lề, bo góc, bóng `--glow-panel`,
        bề rộng theo Cài đặt thư, dòng chân thư `::after`, ẩn `mj-head`) — không vào MJML / HTML. `wrapper` / `mjml` /
        `mj-body` không rê / chọn được (`quietBodyPlugin`, đặt qua mặc định của kiểu — không vào JSON dự án). Không có nháp / App Viewer -> hiện HTML đã lưu bằng `PreviewPane`, không mở bộ soạn. Bộ soạn key theo id
        bản nháp: lưu cùng bản không dựng lại. Tab Soạn thư `keepMounted` — sang tab khác chỉ ẩn, bộ soạn sống tiếp (mục 6).
    *   **Bảng trái** (`left-panel.tsx`, bản phác Main): tab Khối / Bố cục / Cài đặt — 3 nút bằng nhau, tab đang chọn nền
        xanh nhạt (không dùng thanh xám của TabsList mặc định); thẻ khối cao 72px bo 10px; tab Khối có thêm "2 cột". Rộng
        15rem (17rem từ `xl`), bảng phải 17rem (19rem). Thẻ khối KÉO vào thư
        (`editor.Blocks.startDrag` / `endDrag`) hoặc BẤM để thêm (`appendBlock`: ngay sau khối đang chọn trong cùng cột,
        không chọn gì thì hàng mới cuối thư). "Cài đặt thư" (`email-settings.ts`: rộng Hẹp/Vừa/Rộng = 480/540/600, nền
        ngoài / nền thư, màu chữ, màu nút, font) áp THẲNG vào thuộc tính từng khối (khung soạn của grapesjs-mjml không
        dựng phần `<mj-head>`), lưu ở `project.ewsSettings`; khối thêm sau nhận cài đặt hiện tại.
    *   **Bảng phải** (`properties-panel.tsx`): thuộc tính THEO LOẠI KHỐI — Chữ (cỡ Nhỏ/Vừa/Lớn, độ đậm, màu, căn lề, biến
        trong khối), Nút (chữ, link + "Chèn biến", màu nút / chữ, góc Vuông/Bo nhẹ/Tròn, căn lề), Ảnh (link https, chữ
        thay ảnh, rộng %, link khi bấm, căn lề), Đường kẻ, Khoảng trống, Hàng / Cột (nền, số cột). Màu chọn bằng 6 ô gợi
        ý + "màu khác" (`color-field.tsx`, hex của THƯ khai ở `PALETTES`); px / mã màu chỉ trong "Nâng cao" thu gọn. Đầu
        bảng: Nhân đôi / Xoá. Ô chữ ghi khi rời ô / Enter (gõ từng phím không vẽ lại khung thư). Link là biến hiện thành
        nhãn, không lộ `{{ }}`; link biến luôn ghi nháy đơn.
    *   **Điện thoại (< md, bản phác DienThoai)**: hai bảng ẩn, thay bằng thanh dưới 4 nút cao 56px DÍNH ĐÁY khung nhìn (render qua `createPortal(document.body)` — Panel `backdrop-filter` / motion `transform` của console làm `fixed` bám theo tổ tiên; `fixed bottom-0`, `pb-[env(safe-area-inset-bottom)]`, `z-40` dưới Sheet / Dialog `z-[100]`, ẩn khi bàn phím ảo mở — `visualViewport`; khung soạn chừa một khoảng cùng cao) — Thêm khối (`<Sheet>`
        từ dưới chứa bảng trái; bấm khối = thêm sau khối đang chọn rồi đóng), Chèn biến (vào chỗ người soạn vừa đặt con
        trỏ: ô tiêu đề hay khối chữ — `insert-target.ts` nhớ; khối chữ dùng `requestChipInsert` của `chip-plugin.ts`
        với chỗ con trỏ nhớ theo số ký tự; không có chỗ thì toast nhẹ), Thuộc tính (`<Sheet>` chứa bảng phải), Hoàn tác.
        Chạm một lần chọn khối, chạm lần nữa vào khối chữ / nút đang chọn thì vào sửa chữ (`pointer: coarse`); thêm khối
        bằng chạm, không bắt kéo. Thanh đầu: Máy tính / Điện thoại + Hoàn tác / Làm lại ẩn, Lưu nháp + Làm lại vào ⋯
        (`onSaveMobile` / `onRedoMobile` của `<TemplateActionsMenu>`, mục `md:hidden`); Xuất bản vẫn thấy.
    *   **Lỗi từng khối** (`block-lint.ts`): biến chưa khai / thiếu nguồn / không bắt buộc mà thiếu chữ khi thiếu, nút chưa
        có link, link không https / mailto, ảnh trống / không https — tô viền đỏ khối trên khung (chỉ sửa `style` của
        phần tử trong khung, không vào thư) + dải "N chỗ cần sửa" trên khung, bấm một dòng thì chọn đúng khối. Chỉ để báo
        sớm — lỗi 422 của backend vẫn hiện như cũ.
    *   **Chip biến** (`chip-plugin.ts`): trên khung `{{ payload.x }}` hiện thành viên có nhãn (`variableLabel` của
        `lib/variable-labels.ts`: mô tả biến, không có thì tên tự sinh "Ten nguoi nhan"; biến chưa khai thì viên đỏ), là một khối nguyên (`contenteditable=false`); JSON dự án giữ chip, MJML / HTML
        giữ Liquid. Thanh định dạng nổi (UX-5A): nền tối đặc, nút 32px, chỉ Đậm / Nghiêng / Gạch chân / Link
        (`richTextEditor.actions` — bỏ gạch ngang và "bọc khối" của GrapesJS) + nút có chữ "{ } Chèn biến" (`.ews-rte-insert`;
        CSS gỡ `width: 25px` cứng của GrapesJS); `canvasCss` bỏ viền focus đen quanh đoạn đang gõ. Nút "{ } Chèn biến" mở `<InsertVariableDialog>` (bấm ra ngoài khung thư làm GrapesJS tắt chế độ sửa chữ — chèn / huỷ chạy SAU khi hộp đóng hẳn (`onClosed` của `<ConfirmDialog>`, hộp không tự trả focus), bật lại sửa chữ rồi đặt con trỏ theo số ký tự đã nhớ; chèn dùng `useDomContent` để chữ vừa gõ không mất) Hộp theo bản phác ChenBien: tìm, danh sách (nhãn
        + ví dụ + bắt buộc / có sẵn — `user.external_id` "Mã người nhận" luôn có, chọn thì tự khai), "+ Thêm biến mới"
        (tên dễ đọc -> mã `payload.<slug không dấu>` hiện mờ, ví dụ, app bắt buộc gửi) -> `ed.addVariable` vào bảng Biến
        (mô tả = tên, giá trị mẫu = ví dụ); biến không bắt buộc phải có "Khi app không gửi thì hiện", cấm `" ' < > { } |`.
        Chip tên dài cắt "…" ở `CHIP_MAX_CH` (22) ký tự — khung thư, ô tiêu đề, hộp chèn — không bao giờ xuống dòng; rê
        chuột thấy tên + mã. Ô "Tiêu đề thư" cũng có chip (`subject-field.tsx`: một dòng `contenteditable`, chip `contenteditable=false`,
        Enter bị chặn, dán thành chữ thường, `{{ }}` gõ tay tự thành chip; lưu vẫn là chuỗi Liquid). `{{ }}` gõ / dán tay tự thành chip khi
        sửa xong; `"` trong biến của link tự đổi sang `'` (MJML không thoát `"` trong thuộc tính).
    *   **Chưa lưu** = GrapesJS báo thay đổi (`getDirtyCount`) -> `ed.onVisualChange` -> `useLeaveGuard` như mọi kiểu.
        Lưu xong `markSaved()` đếm lại từ đầu.
    *   **Màu trong THƯ là hex** (dữ liệu người soạn). Giao diện bộ soạn dùng token: `visual-editor.css` đè lớp
        `.gjs-*` bằng `var(--…)` trong phạm vi `.visual-editor`; màu chip lấy token lúc chạy (`getComputedStyle`) vì khung
        thư là iframe.
*   **Thư viện mẫu (ADR-0035 / ADR-0037 của backend) — tạo ra template TRỰC QUAN.** `/templates/new` mở bằng bước chọn
    (`<PresetGallery>`): ô "Bắt đầu từ trống" (form ở giữa: tên + nhóm, kiểu soạn là hai thẻ lớn có dấu tích; nút quay
    lại "Quay lại thư viện mẫu") + lưới thẻ mẫu lọc theo nhóm (chỉ nhóm có mẫu). Mẫu nạp qua `loadTemplatePresetsAction`
    (`hooks/use-template-presets.ts`, giữ theo ngôn ngữ thư); ảnh thu nhỏ là iframe `sandbox=""` của `html` backend
    sinh (`renderDesign` — chỉ để làm ảnh, gần giống thư thật), thay giá trị mẫu bằng `renderPreview`. Bấm thẻ ->
    `<PresetDialog>`: mở hộp là biên dịch NGAY `mjml` của mẫu bằng `compileMjml` (`visual/compile-mjml.ts`: GrapesJS
    `headless` + grapesjs-mjml, đúng plugin / cấu hình của bộ soạn, nạp động — backend KHÔNG có trình biên dịch MJML),
    xem trước `DevicePreview` hiện đúng HTML vừa biên dịch (chưa xong thì tạm ảnh thu nhỏ + vòng quay), chọn ngôn ngữ
    thư (mặc định theo màn), tên gợi ý theo ngôn ngữ thư, "Dùng mẫu" -> `createFromPresetAction` gửi `{ presetId,
    locale, name, html, design: { format, version, project, mjml } }` -> backend kiểm HTML như lưu nháp -> màn soạn
    trực quan ra đúng các khối (biến thô tự thành chip lúc mở). Lỗi biên dịch hiện trong hộp (`compileFailed`). Tên bắt
    buộc, trùng tên hiện trong hộp. Mẫu không đồng bộ về sau.
*   `/compose`, tab Template của chủ đề, duyệt gửi vẫn là mock (dùng `templates` trong `mock-data.ts`).

### 2.13. Webhooks (`/settings/webhooks`) — EWS tự báo kết quả gửi thư cho app

Outgoing webhook, ADR-0029 của backend. Đọc / ghi qua `app/settings/webhooks/actions.ts` ->
`lib/api/webhooks.ts` -> `/admin/apps/:appId/webhooks/*`. Mọi người xem được danh sách + nhật ký gọi;
nút ghi (Thêm, Gửi thử, ⋯ Đổi sự kiện / Tắt / Bật lại / Đổi secret / Xoá) chỉ hiện với `canManage(app)`.

*   **`configured: false`** (server thiếu `WEBHOOK_SIGNING_KEY`) -> `<Alert>` "chưa bật trên server", khoá
    Thêm / Gửi thử / Đổi secret. Đừng giấu cả màn: URL đã có vẫn phải xem được.
*   **Secret `whsec_…` hiện MỘT lần** trong `<WebhookSecretDialog>` (tạo URL, đổi secret) — cùng luật với khoá
    API (UC-001 BR-4): tick "đã lưu" mới đóng, chưa sao chép mà đóng thì hỏi lại. Backend không lưu secret.
*   **Trần số URL / số incoming hook là cài đặt hệ thống** (`webhooks.max_endpoints_per_app`,
    `incoming.max_hooks_per_app`) — console không biết con số, không đếm, nút Thêm luôn bấm được; vượt trần
    thì backend trả `WEBHOOK_LIMIT_REACHED` / `INCOMING_HOOK_LIMIT_REACHED`. URL không đổi được — muốn đổi thì xoá rồi thêm.
*   **Lỗi 422 hiện mã trong `issues`** (`WEBHOOK_URL_INVALID`…), không hiện `VALIDATION`; lỗi của hộp thêm /
    sửa hiện NGAY TRONG hộp, hộp không đóng.
*   **Gửi thử** gọi ngay, kết quả là `<Alert>` trên đầu màn (không phải toast) kèm mã ngắn của backend
    (`http_405`, `timeout`, `blocked_private_address`…) + câu gợi ý (`errorHint`). Lời gọi này đặt timeout
    20 giây vì backend chờ app tới 10 giây.
*   **Tắt URL có hộp xác nhận**: lượt đang chờ gọi lại bị huỷ, bật lại không gửi bù. Xoá là `tone="blocking"`.
*   Tên sự kiện có dấu `.` nên khoá câu dịch đi qua `EVENT_LABEL` (next-intl coi `.` là tầng lồng).
*   Màu trạng thái `disabled` / `delivered` / `pending` thêm vào `statusColors` — vẫn chỉ `<StatusPill>`.

**Tab "Nhận vào" — incoming webhook (ADR-0030 của backend).** `lib/api/incoming.ts` ->
`/admin/apps/:appId/incoming-webhooks/*`; action chung file `app/settings/webhooks/actions.ts`.

**Người dùng chỉ chọn GỬI CHO AI (topic) và NỘI DUNG GÌ (template); ít chữ, không giải thích.** Bản đầu đưa
ánh xạ đường dẫn JSON, khoá chống trùng, điều kiện phát lên form — người dùng không tự điền nổi. Đừng đưa lại.
*   **Không hộp thoại**: "Thêm webhook" mở một dòng 2 ô chọn ngay trong danh sách (khoá khi thiếu topic đang
    hoạt động / template đã xuất bản / khoá ký); mỗi webhook là một `Collapsible` mở tại chỗ (đổi topic /
    template + Lưu, Sao chép URL, Đổi URL, Tắt / Bật, Xoá). Danh sách nhóm theo topic. Chỉ Đổi URL / Xoá có
    `<ConfirmDialog>`. Tên hook tự đặt = tên template.
*   **Sao chép URL bất cứ lúc nào** (`revealIncomingHookUrlAction` -> `GET …/:hookId/url`): backend tính lại
    token và ghi audit mỗi lần lấy — trách nhiệm theo dõi bằng audit logs, KHÔNG ghi chú trên màn hình.
    Lỗi `INCOMING_URL_NEEDS_ROTATION` -> câu "bấm Đổi URL".
*   **Body mẫu** (`<IncomingHookGuide>`, đóng sẵn): khuôn chuẩn EWS không gắn công cụ nào — `POST`,
    `Content-Type: application/json`, body có trường TRÙNG TÊN biến `payload.*` (giá trị mẫu + mô tả lấy từ
    template), curl với `[URL]`, thư mẫu (backend `preview`). **Nhật ký** (đóng sẵn): câu ngắn qua `CALL_ERROR_KEY`, lỗi thiếu / sai kiểu nối thêm `errorFields` ("Thiếu trường bắt buộc: service").
*   `WARNING_KEY` chỉ gồm cảnh báo topic / template. Câu dịch chứa `{`, `}` phải thoát `'{}'`; chứa `<…>` bị
    hiểu thành thẻ — dùng `[…]`.

### 2.14. Cài đặt hệ thống (`/admin/settings`) — chỉ Super Admin

ADR-0030 của backend. Server Component đọc `GET /admin/system-settings`, ghi qua
`app/admin/settings/actions.ts` (`PUT`). Mỗi dòng một nút Lưu (gửi đúng khoá đó) + "Về mặc định" (gửi
`null`) — đổi một con số không ghi đè con số khác. Ô số chặn ngoài khoảng `min`–`max` ngay ở client (backend
vẫn kiểm); nhãn / mô tả theo khoá qua `LABEL` (khoá có dấu `.` — next-intl coi là tầng lồng). Cài đặt kiểu `bool`
(hiện chỉ `templates.html_check_enabled`, nhóm "Template" — ADR-0038 của backend) là công tắc lưu ngay khi gạt, không có
nút Lưu. Giá trị mới tới
mọi máy chủ API trong tối đa 30 giây (đệm của backend) — màn hình nói rõ điều đó.
Nhóm `auth.*` KHÔNG hiện ở trang này (`isSecuritySetting`) — nó ở mục riêng "Theo dõi & Bảo mật" (mục 2.15).

### 2.15. Theo dõi & Bảo mật (`/admin/security`) — chặn đăng nhập sai, chỉ Super Admin

ADR-0039 của backend. TRÊN: bảng khoá đang giữ (`GET /admin/login-locks`) — việc hay làm nhất — khoá tạm theo email / IP
(tự mở), khoá hẳn (chỉ mở ở đây); "Mở khoá" luôn qua `<ConfirmDialog>` (`POST …/unlock`); điện thoại ẩn cột Loại, nhãn
loại xuống dưới email để nút Mở khoá còn trong khung; ô lọc chỉ hiện khi ≥ 8 dòng. DƯỚI: 6 quy tắc `auth.*` trong
`Collapsible` đóng sẵn, đầu khối là MỘT dòng tóm tắt luật đang áp (cùng kho cài đặt hệ thống, `useSettingsEditor(…,
{ showKeys: false })` — không in mã `auth.*`, mỗi dòng lưu riêng). Đăng nhập mật khẩu:
`signIn` gửi IP thật của trình duyệt (`X-Real-IP` của NPM, thiếu thì phần tử CUỐI của `X-Forwarded-For`) kèm
`LOGIN_CLIENT_IP_SECRET` — biến này phải CÙNG giá trị ở web và api, trống thì backend chỉ đếm theo email. Người bị khoá
chỉ thấy `INVALID_CREDENTIALS` (câu có nhắc "nhập sai nhiều lần sẽ bị tạm khoá"); M365 bị khoá hẳn -> `ADMIN_LOCKED`.

### 2.16. Nhật ký hoạt động (`/admin/audit`) — chỉ Super Admin

`GET /admin/audit/events` của backend (lọc loại sự kiện / thời gian, con trỏ trang, tổng số, email người làm và đối tượng là
tài khoản). Nhóm sự kiện ở `lib/audit-groups.ts` — mặc định "Hoạt động quản trị" (sự kiện gửi thư chiếm phần lớn bảng, để
nhóm riêng). `?group=&range=` trên đường dẫn: màn khác dẫn sang đã lọc sẵn (khối "24 giờ qua" của Theo dõi & Bảo mật ->
`?group=security&range=24h`). Tên sự kiện dịch ở nhóm `auditActions` (mã thô chỉ ở tooltip); sự kiện backend mới thì thêm
câu dịch + xếp nhóm, chưa xếp thì vẫn hiện ở "Tất cả". "Chi tiết" mở `before → after` từng trường.

### 2.17. Ô "Viết thẳng" của Gửi thông báo — chữ thường trước, HTML là nâng cao

Mặc định ô "Nội dung thư" gõ CHỮ THƯỜNG; `lib/plain-text-email.ts` đổi sang HTML an toàn (escape mọi ký tự, dòng trống tách
`<p>`, xuống dòng `<br>`, chỉ `https://` thành link) và gửi kèm `text` gốc. "Viết bằng HTML (nâng cao)" mới mở ô HTML thô
(mang theo nội dung đã đổi). Đừng đưa ô HTML về làm mặc định.

### 2.18. Chữ trên màn — ngắn, giải thích dài vào ⓘ (UX-12)

Luật cho MỌI màn (console app + Quản trị EWS):
*   Chú thích dưới ô / dưới tiêu đề / phụ đề trang: **một dòng, ≤ 70 ký tự**, nói việc cần làm. Dài hơn -> đưa vào **ⓘ**
    (`<InfoHint>`: rê chuột hoặc chạm đều mở) cạnh nhãn / tiêu đề.
*   Giải thích cơ chế (cách EWS gọi webhook, luật IP, từng cài đặt hệ thống…) KHÔNG đặt thành khối chữ trên màn — gom vào ⓘ.
*   Thông báo lỗi ≤ 110 ký tự (lỗi gì + làm gì), KHÔNG giấu vào ⓘ. Hộp xác nhận: 1–2 câu nói hậu quả.
*   Câu dịch có `<…>` là thẻ, `{…}` là biến (next-intl) — ký tự thật thì `[…]` / `'{{ }}'`. Kiểm bằng `IntlMessageFormat` (cả
    hai ngôn ngữ, 0 lỗi) trước khi build.
*   Bài quét QA `qa-verbose.cjs` đi mọi màn, báo dòng chữ hiện sẵn > 90 ký tự ngoài ⓘ / hộp lỗi / bảng — phải ra 0.

### 2.19. Thêm chủ đề — mã tự sinh (UX-11)

Người dùng chỉ gõ **Tên hiển thị**; mã cho đội app tự sinh `topicKeyFrom` (`lib/topic-key.ts`: bỏ dấu, chữ thường, `_`,
trùng trong app thì `_2`, `_3`…), hiện mờ "Mã cho đội app: …" + "Sửa" mới mở ô nhập. KHÔNG dùng UUID: đội app viết mã vào
code / cấu hình / incoming webhook, phải đọc được; trùng đã bị chặn trong app (409 `TOPIC_KEY_TAKEN`).

### 2.20. Giới hạn gửi GĐ 3 + quản lý tổ chức

*   `/settings/limits` thêm hai mục (ADR-0032 GĐ 3 của backend): **Mỗi người nhận mỗi ngày** (người quản lý app, 1–1000,
    tin bắt buộc mặc định không tính) và **Trần mỗi giờ** (chỉ Super Admin sửa, 1–100000, công tắc "tin bắt buộc được vượt
    trần" mặc định tắt). Thư vượt mức mỗi người -> lý do `recipient_limit` (nhóm `exclusion`); vượt trần giờ -> `/v1` trả
    `429 APP_HOURLY_LIMIT` (đã có trong `v1-errors.ts`).
*   Màn Thành viên có nút ⋯ "Quản lý tổ chức" (`<OrgSettingsMenu>`, chỉ Owner / Super Admin — ADR-0040 của backend): Đổi tên ·
    Chuyển Owner (chọn trong thành viên chưa là Owner; Owner cũ thành Org Admin) · Xoá (gõ lại tên, `tone="blocking"`, còn
    app chưa thu hồi -> `ORG_HAS_APPS`; xoá xong `push('/orgs')` RỒI `refresh()`). Lỗi hiện trong hộp.

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
| `<AppShell>` | `components/app-shell.tsx` | ✓ | khung console APP: left rail 240px, `<AppSwitcher>`, top bar — KHÔNG có nhóm Quản trị EWS; ở bàn làm việc (`isWorkspaceRoute`) thu menu, bỏ top bar + lề `<main>` (mục 2.12) |
| `<AppSwitcher>` | `components/app-switcher.tsx` | ✓ | ô chuyển app / org đầu sidebar (mục 2.9): app của org đang xem + menu con `consoleOrgs`; ô tìm khi org có > 6 app |
| `<OrgsShell>` / `<OrgList>` / `<OrgApps orgId>` / `<CreateOrgDialog>` | `components/orgs-shell.tsx`, `components/orgs/*` | ✓ | trang Tổ chức `/orgs` (mục 2.9): khung riêng, bảng org (+ nút Tạo tổ chức), bảng app của một org (+ Tạo app cho Owner / Org Admin) |
| `<OrgMembers>` + `member-dialogs.tsx` | `components/orgs/org-members.tsx` | ✓ | màn Thành viên `/orgs/<orgId>/members` (mục 2.9): bảng + 4 hộp (Thêm, Đổi vai, Quyền app, Gỡ) đều bọc `<ConfirmDialog>` |
| `<AdminShell>` | `components/admin-shell.tsx` | ✓ | khung khu Quản trị EWS (`/admin/*`, chỉ Super Admin): menu riêng; dùng chung `shell-parts.tsx` với AppShell |
| `<PageHeader title subtitle breadcrumb actions>` | `components/page-header.tsx` | ✓ | `breadcrumb: Breadcrumb[]` = `Array<{label; href?}>`; có `href` → render `next/link` |
| `<StatusPill status>` | `components/status-pill.tsx` | ✓ | **nguồn màu duy nhất** — 11 trạng thái notification + app / template / subscription / binding |
| `<StatPill label value delta?>` | `components/stat-pill.tsx` | ✓ | số lớn mono + sparkline |
| `<DataTable columns rows onRowClick empty rowClassName? hideSearch?>` | `components/data-table.tsx` | ✓ | bọc shadcn `<Table>`; 13px, row 44px; `Column<T>` có `mono` / `numeric` / `render(row)`. `hideSearch` khi màn đã có ô tìm phía máy chủ (bẫy ở mục 6) |
| `<EmptyState icon title description action>` | `components/empty-state.tsx` | ✓ | orbit SVG, không emoji |
| `<CodeBlock language value copyable>` | `components/code-block.tsx` | ✓ | toast "Đã sao chép" |
| `<ConfirmDialog title facts confirmLabel onConfirm>` | `components/confirm-dialog.tsx` | ✓ | bọc shadcn `<Dialog>`; `facts` = 3 dòng mono; `confirmLabel` nói rõ hậu quả (`Gửi cho 43 người`); prop `tone="blocking"` / `confirmHref` / `children` / `confirmDisabled` cho modal chặn hoặc có form bên trong |
| `<LocaleFlag locale>` | `components/locale-flag.tsx` | ✓ | cờ SVG của ngôn ngữ (vi = Việt Nam, en = Anh) cạnh tên ngôn ngữ ở menu tài khoản và nút VI / EN trang đăng nhập — không dùng emoji cờ (Windows hiện thành chữ). Tên ngôn ngữ dịch theo ngôn ngữ đang dùng (`locale.vi` / `locale.en`) |
| `<OrbitStepper steps step>` | `components/apps/orbit-stepper.tsx` | ✓ | stepper orbit N bước — wizard app (4) và import CSV (3) |
| `<SecretText value visible>` | `components/secret-text.tsx` | ✓ | khoá bí mật phủ lớp dạ quang, hiện thì tan dần; dùng trong `<CredentialDialog>`, `<WebhookSecretDialog>`, `<CodeBlock secret>` (mục 4) |
| `<CredentialDialog app apiKey open onClose>` | `components/apps/credential-dialog.tsx` | ✓ | modal show-once (UC-001 §D) — dùng chung `/settings/credentials` (khoá THẬT), wizard step 4 và `/admin/approvals/[id]` (hai màn sau còn mock → truyền `DEMO_API_KEY`) |
| `<PreviewBanner>` | `components/preview-banner.tsx` | ✓ | dải băng "Bản xem trước — số liệu minh hoạ" cho route ngoài `WIRED_ROUTES`; bọc shadcn `<Alert>`, không prop, không tắt được (mục 2.4) |
| `<GrantFields id grant onGrantChange acknowledged onAcknowledgedChange>` | `components/apps/grant-fields.tsx` | ✓ | **nguồn duy nhất** của phần nhập quyền cấp lúc duyệt: 2 hạn mức + cảnh báo "lưu nhưng chưa đối chiếu" + ô tick bắt buộc; dùng chung wizard bước 4 và `<ApproveAppDialog>` |
| `<ApproveAppDialog app pending error onCancel onConfirm>` | `components/apps/approve-app-dialog.tsx` | ✓ | hộp duyệt ở `/admin/apps`; bọc `<ConfirmDialog>`, `app = null` là đóng |
| `<RecipientDetail externalId>` | `components/users/recipient-detail.tsx` | ✓ | trang chi tiết một người nhận (mục 2.7): đầu trang có địa chỉ + tình trạng, rồi cài đặt nhận tin, rồi các lần gửi; `page.tsx` truyền `key` theo app + mã |
| `<AppLink href app?>` / `useAppRouter()` / `useLeaveGuard(active)` | `components/app-link.tsx` | ✓ | **nguồn duy nhất** của link nội bộ — tự gắn `?app=` (mục 2.9); file duy nhất import `next/link` / `useRouter`; `useLeaveGuard` giữ link / `push` khi màn còn thay đổi chưa lưu (mục 2.12) |
| `<AppGate>` / `<ChooseAppNotice>` | `components/app-gate.tsx`, `components/orgs/choose-app-notice.tsx` | ✓ | cổng theo `?app=` (thiếu / sai -> trang Tổ chức kèm `?next=` / `?missing=`) (mục 2.9) |
| `<RecipientPreferences recipient preferences error loading>` | `components/users/recipient-preferences.tsx` | ✓ | khối cài đặt nhận tin trong trang chi tiết; chỉ đọc, cảnh báo L0/L1 ở đầu (mục 2.7); kèm `SUPPRESSED_LABEL` |
| `<NotificationsTable initialExternalId? recipient?>` | `components/notifications/notifications-table.tsx` | ✓ | bảng lịch sử gửi (mục 2.8); `recipient` = cố định một người: ẩn ô gõ mã và cột mã |
| `<NotificationOutcome notification linkRecipient onClose>` | `components/notifications/notification-outcome.tsx` | ✓ | panel chi tiết một lần gửi (mục 2.8); kèm `outcomeOf()` + `EXCLUSION_LABEL` — nguồn duy nhất của chữ "kết cục", dùng chung cột bảng và panel; `linkRecipient = false` khi đã ở trang của người đó (không link về chính nó) |
| `<AppTransitionDialog app action pending error onCancel onConfirm>` | `components/apps/app-transition-dialog.tsx` | ✓ | Tạm ngưng / Mở lại / Thu hồi; bọc `<ConfirmDialog>`, bắt buộc nhập lý do, `tone="blocking"` cho thu hồi; **phải truyền `key`** theo app + hành động (mục 2.6) |
| `<AuditTrail entries>` | `components/audit-trail.tsx` | ✓ | actor · action · `cũ → mới` · source; chỉ có một vế (thêm / gỡ, cấp / thu hồi) thì vẫn hiện vế đó |
| `<NetworkRulesPanel app>` | `components/admin/network-rules-panel.tsx` | ✓ | `/admin/apps/<appId>/network` — Super Admin xem / thêm / gỡ IP của một app (mục 2.10) |
| `<WebhooksPage>` / `<WebhooksPanel embedded?>` / `<WebhookFormDialog>` / `<WebhookSecretDialog>` | `components/settings/webhooks-page.tsx`, `webhooks-panel.tsx`, `webhook-dialogs.tsx` | ✓ | `/settings/webhooks` — tab Gửi đi (outgoing: URL, gửi thử, nhật ký); hộp thêm / đổi sự kiện; secret `whsec_` hiện một lần (mục 2.13) |
| `<IncomingHooksPanel>` / `<IncomingHookGuide>` | `components/settings/incoming-hooks-panel.tsx`, `incoming-hook-guide.tsx` | ✓ | tab Nhận vào: danh sách mở tại chỗ, thêm / sửa chỉ topic + template, Sao chép URL bất cứ lúc nào; Body mẫu + Nhật ký đóng sẵn (mục 2.13) |
| `<SystemSettingsPanel initial>` | `components/admin/system-settings-panel.tsx` | ✓ | `/admin/settings` — Cài đặt hệ thống, mỗi dòng lưu riêng + Về mặc định (mục 2.14) |
| `<SourceBadge>` | `components/source-badge.tsx` | ✓ | "nguồn" của một dòng audit (`auditSources`) |
| `<ContractFields>` / `<ContractRequest>` / `<ContractErrors>` | `components/templates/contract-panel.tsx` | ✓ | Khối của tab Tích hợp (UX-6): "App phải gửi kèm" (bảng tên dễ đọc / mã / bắt buộc; điện thoại là danh sách; dòng "theo bản xuất bản vN" hoặc cảnh báo chưa xuất bản) · lời gọi `POST /v1/notifications` mẫu (`templateId` + `payload` + `idempotencyKey`, nút "Sao chép" có chữ ở đầu khối) · lỗi template lấy từ `v1-errors.ts` (thu gọn sẵn, ý nghĩa trước, mã sau, không tô đỏ) |
| Composer blocks | `components/compose/{recipient,content,preview,send}-block.tsx`, `composer.tsx` | ✓ | 4 khối gated |
| `RoleContext` | `components/role-context.tsx` | ✓ | vai THẬT từ `GET /admin/me` (`layout.tsx` nạp ở server); `useRole()` trả `isSuperAdmin`, `canManage(app)`, `creatableOrgs` — gate nút ghi; `<AppGate>` dùng `isSuperAdmin` để mở khu Quản trị EWS. Luật ở `lib/access.ts`, sao cùng `decide()` của backend. Không giả lập vai ở client |
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
    **không** có bước đổi token. Cấp khoá mới **không** thu hồi khoá cũ. Mỗi khoá có tên (hỏi lúc cấp)
    và "Dùng lần cuối"; trần số khoá active là cài đặt hệ thống `apps.max_active_api_keys` (mặc định 20)
    — console không biết con số, vượt trần thì backend trả 422 `ACTIVE_SECRET_LIMIT`.
*   **Khoá bí mật đang hiện luôn qua `<SecretText>`** (`components/secret-text.tsx` — lớp dạ quang
    `--highlighter`). Một nút Hiện / Ẩn điều khiển MỌI chỗ khoá xuất hiện trong hộp: dòng secret và
    khối code (`<CodeBlock secret={{ value, visible }}>` chỉ che đúng đoạn khoá). Đang ẩn thì DOM
    chỉ có ký tự giả; nút Sao chép vẫn chép chuỗi thật. Đừng in khoá thẳng vào snippet / `<pre>`.
*   **Ô tick trước khi duyệt app CŨ**: "đội này đã có màn Cài đặt nhận thông báo". Backend không
    lưu, không vào audit — nó là **gờ giảm tốc, không phải hàng rào**. App mới không qua duyệt nên
    trách nhiệm dựng màn đó nằm ở đội app (tài liệu tích hợp, Bước 4).
*   **Bấm một dòng ở `/admin/apps`** = mở app đó ở console app (Super Admin thấy mọi org). Cột ⋯
    chặn sự kiện bấm (`stopPropagation`) để chọn thao tác không mở nhầm app.
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
| Hàng tab xuống 2 dòng nhưng dòng 2 đè lên khối bên dưới | `TabsList` của `components/ui/tabs` có `group-data-horizontal/tabs:h-8` — biến thể này thắng `h-auto` thường | thêm `group-data-horizontal/tabs:h-auto` cạnh `h-auto w-full flex-wrap` ở chỗ dùng (vd `template-editor.tsx`); không sửa `components/ui/` |
| Dialog cắt mất chữ bên TRÁI, có thanh cuộn ngang ẩn | `<DialogContent>` là `grid`, cột `auto` phình theo max-content của `<pre>`/chuỗi mono dài; dialog mở ra tự focus một nút nằm ngoài vùng nhìn → trình duyệt cuộn ngang container, nội dung trôi trái, `overflow-x-hidden` cắt đi | `grid-cols-[minmax(0,1fr)]` trên `DialogContent` (đã có ở `ConfirmDialog` và `CredentialDialog`); kiểm bằng `el.scrollWidth` vs `clientWidth`, không chỉ đọc `innerText` |
| `border-<màu>` không ăn, viền luôn ra `--orbit` | `app/globals.css:88` có `* { border-color: var(--orbit) }` **ngoài `@layer`** — rule không layer thắng mọi utility Tailwind, bất kể specificity | biết trước là nó sẽ không ăn (`forbidden-notice.tsx` và `<PreviewBanner>` đều dính); cần viền màu thật thì theo `<StatusPill>` — `style={{ borderColor }}` lấy màu từ `lib/theme.ts`. Đừng gỡ dòng 88: nó đang đặt viền mặc định cho cả console |
| Docker build fail ở `next/font` | build không có internet để tải Google Fonts | build trên máy có mạng; không đổi sang font local nếu chưa được duyệt |
| Trang trắng, asset 404 sau khi đổi prefix | `BASE_PATH` lúc build khác đường dẫn đang phục vụ | `BASE_PATH` là quyết định BUILD-TIME, build lại khi đổi (mục 2.1) |
| Link nhảy ra ngoài prefix | dùng `<a href="/…">` thô | dùng `next/link` |
| Chỉnh sửa trong thư (kiểu trực quan) MẤT khi sang tab khác rồi quay lại, hoặc "Lưu nháp" bấm ở tab khác lưu bản cũ | `<Tabs>` base-ui GỠ panel không mở -> bộ soạn GrapesJS bị huỷ (nội dung thư chỉ nằm trong nó); `content()` không còn bộ soạn để hỏi, gửi bản đã lưu | `keepMounted` cho tab Soạn thư (`template-editor.tsx`); bộ soạn tự biết đang ẩn / hiện qua `ResizeObserver` (`refresh()` khi hiện lại, không dựng thanh dưới qua portal khi ẩn). Đừng gỡ `keepMounted` |
| Mở dropdown là trắng trang, console `Base UI error #31` | `DropdownMenuLabel` (= `Menu.GroupLabel`) đặt NGOÀI `<DropdownMenuGroup>` | để label bên trong group; message thật nằm ở `node_modules/@base-ui/react/esm/menu/group/MenuGroupContext.js` |
| Thư THẬT đi với số liệu mẫu ("tháng 10/2026", link `reports.example.com`) từ màn Soạn thông báo | ô biến bị điền sẵn `sample` — chữ đậm như người dùng gõ, bấm Tiếp là gửi | ô biến để TRỐNG, mẫu chỉ là placeholder "ví dụ: …" (UX-10, `composer.tsx`); lỗi 422 gắn dưới đúng ô (`path` = tên biến; lỗi link chỉ có `path = payload` -> biến có mẫu là link), không gom thành một câu chung |
| Trang quản trị hiện dữ liệu rỗng dù backend chết | nuốt lỗi API | `<EmptyState>` / `<NoAppsScreen>` nêu mã lỗi (mục 2.2) |
| Ô nhập trong dialog giữ giá trị của lần mở trước | `<ConfirmDialog>` chỉ bật/tắt `open`, component không remount; reset trong `onCancel` không chạy khi đóng do thành công | `key` theo mục tiêu (`app.id:action`) để React dựng lại — với dialog ghi audit thì đây là bug **ghi sai dữ liệu**, không phải lỗi hiển thị |
| Hai ô tìm kiếm cạnh nhau, ra kết quả khác nhau | `<DataTable>` luôn dựng ô lọc riêng (lọc **trang đang hiển thị**), màn lại có thêm ô tìm phía máy chủ | `hideSearch` trên `<DataTable>` khi đã có tìm server-side; hai ô trông giống nhau nhưng một cái chỉ thấy 25 dòng đang mở |
| Hành động chỉ có trong một phiên wizard | đặt nút duyệt ở bước cuối wizard, không có ở danh sách | thao tác đổi trạng thái phải có ở màn **danh sách**; wizard chỉ là lối tắt (mục 2.5) |
| Link nội bộ làm mất app — bấm vào là bị đưa sang trang Tổ chức chọn lại app giữa chừng | dùng `next/link` / `useRouter` / `<a href="/…">` trần thay vì `<AppLink>` / `useAppRouter()` (mục 2.9) | `grep -rnE "from 'next/link'\|useRouter\b\|<a href=\"/" app components --include=*.tsx \| grep -v "components/ui/\|app-link.tsx\|useAppRouter"` phải rỗng |
| Số giả trên thanh trên / sidebar | `<PreviewBanner>` chỉ phủ vùng `<main>`, không phủ khung | số nào hiện ở khung phải lấy từ dữ liệu thật (`useAppSelection().apps`), không từ `lib/mock-data.ts` |
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
teal `#CCFBF1` · `--starlight #0369A1` (primary) · `--pulsar #9333EA` · `--solar #B45309` ·
`--supernova #BE123C` · `--aurora #047857` · text `#0F172A / #475569 / #5F6E83` ·
`--orbit #E2E8F0` (hairline).
`--text-muted` là `#5F6E83` từ UX-7 (trước là `#94A3B8`, chỉ ~2,6:1): đạt ≥ 4,5:1 trên trắng / `--void` / `#F1F5F9` / `#E0F2FE` mà vẫn nhạt hơn `--text-secondary`. Đổi token này phải giữ ≥ 4,5:1 trên cả bốn nền đó. `--mail-muted` là màu của THƯ (khung xem trước), không theo token console.
UX-8: `--starlight` / `--solar` / `--supernova` / `--aurora` và `statusColors` (lib/theme.ts) là sắc ĐẬM (700) — chữ ≥ 4,5:1 trên trắng / `--void`, chữ trắng trên nút `--starlight` cũng vậy; màu `<StatusPill>` (chữ = màu, nền = màu 7%) ≥ 4,5:1 trên nền nhãn. Sắc 400 cũ (`#34D399`, `#FBBF24`…) chỉ 1,5–2,5:1 — đừng đưa lại. Kiểm bằng `qa-contrast` (đo màu chữ vs nền thật trên mọi màn).

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


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
