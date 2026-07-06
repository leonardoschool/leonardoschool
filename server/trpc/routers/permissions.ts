// Permissions Router - Admin configuration of the capability matrix (admin only).
// Reads the effective matrix (code defaults merged with DB overrides) and writes overrides
// to the RolePermission table. ADMIN is a fixed super-user and is not configurable here.
import { router, adminProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  CAPABILITIES,
  PERMISSION_SUBJECTS,
  SUBJECT_LABELS,
  isValidCapability,
} from '@/lib/permissions/capabilities';
import { getEffectiveMatrix, invalidatePermissionCache } from '@/lib/permissions/resolve';

const subjectEnum = z.enum(['STUDENT', 'COLLABORATOR_TUTOR', 'COLLABORATOR_SECRETARY']);

export const permissionsRouter = router({
  /**
   * The full matrix for the admin UI: the capability catalog (grouped by area) plus, for each
   * capability, its effective enabled state per configurable subject and its code default.
   */
  getMatrix: adminProcedure.query(async () => {
    const matrix = await getEffectiveMatrix();
    return {
      subjects: PERMISSION_SUBJECTS.map((key) => ({ key, label: SUBJECT_LABELS[key] })),
      capabilities: CAPABILITIES.map((cap) => ({
        key: cap.key,
        area: cap.area,
        label: cap.label,
        description: cap.description ?? null,
        enabled: {
          STUDENT: matrix.STUDENT.has(cap.key),
          COLLABORATOR_TUTOR: matrix.COLLABORATOR_TUTOR.has(cap.key),
          COLLABORATOR_SECRETARY: matrix.COLLABORATOR_SECRETARY.has(cap.key),
        },
        defaults: cap.defaults,
      })),
    };
  }),

  /**
   * Upsert a batch of (subject, capability) overrides, then invalidate the in-memory cache so
   * the change takes effect on the next request (on the writing instance; other instances
   * refresh within the cache TTL).
   */
  setCapabilities: adminProcedure
    .input(
      z.object({
        changes: z
          .array(
            z.object({
              subject: subjectEnum,
              capability: z.string(),
              enabled: z.boolean(),
            }),
          )
          .min(1)
          .max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Reject the whole batch on any unknown key: silently dropping entries would make the
      // admin UI believe a toggle was saved when it wasn't (e.g. a stale tab after a deploy).
      const invalid = input.changes.filter((change) => !isValidCapability(change.capability));
      if (invalid.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Abilitazioni sconosciute: ${invalid.map((c) => c.capability).join(', ')}. Ricarica la pagina e riprova.`,
        });
      }

      await ctx.prisma.$transaction(
        input.changes.map((change) =>
          ctx.prisma.rolePermission.upsert({
            where: { subject_capability: { subject: change.subject, capability: change.capability } },
            create: { subject: change.subject, capability: change.capability, enabled: change.enabled },
            update: { enabled: change.enabled },
          }),
        ),
      );

      // Audit trail: permission grants/revocations must be attributable to an admin.
      console.info(
        `[permissions] admin ${ctx.user.id} (${ctx.user.email}) updated ${input.changes.length} override(s):`,
        input.changes.map((c) => `${c.subject}.${c.capability}=${c.enabled}`).join(' '),
      );

      invalidatePermissionCache();
      return { updated: input.changes.length };
    }),

  /**
   * Remove overrides (all subjects, or a single subject) so the affected capabilities revert to
   * their code-defined defaults.
   */
  resetToDefaults: adminProcedure
    .input(z.object({ subject: subjectEnum.optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.rolePermission.deleteMany({
        where: input?.subject ? { subject: input.subject } : {},
      });
      console.info(
        `[permissions] admin ${ctx.user.id} (${ctx.user.email}) reset ${result.count} override(s) to defaults` +
          (input?.subject ? ` for ${input.subject}` : ''),
      );
      invalidatePermissionCache();
      return { removed: result.count };
    }),
});
