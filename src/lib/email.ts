import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "JobTracker <onboarding@resend.dev>";

export interface DueReminder {
    id: string;
    message: string;
    remindAt: Date;
    application: {
        id: string;
        company: string;
        role: string;
    };
}

/**
 * Sends a single bundled email containing all of a user's due reminders.
 * Returns the Resend message ID on success, or throws on failure.
 */
export async function sendReminderDigest(
    toEmail: string,
    userName: string | null,
    reminders: DueReminder[]
): Promise<string> {
    if (reminders.length === 0) {
        throw new Error("Cannot send digest with zero reminders");
    }

    const greeting = userName ? `Hi ${userName.split(" ")[0]},` : "Hi,";
    const count = reminders.length;
    const subject =
        count === 1
            ? `Reminder: ${reminders[0].application.company}`
            : `${count} reminders due today`;

    const itemsHtml = reminders
        .map(
            (r) => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937;">
            <div style="font-size: 14px; color: #ffffff; font-weight: 500;">
              ${escapeHtml(r.application.company)} — ${escapeHtml(r.application.role)}
            </div>
            <div style="font-size: 13px; color: #9ca3af; margin-top: 4px;">
              ${escapeHtml(r.message)}
            </div>
          </td>
        </tr>
      `
        )
        .join("");

    const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; background: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #030712; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px; border-bottom: 1px solid #1f2937;">
                    <div style="font-size: 18px; color: #ffffff; font-weight: 600;">JobTracker</div>
                    <div style="font-size: 13px; color: #9ca3af; margin-top: 4px;">${greeting} you have ${count} reminder${count === 1 ? "" : "s"} due today.</div>
                  </td>
                </tr>
                ${itemsHtml}
                <tr>
                  <td style="padding: 16px 24px; background: #0b1220; font-size: 12px; color: #6b7280;">
                    Open the dashboard to mark these as done or update your applications.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

    const text = `${greeting}\n\nYou have ${count} reminder${count === 1 ? "" : "s"} due today:\n\n${reminders
        .map((r) => `- ${r.application.company} (${r.application.role}): ${r.message}`)
        .join("\n")}\n\nOpen JobTracker to mark them as done.`;

    const { data, error } = await resend.emails.send({
        from: FROM,
        to: toEmail,
        subject,
        html,
        text,
    });

    if (error) {
        throw new Error(`Resend error: ${JSON.stringify(error)}`);
    }
    if (!data?.id) {
        throw new Error("Resend returned no message ID");
    }
    return data.id;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}