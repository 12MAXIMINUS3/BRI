import { NotConnectedError } from '@/lib/errors';
import { supabase, toError } from '@/lib/supabase';
import type { ContactFormValues } from './schema';

/**
 * Calls the `submit_contact_inquiry` database function, which validates the
 * input, drops honeypot submissions, and rate-limits by email and IP.
 * No account is needed.
 */
export async function submitContactInquiry(values: ContactFormValues): Promise<void> {
  if (!supabase) {
    throw new NotConnectedError(
      "The contact form isn't connected yet. Your message is still in the form. Please use the email or phone details on this page for now.",
    );
  }
  const { error } = await supabase.rpc('submit_contact_inquiry', {
    p_name: values.name,
    p_email: values.email,
    p_phone: values.phone,
    p_subject: values.subject,
    p_message: values.message,
    p_website: values.website,
  });
  if (error) throw toError(error, 'Could not send your message.');
}
