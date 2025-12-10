import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Crea response
    const response = NextResponse.json({ success: true });

    // Cancella tutti i cookie di autenticazione
    response.cookies.delete('auth-token');
    response.cookies.delete('user-role');
    response.cookies.delete('profile-completed');

    return response;
  } catch (error) {
    console.error('Errore durante il logout:', error);
    return NextResponse.json(
      { error: 'Errore durante il logout' },
      { status: 500 }
    );
  }
}
