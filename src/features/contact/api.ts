import { NotConnectedError } from '@/lib/errors';
import type { ContactFormValues } from './schema';

/**
 * NOT CONNECTED YET (Phase 2). Will call the `submit_contact_inquiry`
 * database function, which validates input and rate-limits submissions.
 */
export async function submitContactInquiry(_values: ContactFormValues): Promise<void> {
  throw new NotConnectedError(
    "The contact form isn't connected yet. Your message is still in the form. Please use the email or phone details on this page for now.",
  );
}
