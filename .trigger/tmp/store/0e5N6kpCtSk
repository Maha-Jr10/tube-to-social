import {
  task
} from "./chunk-O2EOSSNY.mjs";
import "./chunk-QKPJMX6P.mjs";
import {
  __name,
  init_esm
} from "./chunk-GADV3JWJ.mjs";

// src/trigger/content-os/publisher/post-newsletter.ts
init_esm();
function buildHtml(newsletter, brand) {
  const sectionHtml = newsletter.sections.map(
    (s) => `
      <tr><td style="padding:0 0 32px 0;">
        <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">${s.heading}</h2>
        <p style="margin:0;font-size:16px;line-height:1.7;color:#374151;">${s.body.replace(/\n/g, "<br>")}</p>
      </td></tr>
      <tr><td style="padding:0 0 32px 0;border-bottom:1px solid #e5e7eb;"></td></tr>`
  ).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${newsletter.subject}</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:${brand.primaryColor};padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${brand.name}</p>
          <p style="margin:8px 0 0 0;font-size:13px;color:rgba(255,255,255,0.75);font-style:italic;">${newsletter.previewText}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 40px 8px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${sectionHtml}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px 40px 40px;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">
            You're receiving this because you subscribed to <strong>${brand.name}</strong>.
          </p>
          <p style="margin:0;font-size:13px;color:#9ca3af;">
            <a href="{{unsubscribe_url}}" style="color:${brand.accentColor};text-decoration:none;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
__name(buildHtml, "buildHtml");
var postNewsletter = task({
  id: "post-newsletter",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5e3, maxTimeoutInMs: 3e4 },
  run: /* @__PURE__ */ __name(async (payload) => {
    const apiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    if (!audienceId) throw new Error("RESEND_AUDIENCE_ID is not set");
    if (!fromEmail) throw new Error("RESEND_FROM_EMAIL is not set");
    const { newsletter, brand } = payload;
    const html = buildHtml(newsletter, brand);
    const broadcastName = `${brand.name} — ${newsletter.subject.slice(0, 50)}`;
    const createRes = await fetch("https://api.resend.com/broadcasts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        audience_id: audienceId,
        from: fromEmail,
        subject: newsletter.subject,
        html,
        name: broadcastName
      })
    });
    if (!createRes.ok) {
      const error = await createRes.text();
      throw new Error(`Resend create broadcast error ${createRes.status}: ${error}`);
    }
    const { id } = await createRes.json();
    console.log(`Newsletter broadcast created: ${id}`);
    const sendRes = await fetch(`https://api.resend.com/broadcasts/${id}/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    if (!sendRes.ok) {
      const error = await sendRes.text();
      throw new Error(`Resend send broadcast error ${sendRes.status}: ${error}`);
    }
    console.log(`Newsletter broadcast sent: ${id} — "${newsletter.subject}"`);
    return { broadcastId: id, subject: newsletter.subject, platform: "resend" };
  }, "run")
});
export {
  postNewsletter
};
//# sourceMappingURL=post-newsletter.mjs.map
