import { CodeBlock } from '@/components/code-block'
import { ErrorCodesTable } from '@/components/notifications/error-codes-table'
import { GUIDE_ANCHOR } from '@/lib/app-routes'
import { PUBLIC_API_BASE } from '@/lib/openapi'
import { C, DocTable, List, Mark, Note, P, PathCard, Route, Steps, Sub, type GuideDoc } from './parts'
import * as S from './snippets'

/** Nội dung tiếng Việt của `/developers/guide`. Bản tiếng Anh `guide-en.tsx` giữ CÙNG `id` mục — neo dùng chung. */
export const GUIDE_VI: GuideDoc = {
  title: 'Hướng dẫn tích hợp',
  subtitle: 'Nối app vào EWS: gọi API, webhook, khoá truy cập.',
  tocLabel: 'Mục lục',
  sections: [
    {
      id: 'paths',
      title: 'Chọn cách tích hợp',
      body: (
        <>
          <P>Có bốn đường nối. Phần lớn app dùng đường đầu tiên, thêm webhook gửi đi nếu muốn biết thư đã đi chưa.</P>
          <div className="grid gap-3 sm:grid-cols-2">
            <PathCard direction="App → EWS" tone="var(--aurora)" title="API /v1" body="Backend của app khai người nhận và gửi thư, từng người hoặc cả chủ đề." auth="Authorization: Bearer ews_…" />
            <PathCard direction="EWS → App" tone="var(--starlight)" title="Webhook gửi đi" body="EWS gọi sang URL của app mỗi khi thư đã gửi, gửi lỗi, bị chặn hoặc được mở." auth="X-EWS-Signature: t=…,v1=…" />
            <PathCard direction="Hệ thống khác → EWS" tone="var(--solar)" title="Webhook nhận vào" body="Grafana, Datadog, Alertmanager, Gatus, Uptime Kuma hay script bắn JSON vào; EWS gửi cho người theo dõi chủ đề." auth="POST /hooks/ewshk_…" />
            <PathCard direction="Script / CI → EWS" tone="var(--pulsar)" title="Admin API bằng PAT" body="Tự động hoá việc vẫn làm trên console: chủ đề, template, webhook, lịch sử gửi." auth="Authorization: Bearer ewspat_…" />
          </div>
          <Note title="Mô hình cần hiểu trước khi code">
            EWS không giữ danh sách người nhận, app giữ. Mỗi lời gọi gửi là một lá thư cho một người. Chủ đề không phải danh sách
            gửi mà là câu hỏi “người này có đồng ý nhận loại tin này không”. App quyết định gửi cho ai, EWS quyết định có được phép
            gửi không.
          </Note>
        </>
      ),
    },
    {
      id: 'custom',
      title: 'Tuỳ biến được tới đâu',
      body: (
        <>
          <P>Mọi thứ chỉnh trên console đều làm được qua API. Vài tuỳ biến sâu hơn chỉ có qua API.</P>
          <DocTable
            head={['Thứ muốn đổi', 'Trên console', 'Chỉ qua API', 'Không đổi được']}
            rows={[
              [
                'Nội dung thư',
                <><Mark kind="yes">Có.</Mark> Template soạn trực quan hoặc HTML, khai biến, xuất bản; có thư viện mẫu.</>,
                <>Gửi HTML viết thẳng trong <C>/v1/notifications</C>.</>,
                <>HTML bị kiểm: không script, không <C>on*</C>, link chỉ <C>https://</C> / <C>mailto:</C>.</>,
              ],
              [
                'Chủ đề',
                <><Mark kind="yes">Có.</Mark> Tạo, kích hoạt, tạm ngưng, bắt buộc, mặc định nhận / không nhận.</>,
                <>App đọc bằng <C>GET /v1/topics</C>.</>,
                <>App không tạo chủ đề qua <C>/v1</C>.</>,
              ],
              [
                'Lịch gửi',
                <><Mark kind="yes">Có.</Mark> Khung giờ gửi, dàn đều N thư/phút, giới hạn mỗi người mỗi ngày.</>,
                '—',
                'Trần tốc độ và trần mỗi giờ do Super Admin đặt.',
              ],
              [
                'Webhook gửi đi',
                <><Mark kind="yes">Có.</Mark> URL, sự kiện, Gửi thử, Đổi secret, Nhật ký gọi.</>,
                '—',
                'Khuôn body, header, chữ ký, lịch gọi lại.',
              ],
              [
                'Webhook nhận vào',
                <><Mark kind="yes">Có.</Mark> Chủ đề, template, công cụ gọi vào, gửi khi nào; body mẫu, thư mẫu, nhật ký.</>,
                <><Mark kind="part">Ánh xạ JSON tự do</Mark>, giá trị cố định, điều kiện phát, khoá chống trùng.</>,
                'Số lần mỗi phút, khung chống trùng (Super Admin).',
              ],
              [
                'Khoá truy cập (PAT)',
                <><Mark kind="yes">Có.</Mark> Tên, <C>read</C> / <C>write</C>, hạn 7–365 ngày, thu hồi.</>,
                '—',
                'Chưa giới hạn theo từng app; PAT mang đúng quyền người tạo.',
              ],
            ]}
          />
        </>
      ),
    },
    {
      id: 'setup',
      title: 'Chuẩn bị trên console',
      body: (
        <>
          <P>Làm một lần trước khi viết code. Tạo app, cấp khoá, chủ đề, template, webhook cần vai Owner / Org Admin của tổ chức hoặc App Admin của app.</P>
          <Steps
            items={[
              { title: 'Tạo tổ chức và app', detail: 'Chưa thuộc tổ chức nào thì tạo mới, bạn thành Owner. App tạo xong dùng được ngay.' },
              { title: 'Cấp khoá API', detail: <>Cài đặt App → Credentials → Cấp khoá mới. Đặt tên theo nơi dùng (prod, staging…). Khoá chỉ hiện một lần.</> },
              { title: 'Tạo chủ đề và kích hoạt', detail: <>Mỗi loại tin một chủ đề, ví dụ <C>order_updates</C>. Chủ đề còn nháp thì gửi bị từ chối.</> },
              { title: 'Soạn template (tuỳ chọn)', detail: <>Templates → tạo từ mẫu hoặc trang trắng → Xuất bản. Ghi lại <C>templateId</C>.</> },
              { title: 'Webhook (tuỳ chọn)', detail: 'Cài đặt App → Webhooks: tab Gửi đi để EWS báo kết quả, tab Nhận vào để hệ thống khác gọi vào.' },
              { title: 'Giới hạn IP (tuỳ chọn)', detail: <>Báo đội EWS IP máy chủ của app. Khai rồi thì IP khác bị <C>IP_NOT_ALLOWED</C>; chưa nhận dải CIDR.</> },
            ]}
          />
        </>
      ),
    },
    {
      id: GUIDE_ANCHOR.api,
      title: 'Tích hợp qua API /v1',
      sub: [
        { id: 'api-users', title: 'Khai người nhận' },
        { id: 'api-prefs', title: 'Màn cài đặt thông báo' },
        { id: 'api-send', title: 'Gửi thư' },
        { id: 'api-status', title: 'Theo dõi kết quả' },
        { id: 'api-errors', title: 'Mã lỗi, thử lại' },
      ],
      body: (
        <>
          <P>
            Địa chỉ <C>{PUBLIC_API_BASE}</C>, chỉ <C>https</C>. Khoá API gửi thẳng trong header, không có bước đổi khoá lấy token. Giữ
            khoá ở máy chủ, không nhúng vào trình duyệt hay app di động.
          </P>
          <CodeBlock language="bash" value={S.CHECK_KEY} />
          <DocTable
            head={['Route', 'Làm gì']}
            rows={[
              [<Route key="r" method="GET" path="/v1/me" />, 'Trạng thái app, kênh được cấp'],
              [<Route key="r" method="GET" path="/v1/topics" />, 'Chủ đề đang kích hoạt'],
              [<Route key="r" method="PUT" path="/v1/users/:externalId" />, 'Khai / cập nhật người nhận và email'],
              [<Route key="r" method="DELETE" path="/v1/users/:externalId/email" />, 'Ngắt email (nghỉ việc)'],
              [<Route key="r" method="PUT" path="/v1/users/:externalId/preferences" />, 'Ghi lựa chọn nhận tin (GET để đọc)'],
              [<Route key="r" method="POST" path="/v1/notifications" />, 'Gửi cho một người'],
              [<Route key="r" method="POST" path="/v1/publications" />, 'Phát vào chủ đề (≤ 100 người)'],
              [<Route key="r" method="GET" path="/v1/notifications/:id" />, 'Trạng thái một lá thư'],
            ]}
          />

          <Sub id="api-users">Bước 1 · Khai người nhận</Sub>
          <P>EWS không biết nhân viên nào tồn tại cho tới khi app khai. Gửi cho người chưa khai bị <C>RECIPIENT_NOT_FOUND</C>.</P>
          <CodeBlock language="http" value={S.PUT_USER} />
          <List
            items={[
              <><C>NV-0123</C> là mã của chính app: chữ, số và <C>. _ - : @ |</C>, tối đa 255 ký tự.</>,
              <>Tạo mới trả <C>201</C>, đã có trả <C>200</C>. Gọi lại bao nhiêu lần cũng được, mỗi khi hồ sơ đổi.</>,
              <>Một địa chỉ chỉ thuộc một người trong app, trùng thì <C>409 EMAIL_TAKEN</C>.</>,
              'Lần đầu nối vào: lặp cho mọi nhân viên hiện có. Chưa có API khai nhiều người một lần.',
              'Không cấp lại mã của người đã nghỉ cho người mới: người mới thừa kế lựa chọn và trạng thái ngắt email của người cũ.',
            ]}
          />

          <Sub id="api-prefs">Bước 2 · Màn “Cài đặt nhận thông báo”</Sub>
          <P>Nhân viên chỉ tắt được thông báo qua màn do app dựng. EWS là nơi duy nhất giữ lựa chọn; app không lưu bản sao.</P>
          <CodeBlock language="http" value={S.GET_PREFS} />
          <CodeBlock language="http" value={S.PUT_PREFS} />
          <List
            items={[
              <>Vẽ công tắc theo <C>effectiveOptIn</C>, không theo <C>optedIn</C> (<C>null</C> = chưa bấm).</>,
              <><C>mandatory: true</C>: công tắc bật và khoá; tắt bị <C>422 TOPIC_MANDATORY</C>.</>,
              <>Không viết cứng danh sách chủ đề; vẽ từ kết quả <C>GET</C>.</>,
              <><C>PUT</C> kiểm hết rồi mới ghi, chỉ gửi chủ đề vừa đổi; kết quả trả đúng khuôn của <C>GET</C>.</>,
            ]}
          />

          <Sub id="api-send">Bước 3 · Gửi thư</Sub>
          <P>Cách 1, nội dung viết thẳng:</P>
          <CodeBlock language="http" value={S.SEND_DIRECT} />
          <P>Cách 2, bằng template — người soạn sửa nội dung trên console, app không phải deploy lại:</P>
          <CodeBlock language="http" value={S.SEND_TEMPLATE} />
          <List
            items={[
              <><C>202</C> = EWS đã nhận, chưa gửi. Thư đi sau trong hàng đợi.</>,
              <><C>idempotencyKey</C>: cùng khoá gọi lại trả <C>200</C> kèm bản cũ, không gửi lần hai. Khoá đại diện cho “lá thư này, cho người này”.</>,
              <>EWS luôn dùng bản template đang xuất bản. <C>payload</C> phẳng, ≤ 2 KB, giá trị chữ / số / <C>true</C> / <C>false</C>.</>,
              <><C>templateId</C> khác nhau giữa các môi trường: để trong cấu hình, đừng viết cứng.</>,
              <>Người soạn thêm biến bắt buộc mới thì lời gọi thiếu biến bị <C>MISSING_VARIABLE</C> — thống nhất trước khi xuất bản.</>,
              <>Gửi cả chủ đề: <C>POST /v1/publications</C>, bỏ <C>to</C>, <C>idempotencyKey</C> bắt buộc, tối đa 100 người.</>,
            ]}
          />
          <CodeBlock language="node" value={S.NODE_CLIENT} />

          <Sub id="api-status">Bước 4 · Theo dõi kết quả</Sub>
          <P>
            Hỏi <C>GET /v1/notifications/:id</C>, hoặc để EWS tự báo qua <a href={`#${GUIDE_ANCHOR.webhookOut}`} className="text-[var(--starlight)] hover:underline">webhook gửi đi</a>.
          </P>
          <DocTable
            head={['status', 'Nghĩa', 'App làm gì']}
            rows={[
              [<C key="s">scheduled</C>, <>Chờ khung giờ / dàn đều, đi lúc <C>scheduledAt</C></>, 'Chờ'],
              [<C key="s">queued · sending</C>, 'Trong hàng đợi / đang gửi', 'Chờ'],
              [<C key="s">sent</C>, 'Máy chủ thư đã nhận (chưa chắc vào hộp thư)', 'Xong'],
              [<C key="s">no_recipient</C>, <>Người nhận bị chặn, xem <C>recipient.exclusionReason</C></>, 'Không gửi lại — hệ thống làm đúng'],
              [<C key="s">failed</C>, <>Gửi không được, xem <C>recipient.error</C></>, <><C>outcome_unknown</C> = không rõ đã đi chưa; gửi lại thì dùng khoá mới</>],
            ]}
          />

          <Sub id="api-errors">Mã lỗi và khi nào thử lại</Sub>
          <List
            items={[
              <>Lỗi là <C>application/problem+json</C>. <C>422</C> có <C>code: VALIDATION</C> ở ngoài, mã cụ thể trong <C>issues[]</C>. Xử lý theo mã, không theo chữ.</>,
              <><C>4xx</C> (trừ <C>429</C>): sửa rồi mới gọi lại.</>,
              <><C>429 APP_HOURLY_LIMIT</C>: chờ đúng <C>Retry-After</C>; <C>5xx</C> / hết giờ: thử lại có giãn cách. Cả hai giữ nguyên <C>idempotencyKey</C>.</>,
            ]}
          />
          <ErrorCodesTable />
        </>
      ),
    },
    {
      id: GUIDE_ANCHOR.webhookOut,
      title: 'Webhook gửi đi: EWS báo kết quả',
      body: (
        <>
          <P>Thay vì hỏi trạng thái nhiều lần, app dựng một route nhận và để EWS gọi sang mỗi khi một lá thư có kết quả.</P>
          <Steps
            items={[
              { title: 'Thêm URL', detail: <>Cài đặt App → Webhooks → Gửi đi → Thêm URL. Phải <C>https://</C>, gọi được từ Internet; mạng nội bộ bị từ chối. Tối đa 10 URL.</> },
              { title: 'Chọn sự kiện nhận', detail: 'Một URL nhận một hoặc nhiều sự kiện ở bảng dưới.' },
              { title: 'Cất secret', detail: <>Console hiện <C>whsec_…</C> một lần. Mất thì Đổi secret — secret cũ hết hiệu lực ngay.</> },
              { title: 'Gửi thử', detail: <>EWS gửi <C>ping</C>; kết quả từng lần gọi xem ở Nhật ký gọi.</> },
            ]}
          />
          <CodeBlock language="http" value={S.WEBHOOK_REQUEST} />
          <DocTable
            head={['type', 'Khi nào', 'data đáng chú ý']}
            rows={[
              [<C key="t">notification.sent</C>, 'Máy chủ thư đã nhận', '—'],
              [<C key="t">notification.failed</C>, 'Gửi không được', <C key="d">error</C>],
              [<C key="t">notification.no_recipient</C>, 'Người nhận bị chặn', <C key="d">exclusionReason</C>],
              [<C key="t">notification.opened</C>, 'Mở thư lần đầu — chỉ khi app bật Theo dõi mở thư; số ước tính', <C key="d">openedAt</C>],
              [<C key="t">ping</C>, 'Bấm Gửi thử', 'rỗng'],
            ]}
          />
          <P>Body không có địa chỉ email hay nội dung thư. App phải làm ba việc:</P>
          <List
            ordered
            items={[
              'Kiểm chữ ký trên body gốc (chuỗi nhận được, chưa parse). URL công khai, ai cũng gọi giả được.',
              <>Trả <C>2xx</C> trong 10 giây. Khác <C>2xx</C>, quá giờ hay redirect là lỗi; EWS gọi lại sau 1 phút · 5 phút · 30 phút · 2 giờ · 6 giờ rồi dừng.</>,
              <>Bỏ bản trùng theo <C>id</C>. Một sự kiện có thể tới hai lần; thứ tự giữa các thư không đảm bảo.</>,
            ]}
          />
          <CodeBlock language="node" value={S.VERIFY_NODE} />
          <CodeBlock language="python" value={S.VERIFY_PYTHON} />
        </>
      ),
    },
    {
      id: GUIDE_ANCHOR.webhookIn,
      title: 'Webhook nhận vào: hệ thống khác gọi EWS',
      sub: [
        { id: 'in-tools', title: 'Công cụ giám sát' },
        { id: 'in-custom', title: 'Ánh xạ JSON tuỳ biến' },
      ],
      body: (
        <>
          <P>
            Dùng khi thứ phát tin là hệ thống chỉ biết gọi webhook: công cụ giám sát, công cụ tự động hoá, script của đội. Không
            cần khoá API — URL chính là chìa khoá.
          </P>
          <P>
            Mỗi lần gọi đi qua: rút biến từ JSON → điều kiện phát → giới hạn mỗi phút → chống trùng → gửi cho người theo dõi chủ đề
            (tối đa 100).
          </P>
          <Steps
            items={[
              { title: 'Thêm webhook', detail: 'Cài đặt App → Webhooks → Nhận vào → Thêm webhook. Chọn chủ đề (gửi cho ai) và template (nội dung). Tối đa 20 mỗi app.' },
              { title: 'Chọn công cụ gọi vào', detail: 'Khác (tự đặt body), Datadog, Grafana, Prometheus Alertmanager, Gatus, Uptime Kuma. Công cụ giám sát có thêm Gửi khi: đang lỗi, đã khắc phục, cả hai.' },
              { title: 'Sao chép URL', detail: 'Lấy lại được bất cứ lúc nào (mỗi lần lấy đều ghi nhật ký). Lộ thì Đổi URL, URL cũ ngừng ngay.' },
              { title: 'Dán vào hệ thống kia', detail: 'Mở webhook trên console: các bước cài cho công cụ đã chọn, Body mẫu, Thư mẫu, Nhật ký.' },
            ]}
          />
          <Sub>Khuôn chung (JSON)</Sub>
          <P>Hệ thống sửa được body thì gửi JSON có trường trùng tên biến của template (bỏ tiền tố <C>payload.</C>).</P>
          <CodeBlock language="bash" value={S.INCOMING_CURL} />
          <List
            items={[
              'Giá trị chữ, số, true / false; mảng chữ / số được nối bằng dấu phẩy; chuỗi rỗng coi như không có; trường thừa bị bỏ qua.',
              <>Chống trùng: header <C>Idempotency-Key</C> nếu có; không có thì cùng body trong 10 phút chỉ gửi một lần.</>,
              'Tối đa 20 lần gửi mỗi phút mỗi webhook, chặn bão cảnh báo.',
            ]}
          />
          <DocTable
            head={['HTTP', 'Kết quả']}
            rows={[
              ['202', <C key="b">{'{"status":"published","publicationId":"…","recipientCount":12}'}</C>],
              ['200', <><C>duplicate</C> trùng lần trước · <C>skipped</C> không thoả điều kiện phát</>],
              ['404', <><C>NOT_FOUND</C>: URL sai, webhook đã tắt hoặc đã xoá</>],
              ['422', <><C>MISSING_VARIABLE</C> · <C>INVALID_PAYLOAD_VALUE</C> · <C>INCOMING_BODY_INVALID</C> · <C>PUBLICATION_TOO_LARGE</C></>],
              ['429', <C key="c">INCOMING_HOOK_RATE_LIMITED</C>],
            ]}
          />

          <Sub id="in-tools">Công cụ giám sát dựng sẵn</Sub>
          <DocTable
            head={['Công cụ', 'Kiểu', 'Cách cài']}
            rows={[
              ['Grafana', 'JSON cố định', <>Contact point kiểu Webhook, dán URL. EWS tự đọc <C>alerts[0]</C> và <C>status</C>.</>],
              ['Prometheus Alertmanager', 'JSON cố định', <><C>webhook_configs</C>, dán URL. Cùng khuôn với Grafana.</>],
              ['Datadog', 'Tự viết body', <>Integrations → Webhooks, bật Custom Payload, dán Body mẫu; nhắc <C>@webhook-[tên]</C> trong monitor.</>],
              ['Gatus', 'Tự viết body', <><C>alerting.custom</C> với Body mẫu; bật <C>send-on-resolved</C> nếu muốn báo lúc hết sự cố.</>],
              ['Uptime Kuma', 'Tự viết body', <>Notification Webhook, Request Body: Custom Body, dán Body mẫu, header <C>Content-Type: application/json</C>.</>],
            ]}
          />
          <P>
            Template nên tạo từ mẫu Cảnh báo sự cố (biến <C>incident_title</C>, <C>severity</C>, <C>started_at</C>, <C>detail_url</C>,{' '}
            <C>resolved_at</C>, <C>summary</C>) để EWS tự ghép đủ biến. Link chi tiết phải <C>https://</C>.
          </P>
          <CodeBlock language="yaml" value={S.GATUS_YAML} />

          <Sub id="in-custom">Ánh xạ JSON tuỳ biến (chỉ qua API)</Sub>
          <P>
            Hệ thống chỉ gửi được JSON cố định của nó và không có trong danh sách trên: tự khai biến nào lấy từ đâu. Gọi admin API
            bằng <a href={`#${GUIDE_ANCHOR.pat}`} className="text-[var(--starlight)] hover:underline">PAT write</a> của người quản lý app.
          </P>
          <DocTable
            head={['Trường', 'Ý nghĩa']}
            rows={[
              [<C key="f">mappings[] · kind: path</C>, <>Lấy biến từ đường dẫn: <C>a.b</C>, <C>a[0]</C>, <C>a[-1]</C> (phần tử cuối), <C>{'a["k.k"]'}</C>. <C>defaultValue</C> khi không có.</>],
              [<C key="f">mappings[] · kind: fixed</C>, 'Biến luôn bằng một chữ cố định.'],
              [<C key="f">condition</C>, <><C>{'{ path, values[] }'}</C>: chỉ phát khi giá trị tại <C>path</C> nằm trong <C>values</C>; không thoả trả <C>200 skipped</C>.</>],
              [<C key="f">dedupePath</C>, 'Đường dẫn tới mã sự kiện của hệ thống kia; cùng mã là cùng một lần gửi.'],
            ]}
          />
          <P>Thử cấu hình trên một body mẫu trước — không ghi gì, không gửi gì:</P>
          <CodeBlock language="bash" value={S.INCOMING_PREVIEW} />
          <P>
            Đúng ý thì ghi vào webhook thật: <C>PATCH /admin/apps/:appId/incoming-webhooks/:hookId</C> với{' '}
            <C>{'{ "config": { "name": …, …như trên } }'}</C>. URL không đổi.
          </P>
          <Note tone="warn" title="Sửa trên console sau đó">
            Webhook ánh xạ tự viết thì để trống <C>integration</C>. Sửa trên console mà vẫn giữ “Khác (tự đặt body)” và cùng template thì
            ánh xạ, điều kiện được giữ. Đổi template hoặc chọn công cụ giám sát thì ánh xạ tự viết bị thay — phải gọi lại API.
          </Note>
        </>
      ),
    },
    {
      id: GUIDE_ANCHOR.pat,
      title: 'Tự động hoá bằng khoá truy cập (PAT)',
      body: (
        <>
          <P>
            PAT cho script và CI gọi toàn bộ <C>/admin/*</C> thay bạn. Khác khoá API: khoá API thuộc app và chỉ gọi <C>/v1</C>; PAT
            thuộc một người và gọi được phần quản trị.
          </P>
          <Steps
            items={[
              { title: 'Tạo', detail: <>Menu tài khoản → Khoá truy cập cá nhân. Đặt tên, chọn phạm vi và hạn. Token <C>ewspat_…</C> hiện một lần.</> },
              { title: 'Gọi', detail: <><C>Authorization: Bearer ewspat_…</C> tới <C>{PUBLIC_API_BASE}/admin/…</C>.</> },
              { title: 'Thu hồi', detail: 'Khi không dùng nữa hoặc nghi lộ. Thu hồi xong là hết dùng, không khôi phục được.' },
            ]}
          />
          <DocTable
            head={['Câu hỏi', 'Trả lời']}
            rows={[
              ['Làm được gì?', 'Đúng những gì người tạo làm được trên console, không hơn. Mất vai ở đâu thì PAT mất quyền ở đó.'],
              [<><C>read</C> / <C>write</C></>, <><C>read</C> chỉ <C>GET</C> / <C>HEAD</C>, lệnh ghi bị <C>403 PAT_SCOPE_INSUFFICIENT</C>. <C>write</C> làm mọi lệnh ghi người tạo được phép.</>],
              ['Không làm được', <>Quản lý PAT (<C>403 SESSION_REQUIRED</C>) và gọi <C>/v1</C>. PAT lộ cũng không tự sinh PAT mới được.</>],
              ['Giới hạn', 'Tối đa 10 PAT mỗi người, hạn dài nhất 365 ngày (Super Admin chỉnh được).'],
              ['Dấu vết', <>Danh sách hiện lần dùng cuối và IP; lệnh ghi qua PAT ghi nhật ký với nguồn <C>admin_pat</C>.</>],
              ['Muốn quyền hẹp hơn', 'Tạo PAT cho CI từ tài khoản chỉ có vai cần thiết, ví dụ App Viewer của đúng một app.'],
            ]}
          />
          <CodeBlock language="bash" value={S.PAT_CURL} />
        </>
      ),
    },
    {
      id: 'limits',
      title: 'Giới hạn và những gì chưa có',
      body: (
        <>
          <DocTable
            head={['Giới hạn', 'Mặc định']}
            rows={[
              ['Tốc độ gửi chung', '30 thư/phút cho mọi app — 1 000 lời gọi nhận trong vài giây nhưng thư cuối có thể đi sau hơn nửa giờ.'],
              ['Phát vào chủ đề', '≤ 100 người mỗi lần'],
              ['Kích thước', <>Mỗi phần thân ≤ 256 KB · request ≤ 512 KB · <C>payload</C> ≤ 2 KB</>],
              ['Khoá API / URL gửi đi / webhook nhận vào', '20 / 10 / 20 mỗi app'],
            ]}
          />
          <List
            items={[
              'Chưa có kênh khác email, gửi theo phân khúc, hẹn giờ / huỷ / gửi lại thư đã nhận.',
              <>Chưa xử lý thư dội về: app phải tự ngắt email người nghỉ việc (<C>DELETE /v1/users/:externalId/email</C>).</>,
              'Chưa có link “Quản lý thông báo” trong thư — màn cài đặt của app là cửa duy nhất.',
              <>Chưa có webhook “đã vào hộp thư” hay “lần phát đã xong”: đếm theo <C>publicationId</C> hoặc <C>GET /v1/publications/:id</C>.</>,
              'Không hợp cho tin cần tới số đông trong vài giây.',
            ]}
          />
        </>
      ),
    },
    {
      id: 'checklist',
      title: 'Checklist trước khi chạy thật',
      body: (
        <List
          items={[
            <>Mỗi môi trường một khoá API có tên; <C>templateId</C> nằm trong cấu hình theo môi trường.</>,
            <>Đã khai đủ nhân viên và gọi <C>PUT /v1/users</C> mỗi khi hồ sơ đổi.</>,
            'Màn “Cài đặt nhận thông báo” chạy trước lần gửi đầu tiên.',
            <>Mọi lời gọi gửi có <C>idempotencyKey</C> ổn định; thử lại giữ nguyên khoá.</>,
            <>Xử lý lỗi theo <C>code</C>, không theo chữ trong <C>detail</C>.</>,
            'Quy trình nghỉ việc gọi ngắt email.',
            <>Route webhook kiểm chữ ký, trả <C>2xx</C> trong 10 giây, khử trùng theo <C>id</C>.</>,
            'Đã chạy thử cả vòng với email của chính mình — thư chạy thử đi thật.',
          ]}
        />
      ),
    },
  ],
}
