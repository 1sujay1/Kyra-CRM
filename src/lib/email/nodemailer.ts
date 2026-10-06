import nodemailer from 'nodemailer';

function escapeHtml(str?: string | null) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface LeadNotificationParams {
  lead_id?: string;
  full_name: string;
  phone: string;
  email?: string;
  project_name: string;
  source: string;
  campaign_name?: string;
  budget_range?: string;
  purpose?: string;
  message?: string;
  visit_date?: string | null;
  page_url?: string;
}

export async function sendLeadEmailNotification(params: LeadNotificationParams) {
  const mailEmail = process.env.NODE_MAILER_EMAIL || 'sujaygowdag333@gmail.com';
  const mailPass = process.env.NODE_MAILER_PASSWORD || 'keou mqnl ykyl rydk';
  const receiverEmail = process.env.NODE_MAILER_RECEIVER_EMAIL || 'sujaymaster111@gmail.com';

  let ccEmails: string[] = ['sujaymastern@gmail.com', 'visupriya.udt@gmail.com'];
  if (process.env.NODE_MAILER_CC_EMAILS) {
    try {
      const parsed = JSON.parse(process.env.NODE_MAILER_CC_EMAILS);
      if (Array.isArray(parsed)) {
        ccEmails = parsed;
      }
    } catch {
      // Fallback CC
    }
  }

  const sourceTitle =
    params.source.toLowerCase().includes('meta') || params.source.toLowerCase().includes('facebook')
      ? 'Meta Lead Ads Enquiry'
      : 'Website Contact Form Submission';

  const subject = `[New Lead Alert] ${params.full_name} - ${params.project_name} (${sourceTitle})`;

  console.log('📧 [Nodemailer Attempt] Initiating email notification:', {
    from: mailEmail,
    to: receiverEmail,
    cc: ccEmails,
    subject: subject,
    buyer: params.full_name,
    phone: params.phone,
  });

  const mailUser = mailEmail.trim();
  const mailPassword = mailPass.trim().replace(/\s+/g, '');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: mailUser,
      pass: mailPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f2b1a; padding: 20px 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px; color: #f59e0b;">Kyra Group India</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #d1fae5;">New Lead Enquiry Notification</p>
      </div>

      <div style="padding: 24px; color: #1e293b;">
        <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 6px; margin-bottom: 16px;">
          Source: ${escapeHtml(params.source)}
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: bold; width: 35%;">Buyer Name:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${escapeHtml(params.full_name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Mobile Phone:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: bold; font-family: monospace;">+91 ${escapeHtml(params.phone)}</td>
          </tr>
          ${
            params.email
              ? `<tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Email Address:</td>
                  <td style="padding: 8px 0; color: #2563eb;"><a href="mailto:${escapeHtml(params.email)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(params.email)}</a></td>
                </tr>`
              : ''
          }
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Project Name:</td>
            <td style="padding: 8px 0; color: #047857; font-weight: bold;">${escapeHtml(params.project_name)}</td>
          </tr>
          ${
            params.campaign_name
              ? `<tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Campaign:</td>
                  <td style="padding: 8px 0; color: #334155;">${escapeHtml(params.campaign_name)}</td>
                </tr>`
              : ''
          }
          ${
            params.budget_range
              ? `<tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Budget Bracket:</td>
                  <td style="padding: 8px 0; color: #334155;">${escapeHtml(params.budget_range)}</td>
                </tr>`
              : ''
          }
          ${
            params.visit_date
              ? `<tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Requested Visit Date:</td>
                  <td style="padding: 8px 0; color: #d97706; font-weight: bold;">${escapeHtml(params.visit_date)}</td>
                </tr>`
              : ''
          }
          ${
            params.message
              ? `<tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold; vertical-align: top;">Message / Notes:</td>
                  <td style="padding: 8px 0; color: #334155; background-color: #f8fafc; padding: 8px; border-radius: 6px;">${escapeHtml(params.message)}</td>
                </tr>`
              : ''
          }
          ${
            params.page_url
              ? `<tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Page URL:</td>
                  <td style="padding: 8px 0; color: #64748b; font-size: 12px; word-break: break-all;">${escapeHtml(params.page_url)}</td>
                </tr>`
              : ''
          }
        </table>
      </div>

      <div style="background-color: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        This email notification was automatically generated by Kyra Group CRM Portal.
      </div>
    </div>
  `;

  const mailOptions = {
    from: `Kyra Group Lead Alert <${mailEmail}>`,
    to: receiverEmail,
    cc: ccEmails,
    subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ [Nodemailer SUCCESS] Email notification dispatched successfully:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      to: receiverEmail,
      cc: ccEmails,
    });
    return { success: true, messageId: info.messageId, accepted: info.accepted };
  } catch (err: any) {
    console.error('❌ [Nodemailer FAILURE] Email notification error:', {
      errorMessage: err?.message || err,
      code: err?.code,
      command: err?.command,
      to: receiverEmail,
      cc: ccEmails,
    });
    return { success: false, error: err?.message || 'Failed to send email notification' };
  }
}
