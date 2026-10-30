import { NotConnectedError } from '@/lib/errors';
import { supabase, toError } from '@/lib/supabase';
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
  /** Names of reference images that could not be uploaded. The request itself was still saved. */
  failedUploads: string[];
}

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * Submits a custom-order request for the signed-in customer:
 *  1. `submit_custom_request` creates the request (idempotent per client token).
 *  2. Reference images upload to the private `request-attachments` bucket under
 *     {customer_id}/{request_id}/, and each is recorded in `request_attachments`.
 * Storage policies only allow uploads into the customer's own request folder.
 */
export async function submitCustomOrderRequest(
  payload: CustomOrderPayload,
  files: File[],
  clientToken: string,
): Promise<CustomOrderResult> {
  if (!supabase) {
    throw new NotConnectedError(
      "Online submission isn't connected yet. Your details passed validation and are still in the form.",
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Please sign in to send your request.');

  const { data, error } = await supabase
    .rpc('submit_custom_request', {
      p_client_token: clientToken,
      p_full_name: payload.fullName,
      p_email: payload.email,
      p_phone: payload.phone,
      p_category: payload.category,
      p_description: payload.description,
      p_width: payload.dimensions.width,
      p_depth: payload.dimensions.depth,
      p_height: payload.dimensions.height,
      p_unit: payload.dimensions.unit,
      p_dimension_notes: payload.dimensions.notes,
      p_material: payload.material,
      p_finish: payload.finish,
      p_quantity: payload.quantity,
      p_budget_min: payload.budgetMin,
      p_budget_max: payload.budgetMax,
      p_preferred_date: payload.preferredDate,
      p_delivery_location: payload.deliveryLocation,
      p_reference_project_slug: payload.referenceProjectSlug,
    })
    .single<{ id: string; reference: string }>();
  if (error) throw toError(error, 'Could not send your request.');

  const failedUploads: string[] = [];
  for (const file of files) {
    const path = `${userId}/${data.id}/${crypto.randomUUID()}.${EXTENSIONS[file.type] ?? 'jpg'}`;
    const upload = await supabase.storage
      .from('request-attachments')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) {
      failedUploads.push(file.name);
      continue;
    }
    const record = await supabase.from('request_attachments').insert({
      request_id: data.id,
      storage_path: path,
      file_name: file.name.slice(0, 255),
      mime_type: file.type,
      size_bytes: file.size,
    });
    if (record.error) failedUploads.push(file.name);
  }

  return { requestId: data.id, reference: data.reference, failedUploads };
}
