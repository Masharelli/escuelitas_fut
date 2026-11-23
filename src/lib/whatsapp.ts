/**
 * Links wa.me (sin API de pago): abren WhatsApp con el mensaje prellenado al
 * teléfono del tutor. El envío lo hace la persona con un tap.
 */

/** Normaliza un teléfono mexicano a formato internacional para wa.me. */
export function waPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`; // nacional → +52
  if (digits.length >= 11 && digits.length <= 15) return digits; // ya trae lada
  return null;
}

/** URL de wa.me con mensaje prellenado; null si el teléfono no es usable. */
export function waLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null;
  const p = waPhone(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

/** Mensaje de convocatoria a partido con link de confirmación de un tap. */
export function callupMessage(m: {
  teamName: string;
  opponentName: string;
  isHome: boolean;
  kickoffLabel: string;
  location: string | null;
  uniform: string | null;
  studentName: string;
  confirmUrl: string;
}): string {
  const vs = m.isHome
    ? `${m.teamName} vs ${m.opponentName}`
    : `${m.opponentName} vs ${m.teamName}`;
  return (
    `⚽ Convocatoria: ${vs}\n📅 ${m.kickoffLabel}` +
    (m.location ? `\n📍 ${m.location}` : "") +
    (m.uniform ? `\n👕 Uniforme: ${m.uniform}` : "") +
    `\n\nConfirma la asistencia de ${m.studentName} con un tap aquí:\n${m.confirmUrl}`
  );
}
