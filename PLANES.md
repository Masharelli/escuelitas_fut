# Planes para dueños de escuela — análisis y funciones

Propuesta de qué función vive en cada plan. Lo ya implementado se marca con ✅;
el gating actual en código está en `src/lib/plan.ts` (`FEATURE_MIN_PLAN`).

## Criterio

- **Básico** = operar la escuela día a día (deportivo + cobranza manual). Debe ser
  suficiente para que una escuela chica viva en la plataforma y la recomiende.
- **Profesional** = cobrar en línea y profesionalizar lo deportivo (estadística,
  torneos, reportes). Es el plan al que queremos subir a la mayoría.
- **Premium** = visión de negocio (gastos, utilidad, marca propia). Para dueños
  con 2+ categorías grandes o varias sedes.

## Básico

| Función | Estado |
|---|---|
| Alumnos con expediente completo (ficha, foto, fecha de inscripción/reinscripción) | ✅ |
| Equipos, categorías y entrenadores (invitación + asignación de equipos) | ✅ |
| Portal del entrenador con **semáforo de pagos** (verde/amarillo/rojo) | ✅ |
| Asistencias (pase de lista) y calendario mensual | ✅ |
| Avisos y notificaciones (in-app + correo) | ✅ |
| Partidos: horario, ubicación con mapa, uniforme | ✅ |
| Convocatorias con confirmación de papás (portal y **link de WhatsApp de un tap**) | ✅ |
| Cobranza manual: planes de cobro, cuotas del mes, marcar pagado | ✅ |
| **Recordatorio de pago por WhatsApp** (mensaje prellenado al tutor) | ✅ |
| Becas y promociones (descuento % o fijo, asignable a varios alumnos) | ✅ |

## Profesional (todo lo del Básico, más…)

| Función | Estado |
|---|---|
| Cobros en línea con tarjeta (Stripe Connect) y autopago | ✅ |
| Estadísticas deportivas por alumno y por equipo | ✅ (gate `stats`) |
| Papá estadístico: partido en vivo (inicio, medio tiempo, final) con avisos a papás | ✅ |
| Resultado y estadísticas se reflejan solos en el torneo al finalizar | ✅ |
| Torneos con tabla de posiciones + foto de resultados oficiales de la liga | ✅ |
| Reportes financieros y exportación CSV | ✅ (gate `reports`) |

## Premium (todo lo del Profesional, más…)

| Función | Estado |
|---|---|
| Gastos / contabilidad operativa | ✅ (gate `expenses`) |
| Dashboard ejecutivo: utilidad, margen, punto de equilibrio, por categoría | ✅ (gate `exec_dashboard`) |
| Logo y colores propios en el portal público | ✅ (gate `branding`) |

## Pendientes de decidir (no implementado)

- **Precio por plan.** Referencia de costo: infraestructura AWS ≈ $70–90 USD/mes
  con ~10 escuelas (ver memoria del proyecto). Con Básico ~$499 MXN/mes,
  Pro ~$899, Premium ~$1,499, el punto de equilibrio se alcanza con 2–3 escuelas.
- **App para jugadores** — descartada por ahora (reunión 22/jul/2026).
- **WhatsApp API oficial** (botones nativos en el chat): solo si el link mágico
  se queda corto; implica número dedicado, verificación Meta y costo por
  conversación.
- ¿Becas/promos y semáforo deben subirse a Pro como palanca de venta? Hoy se
  proponen en Básico para maximizar adopción.
