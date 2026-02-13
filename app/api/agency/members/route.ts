import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  requireAgencyMember,
  requireAgencyAdmin,
} from '@/lib/agency/middleware';

/**
 * GET /api/agency/members
 * List all members of the current user's agency, with user info.
 */
export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from('agency_members')
    .select('*, user:user_id(id, email)')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }

  return NextResponse.json({ members: members ?? [] });
}

/**
 * POST /api/agency/members
 * Invite a new member to the agency. Requires admin+ role.
 * Body: { email: string, role: 'admin' | 'member' }
 *
 * NOTE: This is a placeholder implementation. In production, this should send
 * an invite email and create a pending invitation record. For now, it looks up
 * the user by email and creates the membership directly.
 */
export async function POST(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  // Parse body
  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, role } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  if (!role || !['admin', 'member'].includes(role)) {
    return NextResponse.json(
      { error: 'Role must be "admin" or "member"' },
      { status: 400 }
    );
  }

  const serviceClient = await createServiceClient();

  // Look up user by email (placeholder — real flow would use invites)
  const { data: userData, error: userError } = await serviceClient.auth.admin.listUsers();

  const targetUser = userData?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!targetUser) {
    return NextResponse.json(
      { error: 'No user found with that email. They need to sign up first.' },
      { status: 404 }
    );
  }

  // Check if already a member
  const { data: existingMember } = await serviceClient
    .from('agency_members')
    .select('id')
    .eq('agency_id', agency.id)
    .eq('user_id', targetUser.id)
    .limit(1)
    .single();

  if (existingMember) {
    return NextResponse.json(
      { error: 'This user is already a member of your agency' },
      { status: 409 }
    );
  }

  // Check if user belongs to another agency
  const { data: otherMembership } = await serviceClient
    .from('agency_members')
    .select('id')
    .eq('user_id', targetUser.id)
    .limit(1)
    .single();

  if (otherMembership) {
    return NextResponse.json(
      { error: 'This user already belongs to another agency' },
      { status: 409 }
    );
  }

  // Create membership
  const { data: member, error: insertError } = await serviceClient
    .from('agency_members')
    .insert({
      agency_id: agency.id,
      user_id: targetUser.id,
      role,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create agency member:', insertError);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }

  return NextResponse.json(member, { status: 201 });
}

/**
 * DELETE /api/agency/members?id=<member_id>
 * Remove a member from the agency. Requires admin+ role.
 * Cannot remove the agency owner.
 */
export async function DELETE(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const memberId = request.nextUrl.searchParams.get('id');

  if (!memberId) {
    return NextResponse.json({ error: 'Member ID is required (?id=...)' }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch the member to verify they exist and aren't the owner
  const { data: member, error: fetchError } = await supabase
    .from('agency_members')
    .select('*')
    .eq('id', memberId)
    .eq('agency_id', agency.id)
    .single();

  if (fetchError || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  if (member.role === 'owner') {
    return NextResponse.json(
      { error: 'Cannot remove the agency owner' },
      { status: 403 }
    );
  }

  // Delete
  const { error: deleteError } = await supabase
    .from('agency_members')
    .delete()
    .eq('id', memberId)
    .eq('agency_id', agency.id);

  if (deleteError) {
    console.error('Failed to delete member:', deleteError);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
