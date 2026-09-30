import { NextRequest, NextResponse } from 'next/server'

// Fallback HTML responsive layout chuẩn cho email khi chưa có AI_API_KEY
const FALLBACK_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông báo từ EWS AstroLink</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0a0b1a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #22d3ee; font-size: 20px; letter-spacing: 0.5px; font-weight: 700; }
    .content { padding: 32px 28px; color: #334155; line-height: 1.6; }
    .content h2 { margin-top: 0; color: #0f172a; font-size: 18px; }
    .highlight-card { background: #f8fafc; border-left: 4px solid #22d3ee; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .btn-wrapper { text-align: center; margin: 32px 0 20px; }
    .btn { display: inline-block; background-color: #22d3ee; color: #05060f; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EWS ASTROLINK NOTIFICATION</h1>
    </div>
    <div class="content">
      <h2>Xin chào,</h2>
      <p>Hệ thống vừa ghi nhận một thông báo mới liên quan đến tài khoản hoặc dịch vụ của bạn.</p>
      
      <div class="highlight-card">
        <p style="margin: 0; font-size: 14px; color: #475569;">
          <strong>Trạng thái:</strong> Cần xử lý sớm<br>
          <strong>Hệ thống:</strong> EWS Notification Service
        </p>
      </div>

      <p>Vui lòng bấm vào nút bên dưới để truy cập bảng điều khiển và kiểm tra chi tiết thông tin:</p>
      
      <div class="btn-wrapper">
        <a href="https://ews.eonsr.com" class="btn">Kiểm tra ngay</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email hoặc liên hệ với quản trị viên hệ thống.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">© 2026 EWS AstroLink Notification Service. Mọi quyền được bảo lưu.</p>
    </div>
  </div>
</body>
</html>`

export async function GET() {
  const hasKey = Boolean(process.env.AI_API_KEY?.trim())
  const apiUrl = process.env.AI_API_URL?.trim() || 'https://api.openai.com/v1/chat/completions'
  const model = process.env.AI_MODEL?.trim() || 'gpt-4o-mini'
  return NextResponse.json({
    configured: hasKey,
    apiUrl,
    model,
  })
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    const body = await req.json().catch(() => ({}))
    const userPrompt =
      body.prompt ||
      'Hãy tạo layout HTML email thông báo responsive chuẩn, hiện đại, có tiêu đề, nội dung chính, thẻ thông tin nổi bật, nút bấm hành động (CTA), và footer bản quyền.'

    // Biến đang khai trong template — AI chỉ được dùng đúng các tên này (không bịa tên mới).
    const variables: string[] = Array.isArray(body.variables)
      ? body.variables.filter((v: unknown): v is string => typeof v === 'string').slice(0, 100)
      : []

    const apiKey = process.env.AI_API_KEY?.trim()
    const apiUrl = process.env.AI_API_URL?.trim() || 'https://api.openai.com/v1/chat/completions'
    const model = process.env.AI_MODEL?.trim() || 'gpt-4o-mini'

    if (!apiKey) {
      // Giả lập độ trễ mạng nhẹ 600ms để quan sát trạng thái loading trực quan
      await new Promise((r) => setTimeout(r, 600))
      return NextResponse.json({
        success: true,
        isMock: true,
        html: FALLBACK_HTML,
        latencyMs: Date.now() - startTime,
        model: 'mock-template (chưa có AI_API_KEY)',
        message: 'Chưa cấu hình AI_API_KEY trong file .env. Đang trả về layout mẫu chuẩn.',
      })
    }

    // Gọi API thật (hỗ trợ OpenAI, DeepSeek, Groq, OpenRouter, hoặc OpenAI-compatible API)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ews.eonsr.com',
        'X-Title': 'EWS AstroLink',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert responsive HTML email designer. Return ONLY the raw HTML code for the email template. Do NOT include markdown fences (like ```html or ```). Use valid inline styles or embedded CSS in <style> block compatible with email clients. The design must be clean, responsive, and aesthetically pleasing.\n' +
              // Luật của backend EWS lúc xuất bản (ADR-0020) — vi phạm là bản nháp không xuất bản được.
              'Template rules: placeholders MUST use the exact syntax {{ payload.<name> }} (never {{ name }}). ' +
              (variables.length
                ? `Only use these placeholders: ${variables.map((v) => `{{ ${v} }}`).join(', ')}. `
                : 'Do not add placeholders unless necessary. ') +
              'Links must start with https:// or mailto: only. Do NOT write any unsubscribe link, the word "unsubscribe", or a {{ footer }} placeholder: the system appends the footer itself.',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json(
        {
          success: false,
          error: `API trả về mã lỗi ${response.status}: ${errText.slice(0, 300)}`,
          latencyMs: Date.now() - startTime,
        },
        { status: 502 },
      )
    }

    const data = await response.json()
    let generatedHtml = data.choices?.[0]?.message?.content ?? ''

    // Loại bỏ markdown code block nếu model trả về ```html ... ```
    generatedHtml = generatedHtml
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    if (!generatedHtml) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI không trả về nội dung HTML hợp lệ',
          latencyMs: Date.now() - startTime,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      isMock: false,
      html: generatedHtml,
      latencyMs: Date.now() - startTime,
      model,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định khi kết nối AI API'
    return NextResponse.json(
      {
        success: false,
        error: message,
        latencyMs: Date.now() - startTime,
      },
      { status: 500 },
    )
  }
}
