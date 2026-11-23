/** Los enlaces de acceso se pueden usar una sola vez durante siete días. */
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isPendingInvitation(inv: { status: string; createdAt: Date }, now = Date.now()) {
  return inv.status === "pending" && inv.createdAt.getTime() > now - INVITATION_TTL_MS;
}
