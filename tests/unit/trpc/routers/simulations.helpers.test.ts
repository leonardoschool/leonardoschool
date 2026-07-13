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
