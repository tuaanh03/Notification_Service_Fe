import { CodeBlock } from '@/components/code-block'
import { ErrorCodesTable } from '@/components/notifications/error-codes-table'
import { GUIDE_ANCHOR } from '@/lib/app-routes'
import { PUBLIC_API_BASE } from '@/lib/openapi'
import { C, DocTable, List, Mark, Note, P, PathCard, Route, Steps, Sub, type GuideDoc } from './parts'
import * as S from './snippets'

/** Nội dung tiếng Anh của `/developers/guide` — cùng `id` mục với `guide-vi.tsx`. */
export const GUIDE_EN: GuideDoc = {
  title: 'Integration guide',
  subtitle: 'Connect an app to EWS: API calls, webhooks, access tokens.',
  tocLabel: 'Contents',
  sections: [
    {
      id: 'paths',
      title: 'Pick an integration path',
      body: (
        <>
          <P>There are four ways in. Most apps use the first, plus outgoing webhooks to learn whether mail went out.</P>
          <div className="grid gap-3 sm:grid-cols-2">
            <PathCard direction="App → EWS" tone="var(--aurora)" title="API /v1" body="The app's backend registers recipients and sends mail, one person or a whole topic." auth="Authorization: Bearer ews_…" />
            <PathCard direction="EWS → App" tone="var(--starlight)" title="Outgoing webhook" body="EWS calls the app's URL when mail is sent, fails, is blocked or is opened." auth="X-EWS-Signature: t=…,v1=…" />
            <PathCard direction="Other system → EWS" tone="var(--solar)" title="Incoming webhook" body="Grafana, Datadog, Alertmanager, Gatus, Uptime Kuma or a script posts JSON; EWS mails the topic's followers." auth="POST /hooks/ewshk_…" />
            <PathCard direction="Script / CI → EWS" tone="var(--pulsar)" title="Admin API with a PAT" body="Automate what you do in the console: topics, templates, webhooks, send history." auth="Authorization: Bearer ewspat_…" />
          </div>
          <Note title="The model to understand first">
            EWS does not keep recipient lists; the app does. Each send call is one email to one person. A topic is not a mailing
            list but the question “has this person agreed to receive this kind of message”. The app decides who to send to; EWS
            decides whether sending is allowed.
          </Note>
        </>
      ),
    },
    {
      id: 'custom',
      title: 'What you can customise',
      body: (
        <>
          <P>Everything you change in the console can also be done through the API. A few deeper options exist only in the API.</P>
          <DocTable
            head={['What', 'In the console', 'API only', 'Fixed']}
            rows={[
              [
                'Email content',
                <><Mark kind="yes">Yes.</Mark> Visual or HTML templates, variables, publishing; a preset library.</>,
                <>Send raw HTML in <C>/v1/notifications</C>.</>,
                <>HTML is checked: no scripts, no <C>on*</C>, links only <C>https://</C> / <C>mailto:</C>.</>,
              ],
              [
                'Topics',
                <><Mark kind="yes">Yes.</Mark> Create, activate, suspend, mandatory, default opt-in / opt-out.</>,
                <>Apps read them with <C>GET /v1/topics</C>.</>,
                <>Apps cannot create topics through <C>/v1</C>.</>,
              ],
              [
                'Sending schedule',
                <><Mark kind="yes">Yes.</Mark> Send window, pacing N mails/minute, per-recipient daily limit.</>,
                '—',
                'Rate ceiling and hourly cap are set by the Super Admin.',
              ],
              [
                'Outgoing webhooks',
                <><Mark kind="yes">Yes.</Mark> URL, events, Send test, secret rotation, delivery log.</>,
                '—',
                'Body shape, headers, signature, retry schedule.',
              ],
              [
                'Incoming webhooks',
                <><Mark kind="yes">Yes.</Mark> Topic, template, calling tool, when to send; sample body, sample email, log.</>,
                <><Mark kind="part">Free JSON mapping</Mark>, fixed values, publish condition, dedupe key.</>,
                'Calls per minute, dedupe window (Super Admin).',
              ],
              [
                'Access tokens (PAT)',
                <><Mark kind="yes">Yes.</Mark> Name, <C>read</C> / <C>write</C>, 7–365 day lifetime, revoke.</>,
                '—',
                'Not limited per app; a PAT carries exactly its creator’s permissions.',
              ],
            ]}
          />
        </>
      ),
    },
    {
      id: 'setup',
      title: 'Set up in the console',
      body: (
        <>
          <P>Do this once before writing code. Apps, keys, topics, templates and webhooks need Owner / Org Admin of the organisation or App Admin of the app.</P>
          <Steps
            items={[
              { title: 'Create an organisation and an app', detail: 'Not in an organisation yet? Create one and you become its Owner. A new app works right away.' },
              { title: 'Issue an API key', detail: 'App settings → Credentials → Issue new key. Name it after where it runs (prod, staging…). It is shown once.' },
              { title: 'Create and activate topics', detail: <>One topic per kind of message, e.g. <C>order_updates</C>. Sending to a draft topic is rejected.</> },
              { title: 'Write a template (optional)', detail: <>Templates → from a preset or blank → Publish. Note the <C>templateId</C>.</> },
              { title: 'Webhooks (optional)', detail: 'App settings → Webhooks: Outgoing for delivery results, Incoming for other systems calling in.' },
              { title: 'IP allowlist (optional)', detail: <>Send the EWS team your server IPs. Other IPs then get <C>IP_NOT_ALLOWED</C>; CIDR ranges are not supported.</> },
            ]}
          />
        </>
      ),
    },
    {
      id: GUIDE_ANCHOR.api,
      title: 'Integrate through API /v1',
      sub: [
        { id: 'api-users', title: 'Register recipients' },
        { id: 'api-prefs', title: 'Notification settings screen' },
        { id: 'api-send', title: 'Send mail' },
        { id: 'api-status', title: 'Track results' },
        { id: 'api-errors', title: 'Errors and retries' },
      ],
      body: (
        <>
          <P>
            Base URL <C>{PUBLIC_API_BASE}</C>, <C>https</C> only. The API key goes straight into the header; there is no token
            exchange. Keep the key on the server, never in a browser or mobile app.
          </P>
          <CodeBlock language="bash" value={S.CHECK_KEY} />
          <DocTable
            head={['Route', 'Purpose']}
            rows={[
              [<Route key="r" method="GET" path="/v1/me" />, 'App status and granted channels'],
              [<Route key="r" method="GET" path="/v1/topics" />, 'Active topics'],
              [<Route key="r" method="PUT" path="/v1/users/:externalId" />, 'Register / update a recipient and email'],
              [<Route key="r" method="DELETE" path="/v1/users/:externalId/email" />, 'Unsubscribe the email (employee left)'],
              [<Route key="r" method="PUT" path="/v1/users/:externalId/preferences" />, 'Save preferences (GET to read)'],
              [<Route key="r" method="POST" path="/v1/notifications" />, 'Send to one person'],
              [<Route key="r" method="POST" path="/v1/publications" />, 'Publish to a topic (≤ 100 people)'],
              [<Route key="r" method="GET" path="/v1/notifications/:id" />, 'Status of one email'],
            ]}
          />

          <Sub id="api-users">Step 1 · Register recipients</Sub>
          <P>EWS knows nobody until the app registers them. Sending to an unknown person returns <C>RECIPIENT_NOT_FOUND</C>.</P>
          <CodeBlock language="http" value={S.PUT_USER} />
          <List
            items={[
              <><C>NV-0123</C> is your app’s own id: letters, digits and <C>. _ - : @ |</C>, up to 255 characters.</>,
              <>New returns <C>201</C>, existing returns <C>200</C>. Call it as often as you like, whenever a profile changes.</>,
              <>An address belongs to one person per app; a clash returns <C>409 EMAIL_TAKEN</C>.</>,
              'First connection: loop over every existing employee. There is no bulk call yet.',
              'Never reuse a departed employee’s id: the new person inherits their preferences and unsubscribed state.',
            ]}
          />

          <Sub id="api-prefs">Step 2 · The “Notification settings” screen</Sub>
          <P>Employees can only opt out through a screen your app builds. EWS is the single store of their choices; do not copy them.</P>
          <CodeBlock language="http" value={S.GET_PREFS} />
          <CodeBlock language="http" value={S.PUT_PREFS} />
          <List
            items={[
              <>Draw switches from <C>effectiveOptIn</C>, not <C>optedIn</C> (<C>null</C> = never touched).</>,
              <><C>mandatory: true</C>: switch on and locked; turning it off returns <C>422 TOPIC_MANDATORY</C>.</>,
              <>Do not hard-code the topic list; render what <C>GET</C> returns.</>,
              <><C>PUT</C> validates everything before saving; send only changed topics. It returns the same shape as <C>GET</C>.</>,
            ]}
          />

          <Sub id="api-send">Step 3 · Send mail</Sub>
          <P>Option 1, inline content:</P>
          <CodeBlock language="http" value={S.SEND_DIRECT} />
          <P>Option 2, a template — editors change the content in the console, the app needs no redeploy:</P>
          <CodeBlock language="http" value={S.SEND_TEMPLATE} />
          <List
            items={[
              <><C>202</C> = accepted, not sent yet. The email goes out later from the queue.</>,
              <><C>idempotencyKey</C>: a repeat call returns <C>200</C> with the original, nothing is sent twice. The key means “this email, for this person”.</>,
              <>EWS always uses the published template version. <C>payload</C> is flat, ≤ 2 KB, values string / number / <C>true</C> / <C>false</C>.</>,
              <><C>templateId</C> differs between environments: keep it in configuration.</>,
              <>A new required variable makes calls without it fail with <C>MISSING_VARIABLE</C> — agree before publishing.</>,
              <>Whole topic: <C>POST /v1/publications</C>, no <C>to</C>, <C>idempotencyKey</C> required, up to 100 people.</>,
            ]}
          />
          <CodeBlock language="node" value={S.NODE_CLIENT} />

          <Sub id="api-status">Step 4 · Track results</Sub>
          <P>
            Poll <C>GET /v1/notifications/:id</C>, or let EWS tell you through an <a href={`#${GUIDE_ANCHOR.webhookOut}`} className="text-[var(--starlight)] hover:underline">outgoing webhook</a>.
          </P>
          <DocTable
            head={['status', 'Meaning', 'What the app does']}
            rows={[
              [<C key="s">scheduled</C>, <>Waiting for the send window / pacing, leaves at <C>scheduledAt</C></>, 'Wait'],
              [<C key="s">queued · sending</C>, 'In the queue / being sent', 'Wait'],
              [<C key="s">sent</C>, 'Accepted by the mail server (not proof of inbox delivery)', 'Done'],
              [<C key="s">no_recipient</C>, <>Recipient blocked, see <C>recipient.exclusionReason</C></>, 'Do not resend — working as intended'],
              [<C key="s">failed</C>, <>Could not send, see <C>recipient.error</C></>, <><C>outcome_unknown</C> = may or may not have gone; resend with a new key</>],
            ]}
          />

          <Sub id="api-errors">Errors and when to retry</Sub>
          <List
            items={[
              <>Errors are <C>application/problem+json</C>. A <C>422</C> has <C>code: VALIDATION</C> outside and the specific code in <C>issues[]</C>. Branch on codes, never on text.</>,
              <><C>4xx</C> (except <C>429</C>): fix the request before calling again.</>,
              <><C>429 APP_HOURLY_LIMIT</C>: wait for <C>Retry-After</C>; <C>5xx</C> / timeouts: retry with backoff. Both keep the same <C>idempotencyKey</C>.</>,
            ]}
          />
          <ErrorCodesTable />
        </>
      ),
    },
    {
      id: GUIDE_ANCHOR.webhookOut,
      title: 'Outgoing webhooks: EWS reports results',
      body: (
        <>
          <P>Instead of polling, the app exposes one endpoint and EWS calls it whenever an email has an outcome.</P>
          <Steps
            items={[
              { title: 'Add a URL', detail: <>App settings → Webhooks → Outgoing → Add URL. Must be <C>https://</C> and reachable from the Internet; private networks are rejected. Up to 10 URLs.</> },
              { title: 'Pick events', detail: 'One URL can receive one or more of the events below.' },
              { title: 'Store the secret', detail: <>The console shows <C>whsec_…</C> once. Lost it? Rotate the secret — the old one stops working at once.</> },
              { title: 'Send test', detail: <>EWS sends <C>ping</C>; every call shows up in the delivery log.</> },
            ]}
          />
          <CodeBlock language="http" value={S.WEBHOOK_REQUEST} />
          <DocTable
            head={['type', 'When', 'Notable data']}
            rows={[
              [<C key="t">notification.sent</C>, 'Accepted by the mail server', '—'],
              [<C key="t">notification.failed</C>, 'Could not send', <C key="d">error</C>],
              [<C key="t">notification.no_recipient</C>, 'Recipient blocked', <C key="d">exclusionReason</C>],
              [<C key="t">notification.opened</C>, 'First open — only when the app turns on open tracking; an estimate', <C key="d">openedAt</C>],
              [<C key="t">ping</C>, 'Send test', 'empty'],
            ]}
          />
          <P>The body never contains email addresses or content. The app must do three things:</P>
          <List
            ordered
            items={[
              'Verify the signature over the raw body (the string received, before parsing). The URL is public; anyone can forge calls.',
              <>Answer <C>2xx</C> within 10 seconds. Anything else, a timeout or a redirect is a failure; EWS retries after 1 min · 5 min · 30 min · 2 h · 6 h, then stops.</>,
              <>Drop duplicates by <C>id</C>. An event can arrive twice; order across emails is not guaranteed.</>,
            ]}
          />
          <CodeBlock language="node" value={S.VERIFY_NODE} />
          <CodeBlock language="python" value={S.VERIFY_PYTHON} />
        </>
      ),
    },
    {
      id: GUIDE_ANCHOR.webhookIn,
      title: 'Incoming webhooks: other systems call EWS',
      sub: [
        { id: 'in-tools', title: 'Monitoring tools' },
        { id: 'in-custom', title: 'Custom JSON mapping' },
      ],
      body: (
        <>
          <P>
            Use this when the sender only knows how to call a webhook: monitoring, automation tools, team scripts. No API key — the URL
            is the key.
          </P>
          <P>
            Each call goes through: extract variables from JSON → publish condition → per-minute limit → dedupe → mail the topic’s
            followers (up to 100).
          </P>
          <Steps
            items={[
              { title: 'Add a webhook', detail: 'App settings → Webhooks → Incoming → Add webhook. Pick a topic (who) and a template (what). Up to 20 per app.' },
              { title: 'Pick the calling tool', detail: 'Other (custom body), Datadog, Grafana, Prometheus Alertmanager, Gatus, Uptime Kuma. Monitoring tools add “Send when”: firing, resolved or both.' },
              { title: 'Copy the URL', detail: 'Available any time (each reveal is audited). If it leaks, rotate it — the old URL stops at once.' },
              { title: 'Paste it into the other system', detail: 'Open the webhook in the console: setup steps for the tool, sample body, sample email, call log.' },
            ]}
          />
          <Sub>Generic shape (JSON)</Sub>
          <P>If the system lets you write the body, send JSON fields named after the template variables (without <C>payload.</C>).</P>
          <CodeBlock language="bash" value={S.INCOMING_CURL} />
          <List
            items={[
              'Values are strings, numbers, true / false; arrays of strings / numbers are joined with commas; empty strings count as missing; extra fields are ignored.',
              <>Dedupe: the <C>Idempotency-Key</C> header if present; otherwise the same body within 10 minutes is sent once.</>,
              'At most 20 sends per minute per webhook, to stop alert storms.',
            ]}
          />
          <DocTable
            head={['HTTP', 'Result']}
            rows={[
              ['202', <C key="b">{'{"status":"published","publicationId":"…","recipientCount":12}'}</C>],
              ['200', <><C>duplicate</C> repeat of an earlier call · <C>skipped</C> publish condition not met</>],
              ['404', <><C>NOT_FOUND</C>: wrong URL, webhook disabled or deleted</>],
              ['422', <><C>MISSING_VARIABLE</C> · <C>INVALID_PAYLOAD_VALUE</C> · <C>INCOMING_BODY_INVALID</C> · <C>PUBLICATION_TOO_LARGE</C></>],
              ['429', <C key="c">INCOMING_HOOK_RATE_LIMITED</C>],
            ]}
          />

          <Sub id="in-tools">Built-in monitoring tools</Sub>
          <DocTable
            head={['Tool', 'Kind', 'Setup']}
            rows={[
              ['Grafana', 'Fixed JSON', <>Webhook contact point, paste the URL. EWS reads <C>alerts[0]</C> and <C>status</C>.</>],
              ['Prometheus Alertmanager', 'Fixed JSON', <><C>webhook_configs</C>, paste the URL. Same shape as Grafana.</>],
              ['Datadog', 'Custom body', <>Integrations → Webhooks, turn on Custom Payload, paste the sample body; mention <C>@webhook-[name]</C> in the monitor.</>],
              ['Gatus', 'Custom body', <><C>alerting.custom</C> with the sample body; enable <C>send-on-resolved</C> to report recoveries.</>],
              ['Uptime Kuma', 'Custom body', <>Webhook notification, Request Body: Custom Body, paste the sample body, header <C>Content-Type: application/json</C>.</>],
            ]}
          />
          <P>
            Create the template from the Incident alert preset (variables <C>incident_title</C>, <C>severity</C>, <C>started_at</C>,{' '}
            <C>detail_url</C>, <C>resolved_at</C>, <C>summary</C>) so EWS can map every variable. Detail links must be <C>https://</C>.
          </P>
          <CodeBlock language="yaml" value={S.GATUS_YAML} />

          <Sub id="in-custom">Custom JSON mapping (API only)</Sub>
          <P>
            For a system that only sends its own fixed JSON and is not listed above, declare where each variable comes from. Call the
            admin API with a <a href={`#${GUIDE_ANCHOR.pat}`} className="text-[var(--starlight)] hover:underline">write PAT</a> of an app manager.
          </P>
          <DocTable
            head={['Field', 'Meaning']}
            rows={[
              [<C key="f">mappings[] · kind: path</C>, <>Read the variable from a path: <C>a.b</C>, <C>a[0]</C>, <C>a[-1]</C> (last item), <C>{'a["k.k"]'}</C>. <C>defaultValue</C> when missing.</>],
              [<C key="f">mappings[] · kind: fixed</C>, 'The variable is always this fixed text.'],
              [<C key="f">condition</C>, <><C>{'{ path, values[] }'}</C>: publish only when the value at <C>path</C> is in <C>values</C>; otherwise <C>200 skipped</C>.</>],
              [<C key="f">dedupePath</C>, 'Path to the other system’s event id; the same id is the same send.'],
            ]}
          />
          <P>Dry-run the configuration on a sample body first — nothing is saved or sent:</P>
          <CodeBlock language="bash" value={S.INCOMING_PREVIEW} />
          <P>
            When it looks right, save it on the real webhook: <C>PATCH /admin/apps/:appId/incoming-webhooks/:hookId</C> with{' '}
            <C>{'{ "config": { "name": …, …as above } }'}</C>. The URL does not change.
          </P>
          <Note tone="warn" title="Editing it in the console later">
            Leave <C>integration</C> empty for a custom-mapped webhook. Editing it in the console while keeping “Other (custom body)” and
            the same template keeps the mapping and condition. Changing the template or picking a monitoring tool replaces the custom
            mapping — call the API again.
          </Note>
        </>
      ),
    },
    {
      id: GUIDE_ANCHOR.pat,
      title: 'Automate with personal access tokens',
      body: (
        <>
          <P>
            A PAT lets scripts and CI call all of <C>/admin/*</C> on your behalf. Unlike an API key, which belongs to an app and only
            calls <C>/v1</C>, a PAT belongs to a person and reaches the admin API.
          </P>
          <Steps
            items={[
              { title: 'Create', detail: <>Account menu → Access tokens. Name, scope and lifetime. The <C>ewspat_…</C> token is shown once.</> },
              { title: 'Call', detail: <><C>Authorization: Bearer ewspat_…</C> to <C>{PUBLIC_API_BASE}/admin/…</C>.</> },
              { title: 'Revoke', detail: 'When no longer needed or possibly leaked. Revocation is immediate and final.' },
            ]}
          />
          <DocTable
            head={['Question', 'Answer']}
            rows={[
              ['What can it do?', 'Exactly what its creator can do in the console, nothing more. Lose a role and the PAT loses it too.'],
              [<><C>read</C> / <C>write</C></>, <><C>read</C> allows only <C>GET</C> / <C>HEAD</C>; writes get <C>403 PAT_SCOPE_INSUFFICIENT</C>. <C>write</C> allows every write its creator may do.</>],
              ['What it cannot do', <>Manage PATs (<C>403 SESSION_REQUIRED</C>) or call <C>/v1</C>. A leaked PAT cannot mint new ones.</>],
              ['Limits', 'Up to 10 PATs per person, 365 days at most (the Super Admin can change both).'],
              ['Traceability', <>The list shows last use and IP; writes through a PAT are audited with source <C>admin_pat</C>.</>],
              ['Narrower access', 'Create the CI token from an account with only the roles it needs, e.g. App Viewer of a single app.'],
            ]}
          />
          <CodeBlock language="bash" value={S.PAT_CURL} />
        </>
      ),
    },
    {
      id: 'limits',
      title: 'Limits and what is not there yet',
      body: (
        <>
          <DocTable
            head={['Limit', 'Default']}
            rows={[
              ['Shared sending rate', '30 mails/minute across all apps — 1,000 calls are accepted in seconds, the last mail may leave over half an hour later.'],
              ['Topic publish', '≤ 100 people per call'],
              ['Size', <>Each body part ≤ 256 KB · request ≤ 512 KB · <C>payload</C> ≤ 2 KB</>],
              ['API keys / outgoing URLs / incoming webhooks', '20 / 10 / 20 per app'],
            ]}
          />
          <List
            items={[
              'Not yet: channels other than email, segment sends, scheduling / cancelling / resending accepted mail.',
              <>No bounce handling yet: apps must unsubscribe departed employees (<C>DELETE /v1/users/:externalId/email</C>).</>,
              'No “Manage notifications” link in emails — the app’s settings screen is the only way.',
              <>No “delivered to inbox” or “publication finished” webhook: count by <C>publicationId</C> or call <C>GET /v1/publications/:id</C>.</>,
              'Not suited to messages that must reach many people within seconds.',
            ]}
          />
        </>
      ),
    },
    {
      id: 'checklist',
      title: 'Go-live checklist',
      body: (
        <List
          items={[
            <>One named API key per environment; <C>templateId</C> in per-environment configuration.</>,
            <>All employees registered, and <C>PUT /v1/users</C> called whenever a profile changes.</>,
            'The “Notification settings” screen is live before the first send.',
            <>Every send has a stable <C>idempotencyKey</C>; retries keep it.</>,
            <>Errors handled by <C>code</C>, not by the <C>detail</C> text.</>,
            'The offboarding process unsubscribes the email.',
            <>The webhook endpoint verifies signatures, answers <C>2xx</C> within 10 s and dedupes by <C>id</C>.</>,
            'A full round trip tested with your own email — test mail is real mail.',
          ]}
        />
      ),
    },
  ],
}
