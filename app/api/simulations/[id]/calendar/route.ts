/**
 * Calendar (.ics) file download for scheduled simulations
 * GET /api/simulations/[id]/calendar - Download .ics file
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { adminAuth } from '@/lib/firebase/admin';
import { generateICalendar, EventEmailData } from '@/lib/email/eventEmails';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authToken);
    } catch {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        student: true,
        collaborator: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    // Get simulation with creator info
    const simulation = await prisma.simulation.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
        class: {
          select: { name: true },
        },
      },
    });

    if (!simulation) {
      return NextResponse.json({ error: 'Simulazione non trovata' }, { status: 404 });
    }

    // Check if simulation is scheduled (has dates)
    if (!simulation.startDate) {
      return NextResponse.json(
        { error: 'Questa simulazione non ha una data programmata' },
        { status: 400 }
      );
    }

    // Check access based on role
    if (user.role === 'STUDENT') {
      const student = user.student;
      if (!student) {
        return NextResponse.json({ error: 'Profilo studente non trovato' }, { status: 404 });
      }

      // Check if student has access to this simulation
      const hasAccess = await checkStudentAccess(student.id, student.classId, simulation.id);
      if (!hasAccess && !simulation.isPublic) {
        return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
      }
    } else if (user.role === 'COLLABORATOR') {
      const collaborator = user.collaborator;
      if (!collaborator) {
        return NextResponse.json({ error: 'Profilo collaboratore non trovato' }, { status: 404 });
      }

      // Collaborators can only download calendar for simulations they created or are assigned to
      if (simulation.createdById !== user.id) {
        const hasAccess = await checkCollaboratorAccess(collaborator.id, simulation.id);
        if (!hasAccess) {
          return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
        }
      }
    }
    // ADMIN can access all simulations

    // Calculate end date (start + duration)
    const startDate = simulation.startDate;
    const endDate = simulation.endDate || new Date(
      startDate.getTime() + (simulation.durationMinutes || 60) * 60 * 1000
    );

    // Build event data
    const creatorName = simulation.createdBy?.name || 'Leonardo School';

    // Build description
    let description = simulation.description || '';
    description += `\n\nTipo: ${simulation.type}`;
    description += `\nDomande: ${simulation.totalQuestions}`;
    description += `\nDurata: ${simulation.durationMinutes} minuti`;
    if (simulation.isOfficial) {
      description += '\n\n⚠️ SIMULAZIONE UFFICIALE';
    }
    if (simulation.class) {
      description += `\nClasse: ${simulation.class.name}`;
    }

    const eventData: EventEmailData = {
      id: `simulation-${simulation.id}`,
      title: `📝 ${simulation.title}`,
      description,
      startDate,
      endDate,
      type: 'SIMULATION',
      createdByName: creatorName,
      isAllDay: false,
      locationType: simulation.locationType as 'ONLINE' | 'IN_PERSON' | 'HYBRID' | null,
      locationDetails: simulation.locationDetails,
      onlineLink: null, // Could add platform link here if needed
    };

    // Generate iCalendar content
    const icsContent = generateICalendar(eventData, 'REQUEST');

    // Generate filename
    const dateStr = startDate.toISOString().split('T')[0];
    const safeTitle = simulation.title
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);
    const filename = `simulazione_${safeTitle}_${dateStr}.ics`;

    // Return .ics file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating calendar file:', error);
    return NextResponse.json(
      { error: 'Errore nella generazione del file calendario' },
      { status: 500 }
    );
  }
}

// Helper function to check student access
async function checkStudentAccess(
  studentId: string,
  classId: string | null,
  simulationId: string
): Promise<boolean> {
  // Check direct assignment
  const assignment = await prisma.simulationAssignment.findFirst({
    where: {
      simulationId,
      OR: [
        { studentId },
        ...(classId ? [{ classId }] : []),
      ],
    },
  });

  if (assignment) return true;

  // Check group assignment
  const groupMemberships = await prisma.groupMember.findMany({
    where: { studentId },
    select: { groupId: true },
  });

  if (groupMemberships.length > 0) {
    const groupAssignment = await prisma.simulationAssignment.findFirst({
      where: {
        simulationId,
        groupId: { in: groupMemberships.map(gm => gm.groupId) },
      },
    });

    if (groupAssignment) return true;
  }

  return false;
}

// Helper function to check collaborator access
async function checkCollaboratorAccess(
  collaboratorId: string,
  simulationId: string
): Promise<boolean> {
  // Check if collaborator is reference for any group assigned to this simulation
  const groupAssignments = await prisma.simulationAssignment.findMany({
    where: { simulationId, groupId: { not: null } },
    select: { groupId: true },
  });

  if (groupAssignments.length === 0) return false;

  const groupIds = groupAssignments
    .map(ga => ga.groupId)
    .filter((id): id is string => id !== null);

  const managedGroup = await prisma.group.findFirst({
    where: {
      id: { in: groupIds },
      referenceCollaboratorId: collaboratorId,
    },
  });

  return !!managedGroup;
}
