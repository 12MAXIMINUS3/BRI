import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { business } from '@/config/business';
import { CATEGORIES, FINISHES, MATERIALS, MEASUREMENT_UNITS, NEED_ADVICE, isCategorySlug } from '@/config/catalog';
import { errorMessage, isNotConnectedError } from '@/lib/errors';
import { usePageMeta } from '@/lib/usePageMeta';
import { WoodImage } from '@/components/media/WoodImage';
import { Alert } from '@/components/ui/Alert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { CheckboxField, Fieldset, SelectField, TextAreaField, TextField } from '@/components/ui/form/Field';
import { CheckIcon } from '@/components/ui/icons';
import { useProject } from '@/features/portfolio/hooks';
import { submitCustomOrderRequest, toCustomOrderPayload } from '../api';
import { HowItWorks } from '../components/HowItWorks';
import { ReferenceImagesInput } from '../components/ReferenceImagesInput';
import {
  CUSTOM_ORDER_DEFAULTS,
  customOrderSchema,
  validateReferenceFiles,
  type CustomOrderFormValues,
} from '../schema';
import { useFormDraft } from '../useFormDraft';

const DRAFT_KEY = 'custom-order-draft';

export function CustomOrderPage() {
  usePageMeta({
    title: 'Request a Custom Order',
    description: 'Describe the piece you have in mind and receive a quotation before anything is confirmed.',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const form = useForm<CustomOrderFormValues>({
    resolver: zodResolver(customOrderSchema),
    defaultValues: CUSTOM_ORDER_DEFAULTS,
    mode: 'onTouched',
  });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, submitCount, isSubmitting },
  } = form;
  const draft = useFormDraft(DRAFT_KEY, form, CUSTOM_ORDER_DEFAULTS);

  // Prefill from links such as "Request Something Similar" (?project=) or an
  // out-of-stock product (?category=). Runs after the draft is restored.
  const projectParam = searchParams.get('project') ?? '';
  const categoryParam = searchParams.get('category');
  useEffect(() => {
    if (projectParam) setValue('referenceProjectSlug', projectParam);
    if (isCategorySlug(categoryParam)) setValue('category', categoryParam);
  }, [projectParam, categoryParam, setValue]);

  const referenceSlug = watch('referenceProjectSlug');
  const { data: referenceProject } = useProject(referenceSlug || undefined);

  // Default the category to the reference project's category if none chosen.
  useEffect(() => {
    if (referenceProject && !form.getValues('category')) setValue('category', referenceProject.category);
  }, [referenceProject, form, setValue]);

  const submission = useMutation({
    mutationFn: (values: CustomOrderFormValues) => submitCustomOrderRequest(toCustomOrderPayload(values), files),
    onSuccess: () => {
      draft.clear();
      setFiles([]);
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const problem = validateReferenceFiles(files);
    setFileError(problem);
    if (problem) return;
    try {
      await submission.mutateAsync(values);
    } catch {
      // Shown via `submission.error`; form values are kept for another attempt.
    }
  });

  const removeReference = () => {
    setValue('referenceProjectSlug', '');
    const next = new URLSearchParams(searchParams);
    next.delete('project');
    setSearchParams(next, { replace: true });
  };

  const clearForm = () => {
    reset(CUSTOM_ORDER_DEFAULTS);
    setFiles([]);
    setFileError(null);
    draft.clear();
    submission.reset();
  };

  const errorCount = Object.keys(errors).length;
  const busy = isSubmitting || submission.isPending;

  if (submission.isSuccess) {
    return (
      <Container className="max-w-2xl py-24 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold-500/15 text-gold-400">
          <CheckIcon className="size-7" />
        </span>
        <h1 className="mt-6 text-4xl">Request received</h1>
        <p className="mt-4 text-lg leading-relaxed text-ivory-300">
          Your reference is <strong className="text-ivory-50">{submission.data.reference}</strong>. We'll review your
          requirements and get back to you, usually with questions or a quotation. Nothing is confirmed until you accept
          a quotation.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/account">View my requests</ButtonLink>
          <ButtonLink to="/work" variant="secondary">
            Browse our work
          </ButtonLink>
        </div>
      </Container>
    );
  }

  return (
    <>
      <section className="bg-ink-900">
        <Container className="py-16 sm:py-20">
          <p className="eyebrow">Custom orders</p>
          <h1 className="mt-3 max-w-3xl text-5xl tracking-tight text-balance sm:text-6xl">Request a Custom Order</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ivory-300">
            Tell us about the piece you have in mind. The more detail you share, the more accurate our quotation can
            be. Not sure about materials or finishes? Choose “I need advice” and we'll recommend options.
          </p>
        </Container>
      </section>

      <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-12 lg:gap-16">
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <h2 className="text-2xl">What happens next</h2>
            <HowItWorks variant="list" className="mt-6" />
            <Alert tone="warning" className="mt-8" title="This is a request, not an order">
              Submitting this form does not confirm an order, a price, or a delivery date. We'll send a quotation for
              you to accept or decline.
            </Alert>
          </div>
        </aside>

        <div className="lg:col-span-8">
          <form
            noValidate
            onSubmit={onSubmit}
            aria-describedby="required-note"
            className="rounded-2xl border border-ink-700 bg-ink-850 p-6 shadow-card sm:p-10"
          >
            <p id="required-note" className="mb-8 text-sm text-mist-400">
              Fields marked <span className="text-gold-400">*</span> are required.
            </p>

            {draft.restored && (
              <Alert
                className="mb-8"
                title="We restored your unsent details"
                action={
                  <Button size="sm" variant="secondary" onClick={clearForm}>
                    Start over
                  </Button>
                }
              >
                Images can't be saved between visits, so please re-attach any you'd like to include.
              </Alert>
            )}

            {referenceSlug && (
              <div className="mb-8 flex items-center gap-4 rounded-xl border border-ink-700 bg-ink-950 p-3">
                <WoodImage image={referenceProject?.images[0]} sizes="80px" className="size-16 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium tracking-wider text-mist-400 uppercase">Reference project</p>
                  {referenceProject ? (
                    <Link to={`/work/${referenceProject.slug}`} className="font-medium text-ivory-50 hover:underline">
                      {referenceProject.title}
                    </Link>
                  ) : (
                    <p className="text-ivory-300">{referenceSlug}</p>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={removeReference}>
                  Remove
                </Button>
              </div>
            )}

            {submitCount > 0 && errorCount > 0 && (
              <Alert tone="error" className="mb-8" title="Please check the highlighted fields">
                {errorCount === 1 ? 'One field needs' : `${errorCount} fields need`} your attention before you can send
                this request.
              </Alert>
            )}

            <div className="grid gap-10">
              <Fieldset legend="About you" description="So we can reply to your request.">
                <TextField
                  label="Full name"
                  required
                  autoComplete="name"
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField
                    label="Email"
                    type="email"
                    required
                    autoComplete="email"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                  <TextField
                    label="Phone number"
                    type="tel"
                    required
                    autoComplete="tel"
                    hint="Include your country code if you're outside our area."
                    error={errors.phone?.message}
                    {...register('phone')}
                  />
                </div>
              </Fieldset>

              <Fieldset legend="Your project">
                <SelectField label="Product category" required error={errors.category?.message} {...register('category')}>
                  <option value="">Choose a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </SelectField>
                <TextAreaField
                  label="Project description"
                  required
                  rows={6}
                  hint="What is it for, where will it go, and what style do you like? Mention anything that must fit around it."
                  error={errors.description?.message}
                  {...register('description')}
                />
              </Fieldset>

              <Fieldset
                legend="Size and materials"
                description="Approximate dimensions are fine. Leave blank if you're not sure yet."
              >
                <div className="grid gap-5 sm:grid-cols-4">
                  <TextField label="Width" inputMode="decimal" error={errors.width?.message} {...register('width')} />
                  <TextField label="Depth" inputMode="decimal" error={errors.depth?.message} {...register('depth')} />
                  <TextField label="Height" inputMode="decimal" error={errors.height?.message} {...register('height')} />
                  <SelectField label="Units" required error={errors.unit?.message} {...register('unit')}>
                    {MEASUREMENT_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <TextField
                  label="Notes on size"
                  placeholder="e.g. must fit an alcove 1.2 m wide"
                  error={errors.dimensionNotes?.message}
                  {...register('dimensionNotes')}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField label="Preferred material" required error={errors.material?.message} {...register('material')}>
                    <option value="">Choose a material</option>
                    <option value={NEED_ADVICE}>I need advice</option>
                    {MATERIALS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField label="Preferred finish" required error={errors.finish?.message} {...register('finish')}>
                    <option value="">Choose a finish</option>
                    <option value={NEED_ADVICE}>I need advice</option>
                    {FINISHES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </Fieldset>

              <Fieldset legend="Quantity, budget, and timing">
                <div className="grid gap-5 sm:grid-cols-3">
                  <TextField
                    label="Quantity"
                    required
                    inputMode="numeric"
                    error={errors.quantity?.message}
                    {...register('quantity')}
                  />
                  <TextField
                    label={`Budget from${business.currencyCode ? ` (${business.currencyCode})` : ''}`}
                    inputMode="decimal"
                    error={errors.budgetMin?.message}
                    {...register('budgetMin')}
                  />
                  <TextField
                    label={`Budget up to${business.currencyCode ? ` (${business.currencyCode})` : ''}`}
                    inputMode="decimal"
                    error={errors.budgetMax?.message}
                    {...register('budgetMax')}
                  />
                </div>
                <TextField
                  label="Preferred completion date"
                  type="date"
                  hint="We'll confirm a realistic date in the quotation. This isn't guaranteed until agreed."
                  error={errors.preferredDate?.message}
                  className="sm:max-w-xs"
                  {...register('preferredDate')}
                />
              </Fieldset>

              <Fieldset legend="Delivery">
                <TextField
                  label="Delivery location"
                  required
                  autoComplete="address-level2"
                  hint="Town or area is enough for now. We'll confirm delivery or collection options in the quotation."
                  error={errors.deliveryLocation?.message}
                  {...register('deliveryLocation')}
                />
              </Fieldset>

              <Fieldset legend="Reference images">
                <ReferenceImagesInput
                  files={files}
                  disabled={busy}
                  error={fileError}
                  onChange={(next) => {
                    setFiles(next);
                    setFileError(validateReferenceFiles(next));
                  }}
                />
              </Fieldset>

              <div className="border-t border-ink-700 pt-8">
                <CheckboxField
                  label="I understand that submitting this form is a request for a quotation. It does not confirm an order, price, or delivery date."
                  error={errors.acknowledged?.message}
                  {...register('acknowledged')}
                />
              </div>
            </div>

            {submission.isError && (
              <div className="mt-8">
                {isNotConnectedError(submission.error) ? (
                  <Alert tone="info" title="Not connected yet">
                    {submission.error.message}
                  </Alert>
                ) : (
                  <Alert tone="error" title="We couldn't send your request">
                    {errorMessage(submission.error)} Your details are still here, so you can try again.
                  </Alert>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="ghost" onClick={clearForm} disabled={busy}>
                Clear form
              </Button>
              <Button type="submit" size="lg" loading={busy}>
                {busy ? 'Sending request…' : 'Send Request'}
              </Button>
            </div>
          </form>
        </div>
      </Container>
    </>
  );
}
