import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import ts from "typescript";

// Ejecuta las funciones reales con Postgres local, dentro de un rollback.
config({ path: [".env.local", ".env"], quiet: true });
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL).hostname)) {
  throw new Error("Esta comprobación solo permite una base de datos local");
}
const root = resolve("src");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith("/src/proxy.ts") && specifier === "next-auth") return { url: "security:proxy-auth", shortCircuit: true };
    if (context.parentURL?.endsWith("/src/proxy.ts") && specifier === "./auth.config") return { url: "security:proxy-config", shortCircuit: true };
    if (specifier === "@/db") return { url: "security:db", shortCircuit: true };
    if (specifier === "@/auth") return { url: "security:auth", shortCircuit: true };
    if (specifier === "next/headers") return { url: "security:headers", shortCircuit: true };
    if (specifier === "next/cache") return { url: "security:cache", shortCircuit: true };
    if (specifier.startsWith("@/") || (specifier.startsWith(".") && context.parentURL?.startsWith(pathToFileURL(root).href))) {
      const path = specifier.startsWith("@/") ? resolve(root, specifier.slice(2)) : fileURLToPath(new URL(specifier, context.parentURL));
      const file = [`${path}.ts`, `${path}/index.ts`].find(existsSync);
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
    if (specifier.startsWith("next/") && !specifier.endsWith(".js")) return nextResolve(`${specifier}.js`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "security:proxy-auth") return { format: "module", source: "export default () => ({ auth: (...args) => globalThis.securityProxyAuth(...args) });", shortCircuit: true };
    if (url === "security:proxy-config") return { format: "module", source: "export const authConfig = {};", shortCircuit: true };
    if (url === "security:db") return { format: "module", source: "export const db = globalThis.securityDb;", shortCircuit: true };
    if (url === "security:auth") return { format: "module", source: "export const auth = async () => globalThis.securitySession;", shortCircuit: true };
    if (url === "security:headers") return { format: "module", source: "export const cookies = async () => ({ get: () => ({value: globalThis.securitySchool}) }); export const headers = async () => new Headers({host: 'localhost:3000'});", shortCircuit: true };
    if (url === "security:cache") return { format: "module", source: "export const revalidatePath = () => {};", shortCircuit: true };
    if (url.startsWith(pathToFileURL(root).href) && url.endsWith(".ts")) {
      const loaded = nextLoad(url, context);
      return { format: "module", source: ts.transpileModule(loaded.source.toString(), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
// Las respuestas que terminan después del logout no pueden reemitir la sesión.
const { default: proxy } = await import(pathToFileURL(resolve("src/proxy.ts")).href);
for (const status of [200, 307]) {
  globalThis.securityProxyAuth = async () => new Response(null, { status, headers: { "set-cookie": "qa-session=rotated; Path=/; HttpOnly", location: "https://example.invalid/login" } });
  const response = await proxy({}, {});
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.status, status);
  assert.equal(response.headers.get("location"), "https://example.invalid/login");
}
globalThis.securityProxyAuth = async () => undefined;
assert.equal(await proxy({}, {}), undefined);
delete globalThis.securityProxyAuth;
const schema = await import("@/db/schema");
const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 5 });
const database = drizzle(client, { schema });
const rollback = new Error("Comprobación terminada: revertir todos los datos de prueba");
try {
  await database.transaction(async (tx) => {
    if (!(await tx.execute("select to_regclass('public.activity_log') as existing"))[0].existing) {
      await tx.execute(readFileSync("drizzle/0024_roles_activity.sql", "utf8"));
    }
    globalThis.securityDb = tx;
    const { claimStudentsByEmail, getMyChildren, getMyChild } = await import("@/lib/guardians");
    const { assignExistingCoach, getCoachTeams } = await import("@/lib/coach");
    const { createInvitation, getInvitationByToken, acceptInvitation } = await import("@/lib/invitations");
    const { createStaffInvitation, getStaffInvitationByToken, acceptStaffInvitation } = await import("@/lib/staff-invitations");
    const { tenantDb } = await import("@/lib/tenant-db");
    const { setCallups } = await import("@/lib/callups");
    const { addMatchEvent, deleteMatchEvent } = await import("@/lib/match-events");
    const { INVITATION_TTL_MS, isPendingInvitation } = await import("@/lib/invitation-validity");
    const id = () => crypto.randomUUID();
    const [school, foreignSchool] = await tx.insert(schema.schools).values([
      { name: "Security check", slug: id() }, { name: "Other school", slug: id() },
    ]).returning();
    const [user, otherUser] = await tx.insert(schema.users).values([
      { email: `${id()}@example.invalid` }, { email: `${id()}@example.invalid` },
    ]).returning();
    const [team, otherTeam, foreignTeam] = await tx.insert(schema.teams).values([
      { schoolId: school.id, name: "Team" }, { schoolId: school.id, name: "Other team" },
      { schoolId: foreignSchool.id, name: "Foreign team" },
    ]).returning();
    const [student, teammate, otherStudent, foreignStudent] = await tx.insert(schema.students).values([
      { schoolId: school.id, teamId: team.id, firstName: "A", lastName: "Test", guardianEmail: user.email },
      { schoolId: school.id, teamId: team.id, firstName: "B", lastName: "Test" },
      { schoolId: school.id, teamId: otherTeam.id, firstName: "C", lastName: "Test" },
      { schoolId: foreignSchool.id, teamId: foreignTeam.id, firstName: "D", lastName: "Test" },
    ]).returning();
    const links = () => tx.query.guardianships.findMany({ where: eq(schema.guardianships.userId, user.id) });
    await claimStudentsByEmail(user.id, user.email);
    assert.equal((await links()).length, 0);
    await tx.update(schema.users).set({ emailVerified: new Date() }).where(eq(schema.users.id, user.id));
    await claimStudentsByEmail(user.id, otherUser.email);
    assert.equal((await links()).length, 0);
    await claimStudentsByEmail(user.id, user.email.toUpperCase());
    assert.equal((await links()).length, 1);

    const now = Date.now();
    assert.equal(isPendingInvitation({ status: "pending", createdAt: new Date(now - INVITATION_TTL_MS) }, now), false);
    assert.equal(isPendingInvitation({ status: "pending", createdAt: new Date(now - INVITATION_TTL_MS + 1) }, now), true);
    for (const [create, get, accept, target, result, table] of [
      [createInvitation, getInvitationByToken, acceptInvitation, teammate.id, teammate.id, schema.guardianInvitations],
      [createStaffInvitation, getStaffInvitationByToken, acceptStaffInvitation, team.id, school.id, schema.staffInvitations],
    ]) {
      const invitation = await create(school.id, target, user.email);
      assert.equal((await create(school.id, target, user.email)).token, invitation.token);
      const changed = await create(school.id, target, otherUser.email);
      assert.notEqual(changed.token, invitation.token);
      assert.equal(await get(invitation.token), null);
      await tx.update(table).set({ createdAt: new Date(now - INVITATION_TTL_MS - 1000) }).where(eq(table.id, changed.id));
      assert.equal(await get(changed.token), null);
      assert.equal(await accept(changed.token, otherUser.id), null);
      const renewed = await create(school.id, target, user.email);
      assert.notEqual(renewed.token, changed.token);
      // Una cuenta inexistente no debe consumir el enlace.
      if (table === schema.staffInvitations) assert.equal(await accept(renewed.token, "missing-user"), null);
      else await assert.rejects(accept(renewed.token, "missing-user"));
      assert.ok(await get(renewed.token));
      assert.equal(await accept(renewed.token, user.id), result);
      assert.equal(await get(renewed.token), null);
      assert.equal(await accept(renewed.token, otherUser.id), null);
      assert.equal(await accept(renewed.token, user.id), result);
      const revoked = await create(school.id, target, user.email);
      await tx.update(table).set({ status: "revoked" }).where(eq(table.id, revoked.id));
      assert.equal(await get(revoked.token), null);
      assert.equal(await accept(revoked.token, user.id), null);
    }
    assert.equal((await tx.query.memberships.findFirst({ where: eq(schema.memberships.userId, user.id) })).role, "coach");
    assert.equal((await tx.query.guardianships.findMany({ where: eq(schema.guardianships.userId, otherUser.id) })).length, 0);
    assert.deepEqual(new Set((await getMyChildren(user.id)).map((child) => child.id)), new Set([student.id, teammate.id]));
    assert.equal(await getMyChild(user.id, otherStudent.id), null);

    // El destinatario se comprueba dentro del UPDATE, también al invocar el servidor directamente.
    const [recipient, intruder] = await tx.insert(schema.users).values([
      { email: `${id()}@example.invalid` }, { email: `${id()}@example.invalid` },
    ]).returning();
    for (const role of ["coach", "admin"]) {
      const bound = await createStaffInvitation(school.id, role === "coach" ? otherTeam.id : null, ` ${recipient.email.toUpperCase()} `, role);
      assert.equal(bound.email, recipient.email);
      assert.equal(await acceptStaffInvitation(bound.token, intruder.id), null);
      assert.ok(await getStaffInvitationByToken(bound.token));
      assert.equal(await tx.query.memberships.findFirst({ where: eq(schema.memberships.userId, intruder.id) }), undefined);
      assert.equal(await tx.query.coachTeams.findFirst({ where: eq(schema.coachTeams.userId, intruder.id) }), undefined);
      // Los enlaces existentes también toleran mayúsculas y espacios sin aceptar otro correo.
      await tx.update(schema.staffInvitations).set({ email: ` ${recipient.email.toUpperCase()} ` }).where(eq(schema.staffInvitations.id, bound.id));
      assert.equal(await acceptStaffInvitation(bound.token, recipient.id), school.id);
      assert.equal((await tx.query.memberships.findFirst({ where: eq(schema.memberships.userId, recipient.id) })).role, role);
      assert.equal(await acceptStaffInvitation(bound.token, intruder.id), null);
      assert.equal(await acceptStaffInvitation(bound.token, recipient.id), school.id);
    }
    for (const email of [undefined, null, "", "invalid"]) {
      await assert.rejects(createStaffInvitation(school.id, otherTeam.id, email), /correo válido/);
    }
    const [unbound] = await tx.insert(schema.staffInvitations).values({ schoolId: school.id, teamId: otherTeam.id, role: "coach", email: null }).returning();
    assert.equal(await getStaffInvitationByToken(unbound.token), null);
    assert.equal(await acceptStaffInvitation(unbound.token, intruder.id), null);
    assert.equal((await tx.query.staffInvitations.findFirst({ where: eq(schema.staffInvitations.id, unbound.id) })).status, "pending");

    const [match, otherMatch] = await tx.insert(schema.matches).values([team, otherTeam].map((t) => ({ schoolId: school.id, teamId: t.id, opponentName: "Test", kickoffAt: new Date() }))).returning();
    const [session] = await tx.insert(schema.trainingSessions).values({ schoolId: school.id, teamId: team.id, title: "Test", startsAt: new Date() }).returning();
    const tdb = tenantDb(school.id);
    await tdb.attendance.replaceForSession(session.id, [{ studentId: student.id, status: "present" }]);
    await tdb.matchPlayerStats.replaceForMatch(match.id, [{ studentId: student.id, goals: 1 }]);
    await setCallups({ schoolId: school.id, matchId: match.id }, [student.id]);
    for (const invalid of [otherStudent.id, foreignStudent.id, "missing-student"]) {
      await assert.rejects(tdb.attendance.replaceForSession(session.id, [{ studentId: invalid }]), /alumnos inválidos/);
      await assert.rejects(tdb.matchPlayerStats.replaceForMatch(match.id, [{ studentId: invalid, goals: 1 }]), /alumnos inválidos/);
      await assert.rejects(setCallups({ schoolId: school.id, matchId: match.id }, [invalid]), /alumnos inválidos/);
      await assert.rejects(addMatchEvent({ schoolId: school.id, matchId: match.id, type: "goal", studentId: invalid }), /alumnos inválidos/);
    }
    await assert.rejects(tenantDb(foreignSchool.id).attendance.replaceForSession(session.id, []), /Evento/);
    await assert.rejects(setCallups({ schoolId: school.id, matchId: match.id }, [student.id, student.id]), /alumnos inválidos/);
    // Error después del DELETE: las filas originales deben sobrevivir.
    await assert.rejects(tdb.attendance.replaceForSession(session.id, [{ studentId: student.id, status: "invalid" }]));
    await assert.rejects(tdb.matchPlayerStats.replaceForMatch(match.id, [{ studentId: student.id, goals: 1.5 }]));
    assert.equal((await tdb.attendance.findMany({ where: eq(schema.attendance.sessionId, session.id) }))[0].status, "present");
    assert.equal((await tdb.matchPlayerStats.findMany({ where: eq(schema.matchPlayerStats.matchId, match.id) }))[0].goals, 1);
    assert.equal((await tx.query.callups.findMany({ where: eq(schema.callups.matchId, match.id) }))[0].studentId, student.id);
    const event = await addMatchEvent({ schoolId: school.id, matchId: otherMatch.id, type: "goal", studentId: otherStudent.id });
    await deleteMatchEvent(event.id, school.id, match.id);
    assert.ok(await tx.query.matchEvents.findFirst({ where: eq(schema.matchEvents.id, event.id) }));
    await deleteMatchEvent(event.id, school.id, otherMatch.id);
    assert.equal(await tx.query.matchEvents.findFirst({ where: eq(schema.matchEvents.id, event.id) }), undefined);

    const [season] = await tx.insert(schema.seasons).values({ schoolId: school.id, name: "Check" }).returning();
    const [home, away, unrelated] = await tx.insert(schema.leagueTeams).values(["Home", "Away", "Other"].map((name) => ({ schoolId: school.id, name }))).returning();
    const [player, unrelatedPlayer] = await tx.insert(schema.rosterPlayers).values([home, unrelated].map((t) => ({ schoolId: school.id, teamId: t.id, name: "Test" }))).returning();
    const [leagueMatch] = await tx.insert(schema.leagueMatches).values({ schoolId: school.id, seasonId: season.id, homeTeamId: home.id, awayTeamId: away.id }).returning();
    const stat = { playerId: player.id, teamId: home.id, stats: { goals: 1 } };
    await tdb.leagueMatchStats.replaceForMatch(leagueMatch.id, [stat]);
    await assert.rejects(tdb.leagueMatchStats.replaceForMatch(leagueMatch.id, [{ ...stat, teamId: away.id }]), /jugadores inválidos/);
    await assert.rejects(tdb.leagueMatchStats.replaceForMatch(leagueMatch.id, [{ ...stat, playerId: unrelatedPlayer.id, teamId: unrelated.id }]), /jugadores inválidos/);
    assert.equal((await tdb.leagueMatchStats.findMany({ where: eq(schema.leagueMatchStats.matchId, leagueMatch.id) }))[0].playerId, player.id);

    const [owner, admin] = await tx.insert(schema.users).values([{ email: `${id()}@example.invalid` }, { email: `${id()}@example.invalid` }]).returning();
    await tx.insert(schema.memberships).values([{ schoolId: school.id, userId: owner.id, role: "owner" }, { schoolId: school.id, userId: admin.id, role: "admin" }]);
    globalThis.securitySchool = school.id;
    const actor = (u) => { globalThis.securitySession = { user: { id: u.id, name: "Check", email: u.email } }; };
    const form = (values) => { const f = new FormData(); for (const [key, value] of Object.entries(values)) f.set(key, String(value)); return f; };
    const payments = await import("@/app/admin/pagos/actions");
    const expenses = await import("@/app/admin/gastos/actions");
    const finance = await import("@/app/admin/finanzas/actions");
    const schoolActions = await import("@/app/admin/escuela/actions");
    const usersActions = await import("@/app/admin/usuarios/actions");
    const notices = await import("@/app/coach/equipos/[teamId]/notice-actions");
    const { pesosToCents } = await import("@/lib/billing");
    assert.equal(pesosToCents("500.50"), 50050);
    for (const amount of ["-500", "", "abc500", "1.001", "999999999999"]) assert.equal(pesosToCents(amount), null);
    const leagueActions = await import("@/app/admin/liga/temporadas/actions");
    const leagueTeamActions = await import("@/app/admin/liga/equipos/actions");
    const forbidden = [payments.createPlan, payments.createDiscount, payments.assignDiscount, payments.unassignDiscount, payments.deleteDiscount, payments.deletePlan, payments.setPaymentDueDay, payments.createOneOffCharge, payments.generateCharges, payments.cancelCharge, expenses.deleteExpense, finance.cancelCharge, finance.markChargePending, schoolActions.updateSchool, usersActions.inviteStaff, usersActions.revokeUserInvitation, usersActions.removeStaffAccess, leagueActions.setRegistrationFee, leagueActions.generateRegistration, leagueActions.cancelRegistrationCharge, leagueTeamActions.deleteLeagueTeam];
    for (const restricted of [admin, user]) {
      actor(restricted);
      const beforeLogs = (await tx.query.activityLog.findMany({ where: eq(schema.activityLog.schoolId, school.id) })).length;
      for (const fn of forbidden) {
        await assert.rejects(fn.length > 1 ? fn(undefined, new FormData()) : fn(new FormData()), (error) => error?.digest?.startsWith("NEXT_REDIRECT;"));
      }
      assert.equal((await tx.query.activityLog.findMany({ where: eq(schema.activityLog.schoolId, school.id) })).length, beforeLogs);
    }
    actor(owner);
    // Usuarios: ambos roles usan invitaciones; el entrenador exige un equipo propio.
    const [newCoach, newAdmin] = await tx.insert(schema.users).values([
      { email: `${id()}@example.invalid` }, { email: `${id()}@example.invalid` },
    ]).returning();
    for (const invalid of [
      { email: "invalid", role: "admin" },
      { email: newCoach.email, role: "owner" },
      { email: newCoach.email, role: "coach" },
      { email: newCoach.email, role: "coach", teamId: foreignTeam.id },
    ]) {
      assert.ok((await usersActions.inviteStaff(undefined, form(invalid))).error);
    }
    assert.equal((await tx.query.staffInvitations.findMany({ where: eq(schema.staffInvitations.email, newCoach.email) })).length, 0);
    assert.equal((await usersActions.inviteStaff(undefined, form({ email: newAdmin.email, role: "admin", teamId: foreignTeam.id }))).ok, true);
    const newAdminInvite = await tx.query.staffInvitations.findFirst({ where: eq(schema.staffInvitations.email, newAdmin.email) });
    assert.equal(newAdminInvite.role, "admin");
    assert.equal(newAdminInvite.teamId, null);
    await acceptStaffInvitation(newAdminInvite.token, newAdmin.id);
    assert.equal((await usersActions.inviteStaff(undefined, form({ email: ` ${newCoach.email.toUpperCase()} `, role: "coach", teamId: otherTeam.id }))).ok, true);
    const newCoachInvite = await tx.query.staffInvitations.findFirst({ where: eq(schema.staffInvitations.email, newCoach.email) });
    assert.equal(newCoachInvite.role, "coach");
    assert.equal(newCoachInvite.teamId, otherTeam.id);
    await usersActions.revokeUserInvitation(form({ id: newCoachInvite.id }));
    assert.equal(await getStaffInvitationByToken(newCoachInvite.token), null);
    const renewedCoachInvite = await createStaffInvitation(school.id, otherTeam.id, newCoach.email);
    await acceptStaffInvitation(renewedCoachInvite.token, newCoach.id);
    const coachMembership = await tx.query.memberships.findFirst({ where: eq(schema.memberships.userId, newCoach.id) });
    assert.equal(coachMembership.role, "coach");
    assert.equal((await tx.query.coachTeams.findFirst({ where: eq(schema.coachTeams.userId, newCoach.id) })).teamId, otherTeam.id);
    const [foreignMembership] = await tx.insert(schema.memberships).values({ schoolId: foreignSchool.id, userId: newCoach.id, role: "coach" }).returning();
    const [foreignAssignment] = await tx.insert(schema.coachTeams).values({ schoolId: foreignSchool.id, userId: newCoach.id, teamId: foreignTeam.id }).returning();
    const foreignInvite = await createStaffInvitation(foreignSchool.id, foreignTeam.id, newCoach.email);
    await usersActions.revokeUserInvitation(form({ id: foreignInvite.id }));
    assert.ok(await getStaffInvitationByToken(foreignInvite.token));
    await usersActions.removeStaffAccess(form({ id: foreignMembership.id }));
    assert.ok(await tx.query.memberships.findFirst({ where: eq(schema.memberships.id, foreignMembership.id) }));
    const ownerMembership = await tx.query.memberships.findFirst({ where: eq(schema.memberships.userId, owner.id) });
    await usersActions.removeStaffAccess(form({ id: ownerMembership.id }));
    assert.ok(await tx.query.memberships.findFirst({ where: eq(schema.memberships.id, ownerMembership.id) }));
    await usersActions.removeStaffAccess(form({ id: coachMembership.id }));
    assert.equal(await tx.query.memberships.findFirst({ where: eq(schema.memberships.id, coachMembership.id) }), undefined);
    const remainingAssignments = await tx.query.coachTeams.findMany({ where: eq(schema.coachTeams.userId, newCoach.id) });
    assert.deepEqual(remainingAssignments.map((assignment) => assignment.id), [foreignAssignment.id]);
    const adminMembership = await tx.query.memberships.findFirst({ where: eq(schema.memberships.userId, newAdmin.id) });
    await usersActions.removeStaffAccess(form({ id: adminMembership.id }));
    assert.equal(await tx.query.memberships.findFirst({ where: eq(schema.memberships.id, adminMembership.id) }), undefined);
    assert.equal((await payments.createPlan(undefined, form({ name: "Monthly", kind: "monthly", amount: "500" }))).ok, true);
    const plan = await tx.query.plans.findFirst({ where: eq(schema.plans.schoolId, school.id) });
    assert.equal((await payments.createPlan(undefined, form({ id: plan.id, name: "Monthly", kind: "monthly", amount: "600" }))).ok, true);
    assert.equal((await tx.query.plans.findFirst({ where: eq(schema.plans.id, plan.id) })).amountCents, 60000);
    assert.equal((await payments.createDiscount(undefined, form({ name: "Beca", kind: "percent", value: "100" }))).ok, true);
    const discount = await tx.query.discounts.findFirst({ where: eq(schema.discounts.schoolId, school.id) });
    await payments.assignDiscount(form({ discountId: discount.id, studentIds: student.id }));
    assert.ok(await tx.query.studentDiscounts.findFirst({ where: eq(schema.studentDiscounts.discountId, discount.id) }));
    actor(admin);
    const [charge, foreignCharge] = await tx.insert(schema.charges).values([
      { schoolId: school.id, studentId: student.id, kind: "event", description: "Tournament", amountCents: 25000 },
      { schoolId: foreignSchool.id, studentId: foreignStudent.id, kind: "monthly", description: "Other", amountCents: 10000 },
    ]).returning();
    await payments.markChargePaid(form({ id: foreignCharge.id }));
    assert.equal((await tx.query.charges.findFirst({ where: eq(schema.charges.id, foreignCharge.id) })).status, "pending");
    await payments.markChargePaid(form({ id: charge.id }));
    const paid = await tx.query.charges.findFirst({ where: eq(schema.charges.id, charge.id) });
    assert.equal(paid.status, "paid");
    await payments.markChargePaid(form({ id: charge.id }));
    assert.equal((await tx.query.charges.findFirst({ where: eq(schema.charges.id, charge.id) })).paidAt.getTime(), paid.paidAt.getTime());
    await finance.undoManualPayment(form({ id: charge.id }));
    assert.equal((await tx.query.charges.findFirst({ where: eq(schema.charges.id, charge.id) })).status, "pending");
    await tx.update(schema.charges).set({ status: "paid", paidAt: new Date(), stripePaymentIntentId: "pi_test" })
      .where(eq(schema.charges.id, charge.id));
    await finance.undoManualPayment(form({ id: charge.id }));
    assert.equal((await tx.query.charges.findFirst({ where: eq(schema.charges.id, charge.id) })).status, "paid");
    assert.equal((await expenses.createExpense(undefined, form({ description: "Test expense", amount: "50", category: "otro", spentOn: "2026-10-07" }))).ok, true);
    assert.equal((await tdb.expenses.findMany({ with: { sportsCategory: true } }))[0].category, "otro");
    assert.ok((await expenses.createExpense(undefined, form({ description: "Invalid date", amount: "50", category: "otro", spentOn: "2026-02-30" }))).error);
    const [registration] = await tx.insert(schema.leagueCharges).values({ schoolId: school.id, seasonId: season.id, teamId: home.id, description: "Registration", amountCents: 10000, status: "canceled" }).returning();
    await leagueActions.markRegistrationPaid(form({ id: registration.id }));
    assert.equal((await tx.query.leagueCharges.findFirst({ where: eq(schema.leagueCharges.id, registration.id) })).status, "canceled");
    actor(user); // El usuario existente aceptó la invitación de coach del equipo.
    assert.equal((await notices.sendTeamNotice(undefined, form({ teamId: team.id, recipientId: otherUser.id, title: "Hello", body: "Team notice" }))).error !== undefined, true);
    await assert.rejects(notices.sendTeamNotice(undefined, form({ teamId: otherTeam.id, recipientId: "", title: "Hello", body: "Team notice" })), (e) => e?.digest?.startsWith("NEXT_REDIRECT;"));
    assert.equal((await notices.sendTeamNotice(undefined, form({ teamId: team.id, recipientId: user.id, title: "Hello", body: "Team notice" }))).ok, true);
    const logs = await tx.query.activityLog.findMany({ where: eq(schema.activityLog.schoolId, school.id) });
    assert.ok(logs.some((log) => log.actorId === admin.id && log.action === "Registrar pago de alumno" && log.status === "completed"));
    assert.ok(logs.some((log) => log.actorId === user.id && log.action === "Enviar aviso a tutores" && log.details.body?.[0] === "Team notice"));
    const adminInvite = await createStaffInvitation(school.id, null, otherUser.email, "admin");
    assert.equal(await acceptStaffInvitation(adminInvite.token, otherUser.id), school.id);
    assert.equal((await tx.query.memberships.findFirst({ where: eq(schema.memberships.userId, otherUser.id) })).role, "admin");
    assert.equal(await acceptStaffInvitation(adminInvite.token, owner.id), null);
    const ownerInvite = await createStaffInvitation(school.id, team.id, owner.email);
    await acceptStaffInvitation(ownerInvite.token, owner.id);
    assert.equal((await tx.query.memberships.findFirst({ where: eq(schema.memberships.userId, owner.id) })).role, "owner");
    assert.equal((await tx.execute("select relrowsecurity from pg_class where oid = 'public.activity_log'::regclass"))[0].relrowsecurity, true);

    assert.equal(await assignExistingCoach(school.id, otherTeam.id, user.email), true);
    assert.equal(await assignExistingCoach(school.id, otherTeam.id, user.email), true);
    assert.equal(await assignExistingCoach(school.id, foreignTeam.id, user.email), false);
    assert.deepEqual(new Set((await getCoachTeams(user.id, school.id)).map((team) => team.id)), new Set([team.id, otherTeam.id]));

    const { generateMonthlyCharges, generateAnnualRenewals } = await import("@/lib/recurring-billing");
    const { billingDate } = await import("@/lib/billing-rules");
    assert.equal(billingDate(new Date("2026-03-01T05:59:59Z")), "2026-02-28");
    const [academy] = await tx.insert(schema.schools).values({ name: "Becas QA", slug: id(), paymentDueDay: 10 }).returning();
    const [category] = await tx.insert(schema.categories).values({ schoolId: academy.id, name: "Sub-10" }).returning();
    const [partial, full, regular, inactive] = await tx.insert(schema.students).values([
      { firstName: "Parcial", categoryId: category.id, scholarshipPaymentDay: 5, enrolledOn: "2024-02-29" },
      { firstName: "Completa", enrolledOn: "2026-02-02" },
      { firstName: "Regular", enrolledOn: "2025-08-15" },
      { firstName: "Inactivo", status: "inactive", enrolledOn: "2024-02-28" },
    ].map((row) => ({ ...row, lastName: "QA", schoolId: academy.id }))).returning();
    const [generalPlan, categoryPlan] = await tx.insert(schema.plans).values([
      { kind: "monthly", name: "General", amountCents: 50000 },
      { kind: "monthly", name: "Sub-10", amountCents: 60000, categoryId: category.id },
      { kind: "enrollment", name: "Anual", amountCents: 30000, annualRenewalStartsOn: "2026-01-01" },
    ].map((row) => ({ ...row, schoolId: academy.id }))).returning();
    const [partialGrant, fixedGrant, fullGrant] = await tx.insert(schema.discounts).values([
      { name: "Deportiva", kind: "percent", value: 25 },
      { name: "Fija", kind: "fixed", value: 12000 },
      { name: "Completa", kind: "percent", value: 100 },
    ].map((row) => ({ ...row, schoolId: academy.id }))).returning();
    await tx.insert(schema.studentDiscounts).values([
      [partial, partialGrant], [partial, fixedGrant], [full, fullGrant],
    ].map(([student, grant]) => ({ schoolId: academy.id, studentId: student.id, discountId: grant.id })));
    assert.equal(await generateMonthlyCharges(academy.id, "2026-02", "2026-02-05"), 3);
    assert.equal(await generateMonthlyCharges(academy.id, "2026-02", "2026-02-05"), 0);
    const monthly = () => tx.query.charges.findMany({
      where: eq(schema.charges.schoolId, academy.id),
    }).then((rows) => new Map(rows.filter((row) => row.kind === "monthly").map((row) => [row.studentId, row])));
    let month = await monthly();
    assert.equal(month.get(partial.id).amountCents, 45000);
    assert.equal(month.get(partial.id).scholarshipName, "Deportiva");
    assert.equal(month.get(partial.id).planId, categoryPlan.id);
    assert.equal(month.get(partial.id).dueDate, "2026-02-05");
    assert.equal(month.get(full.id).amountCents, 0);
    assert.equal(month.get(full.id).status, "paid");
    assert.equal(month.get(regular.id).planId, generalPlan.id);
    assert.equal(month.has(inactive.id), false);
    await tx.update(schema.plans).set({ amountCents: 70000 }).where(eq(schema.plans.id, categoryPlan.id));
    await generateMonthlyCharges(academy.id, "2026-02", "2026-02-06");
    month = await monthly();
    assert.equal(month.get(partial.id).amountCents, 60000);
    assert.equal(month.get(full.id).status, "paid");
    assert.equal(await generateAnnualRenewals(academy.id, "2026-02-27"), 0);
    assert.equal(await generateAnnualRenewals(academy.id, "2026-02-28"), 1);
    assert.equal(await generateAnnualRenewals(academy.id, "2026-02-28"), 0);
    const annual = await tx.query.charges.findFirst({
      where: and(eq(schema.charges.schoolId, academy.id), eq(schema.charges.renewalYear, 2026)),
    });
    assert.equal(annual.studentId, partial.id);
    assert.equal(annual.dueDate, "2026-02-28");
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
  console.log("Seguridad: roles, precios y becas del dueño, operación administrativa, avisos por equipo, historial e invitaciones comprobados en Postgres local con rollback.");
} finally {
  delete globalThis.securityDb;
  delete globalThis.securitySession;
  delete globalThis.securitySchool;
  await client.end();
}
