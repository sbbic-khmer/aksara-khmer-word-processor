"use client"

import { useMemo } from "react"

interface EmailPreviewProps {
  htmlContent: string
  subject: string
}

// Email-safe font stack
const FONT_FAMILY = "'Khmer OS Battambang', 'Khmer OS', Arial, sans-serif"

export function EmailPreview({ htmlContent, subject }: EmailPreviewProps) {
  const previewHtml = useMemo(() => {
    // Wrap content in email-safe container
    return `
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
      font-family: ${FONT_FAMILY};
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
      color: white;
      padding: 24px;
      border-radius: 8px 8px 0 0;
    }
    .email-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .email-body {
      padding: 32px;
      color: #333333;
      line-height: 1.6;
      font-size: 16px;
    }
    .email-body h1 {
      font-size: 24px;
      margin: 0 0 16px 0;
      color: #1a1a1a;
    }
    .email-body h2 {
      font-size: 20px;
      margin: 0 0 12px 0;
      color: #1a1a1a;
    }
    .email-body h3 {
      font-size: 18px;
      margin: 0 0 10px 0;
      color: #1a1a1a;
    }
    .email-body p {
      margin: 0 0 16px 0;
    }
    .email-body a {
      color: #2563eb;
    }
    .email-body ul, .email-body ol {
      margin: 0 0 16px 0;
      padding-left: 24px;
    }
    .email-body li {
      margin: 0 0 8px 0;
    }
    .email-body img {
      max-width: 100%;
      height: auto;
    }
    .email-footer {
      background-color: #f8fafc;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-radius: 0 0 8px 8px;
    }
  </style>
</head>
<body>
  <div style="padding: 20px;">
    <div class="email-container">
      <div class="email-header">
        <h1>${escapeHtml(subject) || 'Email Subject'}</h1>
      </div>
      <div class="email-body">
        ${htmlContent || '<p style="color: #999;">Your email content will appear here...</p>'}
      </div>
      <div class="email-footer">
        <p>Aksara Pro - Smart Khmer Writing</p>
      </div>
    </div>
  </div>
</body>
</html>
`
  }, [htmlContent, subject])

  return (
    <div className="border rounded-lg overflow-hidden bg-gray-100">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-medium">Email Preview</span>
        <span className="text-xs text-muted-foreground">600px max width</span>
      </div>
      <div className="p-4">
        <iframe
          srcDoc={previewHtml}
          className="w-full bg-white rounded"
          style={{ minHeight: "500px", border: "none" }}
          title="Email Preview"
        />
      </div>
    </div>
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
