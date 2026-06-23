import { desc } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { charges as chargesTable } from "@/db/schema";
import {
  KIND_LABELS,
  CHARGE_STATUS_LABELS,
  periodLabel,
  type ChargeKind,
} from "@/lib/billing";

function effectiveMonth(c: { periodMonth: string | null; createdAt: Date }) {
  if (c.periodMonth) return c.periodMonth;
  const d = c.createdAt;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Escapa un valor para CSV (comillas dobles + envoltura). */
function cell(value: string | number): string {
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function isoDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export async function GET(req: Request) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const url = new URL(req.url);
  const mes = url.searchParams.get("mes") ?? "";
  const estado = url.searchParams.get("estado") ?? "";

  const rows = await tdb.charges.findMany({
    with: { student: true },
    orderBy: [desc(chargesTable.createdAt)],
  });

  const filtered = rows.filter((c) => {
    if (estado && c.status !== estado) return false;
    if (mes && effectiveMonth(c) !== mes) return false;
    return true;
  });

  const header = [
    "Alumno",
    "Concepto",
    "Tipo",
    "Monto",
    "Estado",
    "Periodo",
    "Pagado el",
    "Creado",
  ];

  const lines = [header.map(cell).join(",")];
  for (const c of filtered) {
    lines.push(
      [
        cell(`${c.student.firstName} ${c.student.lastName}`),
        cell(c.description),
        cell(KIND_LABELS[c.kind as ChargeKind] ?? c.kind),
        cell((c.amountCents / 100).toFixed(2)),
        cell(CHARGE_STATUS_LABELS[c.status] ?? c.status),
        cell(c.periodMonth ? periodLabel(c.periodMonth) : ""),
        cell(isoDate(c.paidAt)),
        cell(isoDate(c.createdAt)),
      ].join(",")
    );
  }

  // BOM para que Excel respete los acentos.
  const csv = "﻿" + lines.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cargos.csv"',
    },
  });
}
