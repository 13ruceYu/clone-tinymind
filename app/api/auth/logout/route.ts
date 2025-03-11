import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete('username');
  cookieStore.delete('gh_token');
  
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL!));
}