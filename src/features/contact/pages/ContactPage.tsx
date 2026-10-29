import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { errorMessage, isNotConnectedError } from '@/lib/errors';
import { usePageMeta } from '@/lib/usePageMeta';
import { Alert } from '@/components/ui/Alert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SelectField, TextAreaField, TextField } from '@/components/ui/form/Field';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { submitContactInquiry } from '../api';
import { ContactDetails } from '../components/ContactDetails';
import { CONTACT_DEFAULTS, CONTACT_SUBJECTS, contactSchema, type ContactFormValues } from '../schema';

export function ContactPage() {
  usePageMeta({
    title: 'Contact',
    description: 'Get in touch with questions about products, custom work, or an existing order.',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: CONTACT_DEFAULTS,
    mode: 'onTouched',
  });

  const submission = useMutation({
    mutationFn: submitContactInquiry,
    onSuccess: () => reset(CONTACT_DEFAULTS),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await submission.mutateAsync(values);
    } catch {
      // Shown via `submission.error`; the message stays in the form.
    }
  });

  return (
    <>
      <section className="bg-ink-900">
        <Container className="py-16 sm:py-20">
          <SectionHeading
            as="h1"
            eyebrow="Contact"
            title="Get in touch"
            description="Questions about a product, a past project, or an order in progress? Send a message. For new commissions, the custom-order form helps us quote accurately."
          />
        </Container>
      </section>

      <Container className="grid gap-14 py-12 sm:py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="text-2xl">Contact details</h2>
          <div className="mt-6">
            <ContactDetails />
          </div>
          <div className="mt-10 rounded-sm border border-gold-500/30 bg-ink-900 p-6 text-ivory-200">
            <h2 className="text-xl text-ivory-50">Planning a custom piece?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ivory-300">
              The custom-order form asks for the details we need for a quotation, including sizes and reference
              images.
            </p>
            <ButtonLink to="/custom-order" size="sm" className="mt-5">
              Request a Custom Order
            </ButtonLink>
          </div>
        </div>

        <div className="lg:col-span-8">
          {submission.isSuccess ? (
            <Alert tone="success" title="Message sent">
              Thanks for getting in touch. We'll reply to the email address you provided.
            </Alert>
          ) : (
            <form
              noValidate
              onSubmit={onSubmit}
              className="grid gap-5 rounded-2xl border border-ink-700 bg-ink-850 p-6 shadow-card sm:p-10"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Name" required autoComplete="name" error={errors.name?.message} {...register('name')} />
                <TextField
                  label="Email"
                  type="email"
                  required
                  autoComplete="email"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Phone" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
                <SelectField label="Subject" required error={errors.subject?.message} {...register('subject')}>
                  {CONTACT_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </SelectField>
              </div>
              <TextAreaField label="Message" required rows={7} error={errors.message?.message} {...register('message')} />

              {/* Honeypot: visually hidden and skipped by keyboard and screen readers. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="contact-website">Website</label>
                <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
              </div>

              {submission.isError &&
                (isNotConnectedError(submission.error) ? (
                  <Alert tone="info" title="Not connected yet">
                    {submission.error.message}
                  </Alert>
                ) : (
                  <Alert tone="error" title="We couldn't send your message">
                    {errorMessage(submission.error)}
                  </Alert>
                ))}

              <div className="flex justify-end">
                <Button type="submit" size="lg" loading={submission.isPending}>
                  {submission.isPending ? 'Sending…' : 'Send Message'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Container>
    </>
  );
}
