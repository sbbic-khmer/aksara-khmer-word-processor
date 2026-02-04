import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

// Email configuration from environment
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.purelymail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASSWORD = process.env.SMTP_PASSWORD
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'Aksara Pro'

// Singleton transporter instance
let transporter: Transporter | null = null

/**
 * Get or create the nodemailer transporter
 */
function getTransporter(): Transporter {
  if (!transporter) {
    if (!SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM_EMAIL) {
      throw new Error('Email configuration incomplete. Set SMTP_USER, SMTP_PASSWORD, and SMTP_FROM_EMAIL environment variables.')
    }

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    })
  }
  return transporter
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  headers?: Record<string, string>
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email using the configured SMTP server
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const transport = getTransporter()

    // Generate plain text from HTML if not provided
    const text = options.text || htmlToPlainText(options.html)

    const result = await transport.sendMail({
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: text,
      replyTo: options.replyTo,
      headers: options.headers,
    })

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error) {
    console.error('Failed to send email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send a verification email to a new user
 */
export async function sendVerificationEmail(
  to: string,
  verificationUrl: string,
  userName?: string
): Promise<SendEmailResult> {
  const html = generateVerificationEmailHtml(verificationUrl, userName)

  return sendEmail({
    to,
    subject: 'Verify your email for Aksara Pro',
    html,
    headers: {
      'X-Email-Type': 'verification',
    },
  })
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<SendEmailResult> {
  const html = generatePasswordResetEmailHtml(resetUrl)

  return sendEmail({
    to,
    subject: 'Reset your Aksara Pro password',
    html,
    headers: {
      'X-Email-Type': 'password-reset',
    },
  })
}

/**
 * Convert HTML to plain text (basic implementation)
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generate verification email HTML
 */
function generateVerificationEmailHtml(verificationUrl: string, userName?: string): string {
  const greeting = userName ? `Hi ${userName},` : 'Hi,'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table role="presentation" style="border-collapse: collapse;">
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6, #4f46e5); border-radius: 12px; padding: 12px 16px;">
                    <span style="color: white; font-size: 24px; font-weight: bold;">អ</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 24px; font-weight: bold; color: #0f172a;">Aksara Pro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: bold; color: #0f172a;">Welcome to Aksara Pro!</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">${greeting}</p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                Thank you for signing up. Please verify your email address to get started with the best Khmer word processor.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 32px 0; border-collapse: collapse;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #3b82f6, #4f46e5); border-radius: 12px;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 16px 32px; color: white; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #3b82f6; word-break: break-all;">
                ${verificationUrl}
              </p>

              <p style="margin: 0; font-size: 14px; color: #94a3b8;">
                This link expires in 48 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 20px;">
              <p style="margin: 0; font-size: 14px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} Aksara Pro. The intelligent Khmer word processor.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Generate password reset email HTML
 */
function generatePasswordResetEmailHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table role="presentation" style="border-collapse: collapse;">
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6, #4f46e5); border-radius: 12px; padding: 12px 16px;">
                    <span style="color: white; font-size: 24px; font-weight: bold;">អ</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 24px; font-weight: bold; color: #0f172a;">Aksara Pro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: bold; color: #0f172a;">Reset Your Password</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                We received a request to reset your password. Click the button below to choose a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 32px 0; border-collapse: collapse;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #3b82f6, #4f46e5); border-radius: 12px;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; color: white; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #3b82f6; word-break: break-all;">
                ${resetUrl}
              </p>

              <!-- Security Notice -->
              <table role="presentation" style="margin: 24px 0 0 0; border-collapse: collapse; background-color: #fef3c7; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e;">
                      <strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 20px;">
              <p style="margin: 0; font-size: 14px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} Aksara Pro. The intelligent Khmer word processor.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Send a campaign email to a user
 */
export async function sendCampaignEmail(
  to: string,
  subject: string,
  htmlContent: string,
  senderName?: string,
  additionalHeaders?: Record<string, string>
): Promise<SendEmailResult> {
  const html = wrapCampaignHtml(htmlContent)

  return sendEmail({
    to,
    subject,
    html,
    headers: {
      'X-Email-Type': 'campaign',
      ...additionalHeaders,
    },
  })
}

/**
 * Wrap campaign content in email-safe HTML template
 */
function wrapCampaignHtml(content: string): string {
  return `
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Khmer OS Battambang', 'Khmer OS', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table role="presentation" style="border-collapse: collapse;">
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6, #4f46e5); border-radius: 12px; padding: 12px 16px;">
                    <span style="color: white; font-size: 24px; font-weight: bold;">អ</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 24px; font-weight: bold; color: #0f172a;">Aksara Pro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 20px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} Aksara Pro. The intelligent Khmer word processor.
              </p>
              <p style="margin: 0; font-size: 12px; color: #cbd5e1;">
                You received this email because you have an account with Aksara Pro.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Check if email service is properly configured
 */
export function isEmailConfigured(): boolean {
  return !!(SMTP_USER && SMTP_PASSWORD && SMTP_FROM_EMAIL)
}

/**
 * Verify SMTP connection (for health checks)
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transport = getTransporter()
    await transport.verify()
    return true
  } catch (error) {
    console.error('Email connection verification failed:', error)
    return false
  }
}
