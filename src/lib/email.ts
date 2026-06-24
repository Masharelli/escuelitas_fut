/**
 * Envío de correo BEST-EFFORT y local-first. Usa Resend si están configurados
 * `RESEND_API_KEY` y `EMAIL_FROM`; de lo contrario NO hace nada (solo registra
 * en consola) para que todo funcione local sin cuenta de correo.
 *
 * Regla de oro: nunca lanza. El correo es un canal extra; un fallo aquí jamás
 * debe tumbar un cobro, un registro ni la generación de cuotas. El aviso in-app
 * (tabla `notifications`) es la fuente de verdad.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** ¿Hay credenciales para enviar correo de verdad? */
export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

/** Base pública de la app, para armar enlaces absolutos en los correos. */
function appBaseUrl(): string {
  const base =
    process.env.APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  return base.replace(/\/$/, "");
}

/** Convierte una ruta relativa ("/padres/pagos") en URL absoluta para correo. */
function absoluteLink(link?: string | null): string | undefined {
  if (!link) return undefined;
  if (/^https?:\/\//.test(link)) return link;
  return `${appBaseUrl()}${link.startsWith("/") ? "" : "/"}${link}`;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.log(`[email:omitido] → ${opts.to}: ${opts.subject}`);
    return false;
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      console.error("[email:error]", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email:error]", err);
    return false;
  }
}

/** Plantilla mínima con el branding "Día de partido". */
export function renderEmail(
  title: string,
  body: string,
  link?: string | null
): string {
  const href = absoluteLink(link);
  const button = href
    ? `<a href="${href}" style="display:inline-block;margin-top:18px;background:#0E6E37;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:9999px;font-weight:600;font-size:14px;">Ver en el portal</a>`
    : "";
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:28px 24px;color:#15201A;">
  <h1 style="font-size:18px;line-height:1.3;margin:0 0 12px;">${title}</h1>
  <p style="font-size:15px;line-height:1.55;margin:0;color:#3d4a43;">${body}</p>
  ${button}
  <hr style="border:none;border-top:1px solid #e6e9e7;margin:26px 0 12px;" />
  <p style="font-size:12px;color:#9aa3a0;margin:0;">Escuelitas Fut · Aviso automático, no respondas a este correo.</p>
</div>`;
}
