import { PUBLIC_API_BASE } from '@/lib/openapi'

/**
 * Đoạn code của trang Hướng dẫn tích hợp — dùng chung hai ngôn ngữ (code không dịch). Route, body, header sao đúng
 * backend (`docs/huong-dan-tich-hop-cho-doi-app.md` + `admin-incoming-hooks.routes.ts`); đổi ở backend thì sửa ở đây.
 */
const EWS = PUBLIC_API_BASE

export const CHECK_KEY = `EWS=${EWS}
curl -s $EWS/v1/me -H "Authorization: Bearer $EWS_API_KEY"
# -> "status":"active", "grantedChannels":["email"]`

export const PUT_USER = `PUT /v1/users/NV-0123
Authorization: Bearer ews_…
Content-Type: application/json

{ "email": "an.nguyen@company.com" }`

export const GET_PREFS = `GET /v1/users/NV-0123/preferences

{
  "externalId": "NV-0123",
  "email": { "status": "active", "optedOutOptional": false },
  "topics": [
    { "key": "order_updates", "name": "Cập nhật đơn hàng", "mandatory": false,
      "defaultMode": "opt_out", "optedIn": null, "effectiveOptIn": true }
  ]
}`

export const PUT_PREFS = `PUT /v1/users/NV-0123/preferences
Content-Type: application/json

{ "topics": { "order_updates": false }, "optedOutOptional": false }`

export const SEND_DIRECT = `POST /v1/notifications
Authorization: Bearer ews_…
Content-Type: application/json

{
  "to": { "externalId": "NV-0123" },
  "topic": "order_updates",
  "subject": "Đơn OS10527 đã giao",
  "html": "<p>Đơn của bạn đã giao.</p>",
  "text": "Đơn của bạn đã giao.",
  "idempotencyKey": "order-OS10527-delivered-NV-0123"
}`

export const SEND_TEMPLATE = `POST /v1/notifications

{
  "to": { "externalId": "NV-0123" },
  "topic": "vm_alerts",
  "templateId": "3f2a9c1e-7b4d-4e8a-9f10-2c6d5e8b1a73",
  "payload": { "vm_name": "ai-gateway", "threshold": 80 },
  "idempotencyKey": "vm-ai-gateway-high-load-2026-09-30T09:00-NV-0123"
}`

export const NODE_CLIENT = `const EWS = '${EWS}'
const headers = { Authorization: \`Bearer \${process.env.EWS_API_KEY}\`, 'Content-Type': 'application/json' }

async function ews(method, path, body) {
  const res = await fetch(EWS + path, { method, headers, body: body && JSON.stringify(body) })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // 422: specific code is in issues[]; the outer code is only VALIDATION
    const code = data?.issues?.[0]?.code ?? data?.code
    throw Object.assign(new Error(\`\${res.status} \${code}\`), { status: res.status, code, problem: data })
  }
  return data
}

await ews('PUT', '/v1/users/NV-0123', { email: 'an.nguyen@company.com' })
const sent = await ews('POST', '/v1/notifications', {
  to: { externalId: 'NV-0123' },
  topic: 'order_updates',
  templateId: process.env.EWS_TEMPLATE_ORDER_DELIVERED,
  payload: { order_code: 'OS10527' },
  idempotencyKey: 'order-OS10527-delivered-NV-0123',
})
console.log(sent.id, sent.status) // "queued" | "scheduled"`

export const WEBHOOK_REQUEST = `POST https://app.example.com/ews-webhook
Content-Type: application/json
X-EWS-Event: notification.sent
X-EWS-Delivery-Id: <delivery id>
X-EWS-Signature: t=1791625213,v1=9f2c…

{
  "id": "4c0e…",
  "type": "notification.sent",
  "createdAt": "2026-10-10T09:40:13.411Z",
  "data": {
    "notificationId": "…", "publicationId": null, "externalId": "NV-0123",
    "topic": "order_updates", "status": "sent", "exclusionReason": null, "error": null
  }
}`

export const VERIFY_NODE = `import crypto from 'node:crypto'
import express from 'express'

function verify(rawBody, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(',').map((p) => p.split('=')))
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false // older than 5 minutes
  const expected = crypto.createHmac('sha256', secret).update(\`\${t}.\${rawBody}\`).digest('hex')
  return expected.length === v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
}

const app = express()
// Keep the raw body: the signature is computed over the exact bytes EWS sent
app.post('/ews-webhook', express.text({ type: 'application/json' }), (req, res) => {
  if (!verify(req.body, req.get('X-EWS-Signature') ?? '', process.env.EWS_WEBHOOK_SECRET)) return res.sendStatus(401)
  const event = JSON.parse(req.body)
  queue.push(event) // process later, dedupe by event.id
  res.sendStatus(204)
})`

export const VERIFY_PYTHON = `import hashlib, hmac, time

def verify(raw_body: bytes, header: str, secret: str) -> bool:
    parts = dict(p.split("=", 1) for p in header.split(","))
    t, v1 = parts.get("t", ""), parts.get("v1", "")
    if not t.isdigit() or abs(time.time() - int(t)) > 300:
        return False
    expected = hmac.new(secret.encode(), f"{t}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)`

export const INCOMING_CURL = `curl -X POST "${EWS}/hooks/ewshk_…" \\
  -H 'Content-Type: application/json' \\
  -H 'Idempotency-Key: vm-web-01-cpu-2026-10-25T09:00' \\
  -d '{ "title": "VM web-01 quá tải", "name_issue": "CPU > 95% trong 5 phút" }'`

export const GATUS_YAML = `alerting:
  custom:
    url: "${EWS}/hooks/ewshk_…"
    method: "POST"
    headers:
      Content-Type: application/json
    body: |
      { "title": "[ENDPOINT_NAME]", "name_issue": "[ALERT_DESCRIPTION]" }
    default-alert:
      send-on-resolved: false`

export const INCOMING_PREVIEW = `EWS=${EWS}
APP=<appId>
curl -s -X POST "$EWS/admin/apps/$APP/incoming-webhooks/preview" \\
  -H "Authorization: Bearer $EWS_PAT" -H 'Content-Type: application/json' \\
  -d @- <<'JSON'
{
  "config": {
    "topicId": "<topicId>",
    "templateId": "<templateId>",
    "mappings": [
      { "variable": "incident_title", "kind": "path",  "path": "event.title" },
      { "variable": "severity",       "kind": "path",  "path": "event.tags[\\"sev\\"]", "defaultValue": "—" },
      { "variable": "source",         "kind": "fixed", "value": "Jenkins" }
    ],
    "condition": { "path": "event.state", "values": ["FAILED", "UNSTABLE"] },
    "dedupePath": "event.id"
  },
  "sample": { "event": { "id": "b-1932", "state": "FAILED", "title": "Build #1932 failed", "tags": { "sev": "high" } } }
}
JSON`

export const PAT_CURL = `# OpenAPI 3.1 of every route (/v1, /hooks, /admin)
curl -s ${EWS}/admin/openapi.json \\
  -H "Authorization: Bearer $EWS_PAT" -o openapi.json

# Topics of one app
curl -s ${EWS}/admin/apps/<appId>/topics \\
  -H "Authorization: Bearer $EWS_PAT"`
