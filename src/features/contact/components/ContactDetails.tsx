import type { ReactNode } from 'react';
import { business, whatsappUrl } from '@/config/business';
import { ChatIcon, MailIcon, MapPinIcon, PhoneIcon } from '@/components/ui/icons';

export function ContactDetails() {
  const whatsapp = whatsappUrl();
  const nothingConfigured = !business.email && !business.phone && !whatsapp && !business.serviceArea;

  return (
    <ul className="grid gap-6">
      {business.email && (
        <Item icon={<MailIcon className="size-5" />} label="Email">
          <a href={`mailto:${business.email}`} className="text-ivory-50 hover:underline">
            {business.email}
          </a>
        </Item>
      )}
      {business.phone && (
        <Item icon={<PhoneIcon className="size-5" />} label="Phone">
          <a href={`tel:${business.phone.replace(/\s/g, '')}`} className="text-ivory-50 hover:underline">
            {business.phone}
          </a>
        </Item>
      )}
      {whatsapp && (
        <Item icon={<ChatIcon className="size-5" />} label="WhatsApp">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-ivory-50 hover:underline">
            Message us on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Item>
      )}
      {(business.serviceArea || business.location) && (
        <Item icon={<MapPinIcon className="size-5" />} label="Service area">
          <span className="text-ivory-50">{business.serviceArea || business.location}</span>
        </Item>
      )}
      {nothingConfigured && business.showDemoLabels && (
        <li className="rounded-xl border border-dashed border-gold-500/40 p-4 text-sm text-ivory-300">
          Contact details are not configured yet. Set the email, phone, WhatsApp, and service area in{' '}
          <code className="rounded bg-ink-800 px-1">.env.local</code> (Phase 2: business settings in the admin
          dashboard).
        </li>
      )}
    </ul>
  );
}

function Item({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-800 text-gold-400">{icon}</span>
      <div>
        <p className="text-sm text-mist-400">{label}</p>
        <p className="font-medium">{children}</p>
      </div>
    </li>
  );
}
