import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { applyBusinessSettings } from '@/config/business';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/form/Field';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { getSettings, saveSettings, type BusinessSettings } from '../api/misc';
import { AdminPageHeader, Panel } from '../components/AdminUi';
import { adminKeys } from '../keys';

const optional = (max: number) => z.string().trim().max(max);

const schema = z.object({
  business_name: z.string().trim().min(1, 'Required').max(120),
  tagline: optional(200),
  contact_email: z.string().trim().max(254).refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Enter a valid email'),
  contact_phone: optional(32),
  whatsapp_number: z.string().trim().refine((v) => v === '' || /^\d{6,20}$/.test(v), 'Digits only, with country code'),
  location: optional(200),
  service_area: optional(200),
  currency_code: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === '' || /^[A-Z]{3}$/.test(v), 'Three-letter ISO code, e.g. USD, EUR, NGN, XAF'),
  locale: optional(20),
  payment_instructions: optional(4000),
});
type Values = z.infer<typeof schema>;

export function SettingsPage() {
  const settings = useQuery({ queryKey: adminKeys.settings(), queryFn: getSettings });
  if (settings.isPending) return <LoadingState />;
  if (settings.isError) return <ErrorState message={errorMessage(settings.error)} onRetry={() => settings.refetch()} />;
  return <SettingsForm settings={settings.data} />;
}

function SettingsForm({ settings }: { settings: BusinessSettings }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, watch, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_name: settings.business_name,
      tagline: settings.tagline ?? '',
      contact_email: settings.contact_email ?? '',
      contact_phone: settings.contact_phone ?? '',
      whatsapp_number: settings.whatsapp_number ?? '',
      location: settings.location ?? '',
      service_area: settings.service_area ?? '',
      currency_code: settings.currency_code ?? '',
      locale: settings.locale ?? '',
      payment_instructions: settings.payment_instructions ?? '',
    },
  });
  const { errors } = formState;
  const save = useMutation({
    mutationFn: (values: Values) => {
      const row = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])) as Omit<BusinessSettings, 'updated_at'>;
      return saveSettings({ ...row, business_name: values.business_name }).then(() => row);
    },
    onSuccess: (row) => {
      applyBusinessSettings(row); // update the running site immediately
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });

  const currency = watch('currency_code').toUpperCase();
  let preview = '';
  if (/^[A-Z]{3}$/.test(currency)) {
    try {
      preview = formatMoney(125050, currency, watch('locale') || undefined);
    } catch {
      preview = '';
    }
  }

  return (
    <>
      <AdminPageHeader title="Settings" description="Business details shown across the website." />
      <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="grid max-w-3xl gap-6">
        <Panel title="Business">
          <div className="grid gap-5">
            <TextField label="Business name" required error={errors.business_name?.message} {...register('business_name')} />
            <TextField label="Tagline" hint="Shown in the footer." error={errors.tagline?.message} {...register('tagline')} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Location" error={errors.location?.message} {...register('location')} />
              <TextField label="Service area" hint='Shown as "Serving …"' error={errors.service_area?.message} {...register('service_area')} />
            </div>
          </div>
        </Panel>

        <Panel title="Contact">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Email" type="email" error={errors.contact_email?.message} {...register('contact_email')} />
            <TextField label="Phone" type="tel" error={errors.contact_phone?.message} {...register('contact_phone')} />
            <TextField
              label="WhatsApp number"
              inputMode="numeric"
              hint="Digits only, including country code. Leave empty to hide."
              error={errors.whatsapp_number?.message}
              {...register('whatsapp_number')}
            />
          </div>
        </Panel>

        <Panel title="Money">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Currency code"
              placeholder="e.g. USD"
              hint={preview ? `Prices will look like ${preview}` : 'Required before products can be ordered or quotations created.'}
              error={errors.currency_code?.message}
              {...register('currency_code')}
            />
            <TextField label="Number format (locale)" placeholder="e.g. en-US, fr-CM" hint="Leave empty to use each visitor's browser setting." {...register('locale')} />
          </div>
          <TextAreaField
            label="Default payment instructions"
            rows={4}
            className="mt-5"
            hint="Copied onto each new order (and used when a quotation has no payment terms). Editing this doesn't change existing orders."
            error={errors.payment_instructions?.message}
            {...register('payment_instructions')}
          />
          <Alert tone="info" className="mt-5">
            Changing the currency doesn't convert existing prices. Re-check product prices after changing it.
          </Alert>
        </Panel>

        {save.isError && <Alert tone="error">{errorMessage(save.error)}</Alert>}
        {save.isSuccess && <Alert tone="success">Settings saved.</Alert>}
        <div>
          <Button type="submit" size="lg" loading={save.isPending}>
            Save Settings
          </Button>
        </div>
      </form>
    </>
  );
}
