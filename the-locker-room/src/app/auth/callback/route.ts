import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get('next') || '/';
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
