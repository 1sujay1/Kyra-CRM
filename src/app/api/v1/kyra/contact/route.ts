import { NextRequest, NextResponse } from 'next/server';
import { POST as handleLandingPost, OPTIONS as handleOptions } from '@/app/api/leads/landing/route';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  return handleLandingPost(req);
}
