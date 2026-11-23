import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth.user) return new Response('Unauthorized', { status: 401, headers: cors });
    const { report_id } = await req.json();
    if (!Number.isInteger(report_id)) return new Response('Invalid report id', { status: 400, headers: cors });
    const admin = createClient(url, serviceKey);
    const { data: report, error } = await admin.from('reports').select('id,reporter_id,reported_id,crew_id,reason,note,created_at').eq('id', report_id).single();
    if (error || !report || report.reporter_id !== auth.user.id) return new Response('Report not found', { status: 404, headers: cors });
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const recipient = Deno.env.get('REPORTS_EMAIL');
    if (!resendKey || !recipient) return new Response(JSON.stringify({ stored: true, email_sent: false, reason: 'Email secrets are not configured' }), { status: 202, headers: { ...cors, 'Content-Type': 'application/json' } });
    const email = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('REPORTS_FROM') || 'SONIUM Reports <onboarding@resend.dev>',
        to: [recipient],
        subject: `SONIUM report #${report.id} · ${report.reason}`,
        text: `New SONIUM report\n\nReport: ${report.id}\nReporter: ${report.reporter_id}\nReported account: ${report.reported_id}\nCrew: ${report.crew_id}\nReason: ${report.reason}\nDetails: ${report.note || 'None'}\nCreated: ${report.created_at}\n\nReview this report in the SONIUM owner dashboard.`,
      }),
    });
    if (!email.ok) return new Response(JSON.stringify({ stored: true, email_sent: false, provider_status: email.status }), { status: 202, headers: { ...cors, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ stored: true, email_sent: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (_error) {
    return new Response('Internal error', { status: 500, headers: cors });
  }
});
