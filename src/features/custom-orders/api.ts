import { NotConnectedError } from '@/lib/errors';
import type { CustomOrderFormValues } from './schema';

export interface CustomOrderPayload {
  fullName: string;
  email: string;
  phone: string;
  category: string;
  description: string;
  dimensions: {
    width: number | null;
    depth: number | null;
    height: number | null;
    unit: string;
    notes: string | null;
  };
  material: string;
  finish: string;
  quantity: number;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredDate: string | null;
  deliveryLocation: string;
  referenceProjectSlug: string | null;
}

const toNumber = (v: string) => (v.trim() === '' ? null : Number(v));
const toText = (v: string) => (v.trim() === '' ? null : v.trim());

/** Converts validated form strings into the typed payload sent to the backend. */
export function toCustomOrderPayload(values: CustomOrderFormValues): CustomOrderPayload {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
    category: values.category,
    description: values.description.trim(),
    dimensions: {
      width: toNumber(values.width),
      depth: toNumber(values.depth),
      height: toNumber(values.height),
      unit: values.unit,
      notes: toText(values.dimensionNotes),
    },
    material: values.material,
    finish: values.finish,
    quantity: Number(values.quantity),
    budgetMin: toNumber(values.budgetMin),
    budgetMax: toNumber(values.budgetMax),
    preferredDate: toText(values.preferredDate),
    deliveryLocation: values.deliveryLocation.trim(),
    referenceProjectSlug: toText(values.referenceProjectSlug),
  };
}

export interface CustomOrderResult {
  requestId: string;
  reference: string;
}

/**
 * NOT CONNECTED YET (Phase 3). Will require a signed-in customer, upload the
 * reference images to the private storage bucket, and call the
 * `submit_custom_request` database function.
 */
export async function submitCustomOrderRequest(
  _payload: CustomOrderPayload,
  _files: File[],
): Promise<CustomOrderResult> {
  throw new NotConnectedError(
    "Online submission isn't connected yet. Your details passed validation and are still in the form.",
  );
}
