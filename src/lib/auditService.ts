import { supabase } from './supabase';
import type { User } from '../types';

export async function logAudit(
  user: User | null,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: user?.id || null,
      user_name: user?.full_name || 'System',
      user_role: user?.role || '',
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: details || {},
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}
