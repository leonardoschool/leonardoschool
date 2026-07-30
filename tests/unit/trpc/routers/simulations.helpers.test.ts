/**
 * Assignment ↔ calendar-event date sync helpers.
 *
 * These keep a simulation assignment and its linked calendar event on the same
 * dates so moving one moves the other for every invitee.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildSimulationEventDescription,
  computeAssignmentEventSchedule,
  syncCalendarEventsForAssignments,
  syncAssignmentsForCalendarEvent,
  dedupeAssignmentTargets,
  parseSavedProgress,
  isUniqueConstraintError,
  buildResumeAttemptPayload,
} from '@/server/trpc/routers/simulations.helpers';

describe('buildSimulationEventDescription', () => {
  const start = new Date('2026-01-01T10:00:00');
  const end = new Date('2026-01-03T12:00:00');

  it('returns null for a single-day window', () => {
    expect(buildSimulationEventDescription(start, end, false)).toBeNull();
  });

  it('describes the availability window for a multi-day event', () => {
    const desc = buildSimulationEventDescription(start, end, true);
    expect(desc).toContain('Disponibile dal');
  });
});

describe('computeAssignmentEventSchedule', () => {
  it('keeps a same-day window as a non-all-day event with no description', () => {
    const start = new Date('2026-01-01T10:00:00');
    const end = new Date('2026-01-01T12:00:00');
    const schedule = computeAssignmentEventSchedule(start, end, 90);

    expect(schedule.startDate).toBe(start);
    expect(schedule.endDate).toBe(end);
    expect(schedule.isAllDay).toBe(false);
    expect(schedule.description).toBeNull();
  });

  it('marks a window crossing midnight as an all-day event with a description', () => {
    const start = new Date('2026-01-01T10:00:00');
    const end = new Date('2026-01-02T09:00:00');
    const schedule = computeAssignmentEventSchedule(start, end, 90);

    expect(schedule.isAllDay).toBe(true);
    expect(schedule.description).toContain('Disponibile dal');
  });

  it('falls back to `now` when the start date is missing', () => {
    const now = new Date('2026-05-05T08:00:00');
    const schedule = computeAssignmentEventSchedule(null, null, 60, now);

    expect(schedule.startDate).toBe(now);
    // end = start + 60 minutes
    expect(schedule.endDate.getTime()).toBe(now.getTime() + 60 * 60 * 1000);
    expect(schedule.isAllDay).toBe(false);
  });

  it('derives the end from the simulation duration when the end date is missing', () => {
    const start = new Date('2026-01-01T10:00:00');
    const schedule = computeAssignmentEventSchedule(start, null, 120);

    expect(schedule.endDate.getTime()).toBe(start.getTime() + 120 * 60 * 1000);
  });
});

describe('syncCalendarEventsForAssignments', () => {
  it('updates each linked event and skips assignments without one', async () => {
    const update = vi.fn().mockResolvedValue({});
    const prisma = {
      simulationAssignment: {
        findMany: vi.fn().mockResolvedValue([
          {
            calendarEventId: 'evt-1',
            startDate: new Date('2026-02-01T09:00:00'),
            endDate: new Date('2026-02-01T11:00:00'),
            simulation: { durationMinutes: 120 },
          },
          // calendarEventId null → skipped by the query filter in real usage;
          // included here to prove the guard also holds if one slips through.
          {
            calendarEventId: null,
            startDate: new Date('2026-02-02T09:00:00'),
            endDate: new Date('2026-02-02T11:00:00'),
            simulation: { durationMinutes: 120 },
          },
        ]),
      },
      calendarEvent: { update },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const updated = await syncCalendarEventsForAssignments(prisma, ['a1', 'a2']);

    expect(updated).toBe(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'evt-1' } })
    );
  });

  it('returns 0 without querying when no assignment ids are given', async () => {
    const findMany = vi.fn();
    const prisma = {
      simulationAssignment: { findMany },
      calendarEvent: { update: vi.fn() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    expect(await syncCalendarEventsForAssignments(prisma, [])).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('syncAssignmentsForCalendarEvent', () => {
  it('pushes the event dates onto every linked assignment', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 });
    const prisma = {
      simulationAssignment: { updateMany },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const start = new Date('2026-03-01T09:00:00');
    const end = new Date('2026-03-01T10:30:00');
    const count = await syncAssignmentsForCalendarEvent(prisma, 'evt-9', start, end);

    expect(count).toBe(3);
    expect(updateMany).toHaveBeenCalledWith({
      where: { calendarEventId: 'evt-9' },
      data: { startDate: start, endDate: end },
    });
  });
});

describe('dedupeAssignmentTargets', () => {
  const window = { startDate: '2026-04-10T08:00:00.000Z', endDate: '2026-04-10T10:00:00.000Z' };

  it('collapses the same student on the same window', () => {
    const result = dedupeAssignmentTargets([
      { studentId: 'stu-1', ...window },
      { studentId: 'stu-1', ...window },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].studentId).toBe('stu-1');
  });

  it('collapses the same group on the same window', () => {
    const result = dedupeAssignmentTargets([
      { groupId: 'grp-1', ...window },
      { groupId: 'grp-1', ...window },
      { groupId: 'grp-1', ...window },
    ]);

    expect(result).toHaveLength(1);
  });

  it('keeps the same recipient on different windows', () => {
    const result = dedupeAssignmentTargets([
      { studentId: 'stu-1', ...window },
      { studentId: 'stu-1', startDate: '2026-04-11T08:00:00.000Z', endDate: '2026-04-11T10:00:00.000Z' },
    ]);

    expect(result).toHaveLength(2);
  });

  it('keeps distinct recipients and never confuses a student with a group', () => {
    const result = dedupeAssignmentTargets([
      { studentId: 'x', ...window },
      { groupId: 'x', ...window },
      { studentId: 'y', ...window },
    ]);

    expect(result).toHaveLength(3);
  });

  it('collapses duplicated targets without dates', () => {
    const result = dedupeAssignmentTargets([{ groupId: 'grp-2' }, { groupId: 'grp-2' }]);

    expect(result).toHaveLength(1);
  });
});

describe('parseSavedProgress', () => {
  it('reads the envelope written by an autosave', () => {
    const result = parseSavedProgress({
      items: [{ questionId: 'q1', answerId: 'a1', answerText: null, timeSpent: 4, flagged: false }],
      sectionTimes: { '0': 120, '1': 45 },
      currentSectionIndex: 1,
      currentQuestionIndex: 7,
      rev: 12,
    });

    expect(result.savedAnswers).toHaveLength(1);
    expect(result.savedSectionTimes).toEqual({ 0: 120, 1: 45 });
    expect(result.savedCurrentSectionIndex).toBe(1);
    expect(result.savedCurrentQuestionIndex).toBe(7);
    expect(result.savedRev).toBe(12);
  });

  it('treats an envelope saved before revisions existed as revision zero', () => {
    const result = parseSavedProgress({
      items: [{ questionId: 'q1', answerId: 'a1', answerText: null, timeSpent: 0, flagged: false }],
      currentSectionIndex: 0,
      currentQuestionIndex: 3,
    });

    expect(result.savedRev).toBe(0);
    expect(result.savedCurrentQuestionIndex).toBe(3);
  });

  it('still reads the legacy bare-array format', () => {
    const result = parseSavedProgress([
      { questionId: 'q1', answerId: 'a1', answerText: null, timeSpent: 0, flagged: false },
    ]);

    expect(result.savedAnswers).toHaveLength(1);
    expect(result.savedRev).toBe(0);
    expect(result.savedSectionTimes).toEqual({});
  });

  it('ignores a non-numeric revision rather than propagating it', () => {
    const result = parseSavedProgress({ items: [], rev: 'nope' });

    expect(result.savedRev).toBe(0);
  });

  it('returns empty state for an attempt that was never saved', () => {
    const result = parseSavedProgress(null);

    expect(result.savedAnswers).toEqual([]);
    expect(result.savedRev).toBe(0);
    expect(result.savedCurrentSectionIndex).toBe(0);
  });
});

describe('isUniqueConstraintError', () => {
  it('recognises Prisma\'s unique-violation code', () => {
    expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true);
  });

  it('leaves other Prisma failures to propagate', () => {
    expect(isUniqueConstraintError({ code: 'P2025' })).toBe(false);
    expect(isUniqueConstraintError(new Error('boom'))).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
    expect(isUniqueConstraintError(undefined)).toBe(false);
  });
});

describe('buildResumeAttemptPayload', () => {
  const attempt = {
    id: 'result-1',
    resetAt: null as Date | null,
    durationSeconds: 320,
    answers: {
      items: [{ questionId: 'q1', answerId: 'a1', answerText: null, timeSpent: 8, flagged: true }],
      sectionTimes: { '0': 60 },
      currentSectionIndex: 1,
      currentQuestionIndex: 4,
      rev: 17,
    },
  };

  it('hands the client everything it needs to restore the attempt', () => {
    const payload = buildResumeAttemptPayload(attempt);

    expect(payload.resultId).toBe('result-1');
    expect(payload.resumed).toBe(true);
    expect(payload.savedTimeSpent).toBe(320);
    expect(payload.savedRev).toBe(17);
    expect(payload.savedAnswers).toHaveLength(1);
    expect(payload.savedSectionTimes).toEqual({ 0: 60 });
    expect(payload.savedCurrentSectionIndex).toBe(1);
    expect(payload.savedCurrentQuestionIndex).toBe(4);
  });

  it('exposes the staff-reset marker as a comparable token', () => {
    const resetAt = new Date('2026-07-20T10:00:00Z');
    const payload = buildResumeAttemptPayload({ ...attempt, resetAt });

    expect(payload.resetToken).toBe(resetAt.getTime());
  });

  it('reports no token for an attempt never reset', () => {
    expect(buildResumeAttemptPayload(attempt).resetToken).toBeNull();
  });

  it('copes with an attempt that has no saved progress yet', () => {
    const payload = buildResumeAttemptPayload({ id: 'r2', resetAt: null, durationSeconds: null, answers: [] });

    expect(payload.savedTimeSpent).toBe(0);
    expect(payload.savedRev).toBe(0);
    expect(payload.savedAnswers).toEqual([]);
  });
});
