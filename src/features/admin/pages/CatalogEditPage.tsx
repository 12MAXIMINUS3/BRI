import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { business } from '@/config/business';
import { CATEGORIES, isCategorySlug, type CategorySlug } from '@/config/catalog';
import { errorMessage } from '@/lib/errors';
import { minorToInput, parseMoneyToMinor } from '@/lib/money';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/ui/form/Field';
import { ErrorState, LoadingState } from '@/components/ui/States';
import {
  deleteCatalogItem,
  getCatalogItem,
  saveCatalogItem,
  type AdminProduct,
  type AdminProject,
  type CatalogKind,
  type ProductInput,
  type ProjectInput,
} from '../api/catalog';
import { AdminPageHeader, Panel } from '../components/AdminUi';
import { ImageManager } from '../components/ImageManager';
import { adminKeys } from '../keys';

const schema = z.object({
  name: z.string().trim().min(1, 'Required').max(160),
  slug: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, numbers, and single hyphens only'),
  category: z.string().refine((v): boolean => isCategorySlug(v), 'Choose a category'),
  summary: z.string().trim().max(400),
  description: z.string().max(10000),
  materials: z.string().max(500),
  finish: z.string().max(500),
  dimensions: z.string().trim().max(200),
  price: z.string(),
  stock: z.string(),
  featured: z.boolean(),
  sortOrder: z.string().regex(/^-?\d{0,6}$/, 'Whole number'),
  status: z.enum(['draft', 'published', 'archived']),
  isDemo: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

const list = (text: string) =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const BASE = { product: '/admin/products', project: '/admin/portfolio' } as const;

export function CatalogEditPage({ kind }: { kind: CatalogKind }) {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const item = useQuery({
    queryKey: adminKeys.catalogItem(kind, id ?? 'new'),
    queryFn: () => getCatalogItem(kind, id!),
    enabled: !isNew,
  });

  if (!isNew && item.isPending) return <LoadingState />;
  if (!isNew && item.isError) return <ErrorState message={errorMessage(item.error)} onRetry={() => item.refetch()} />;
  if (!isNew && !item.data) return <ErrorState title="Not found" />;
  return <CatalogForm key={id ?? 'new'} kind={kind} item={isNew ? null : (item.data as AdminProduct | AdminProject)} />;
}

function CatalogForm({ kind, item }: { kind: CatalogKind; item: AdminProduct | AdminProject | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isProduct = kind === 'product';
  const product = isProduct ? (item as AdminProduct | null) : null;
  const project = !isProduct ? (item as AdminProject | null) : null;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? project?.title ?? '',
      slug: item?.slug ?? '',
      category: item?.category ?? '',
      summary: item?.summary ?? '',
      description: item?.description ?? '',
      materials: item?.materials.join(', ') ?? '',
      finish: product?.finish ?? project?.finishes.join(', ') ?? '',
      dimensions: item?.dimensions ?? '',
      price: product ? minorToInput(Number(product.price_minor)) : '',
      stock: product ? String(product.stock_quantity) : '0',
      featured: item?.featured ?? false,
      sortOrder: String(item?.sort_order ?? 0),
      status: item?.status ?? 'draft',
      isDemo: item?.is_demo ?? false,
    },
  });
  const { register, handleSubmit, watch, setValue, setError, formState } = form;
  const { errors } = formState;

  // Suggest a slug from the name for new items until the slug is edited by hand.
  const name = watch('name');
  useEffect(() => {
    if (!item && !formState.dirtyFields.slug) setValue('slug', slugify(name));
  }, [name, item, formState.dirtyFields.slug, setValue]);

  const save = useMutation({
    mutationFn: (values: ProductInput | ProjectInput) => saveCatalogItem(kind, item?.id ?? null, values),
    onSuccess: (savedId) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      void queryClient.invalidateQueries({ queryKey: [isProduct ? 'products' : 'portfolio'] });
      setSaved(true);
      if (!item) navigate(`${BASE[kind]}/${savedId}`, { replace: true });
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteCatalogItem(kind, item!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      navigate(BASE[kind], { replace: true });
    },
  });

  const onSubmit = handleSubmit((v) => {
    setSaved(false);
    const common = {
      slug: v.slug,
      category: v.category as CategorySlug,
      summary: v.summary,
      description: v.description.trim(),
      materials: list(v.materials),
      dimensions: v.dimensions || null,
      featured: v.featured,
      sort_order: Number(v.sortOrder) || 0,
      status: v.status,
      is_demo: v.isDemo,
    };
    if (isProduct) {
      const price = parseMoneyToMinor(v.price);
      if (price === null) return setError('price', { message: `Enter a price${business.currencyCode ? ` in ${business.currencyCode}` : ''}` });
      if (!/^\d+$/.test(v.stock) || Number(v.stock) > 100000) return setError('stock', { message: 'Enter a whole number' });
      save.mutate({ ...common, name: v.name, price_minor: price, stock_quantity: Number(v.stock), finish: v.finish.trim() || null });
    } else {
      save.mutate({ ...common, title: v.name, finishes: list(v.finish) });
    }
  });

  const label = isProduct ? 'product' : 'project';

  return (
    <>
      <AdminPageHeader
        back={{ to: BASE[kind], label: isProduct ? 'All products' : 'All projects' }}
        title={item ? (product?.name ?? project?.title) : `New ${label}`}
        description={
          isProduct
            ? 'Published products appear in the shop with their price and stock.'
            : 'Published projects appear on Our Work as examples of past work.'
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <form noValidate onSubmit={onSubmit} className="grid content-start gap-6 xl:col-span-2">
          <Panel title="Details">
            <div className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label={isProduct ? 'Name' : 'Title'} required error={errors.name?.message} {...register('name')} />
                <TextField label="URL slug" required hint={`/${isProduct ? 'shop' : 'work'}/${watch('slug') || '…'}`} error={errors.slug?.message} {...register('slug')} />
              </div>
              <SelectField label="Category" required error={errors.category?.message} {...register('category')} className="sm:max-w-xs">
                <option value="">Choose</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </SelectField>
              <TextField label="Short summary" hint="One sentence shown on cards." error={errors.summary?.message} {...register('summary')} />
              <TextAreaField label="Description" rows={7} hint="Leave a blank line between paragraphs." error={errors.description?.message} {...register('description')} />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Materials" hint="Separate with commas." {...register('materials')} />
                <TextField label={isProduct ? 'Finish' : 'Finishes'} hint={isProduct ? undefined : 'Separate with commas.'} {...register('finish')} />
              </div>
              <TextField label="Dimensions" placeholder="e.g. W 1200 × D 450 × H 750 mm" {...register('dimensions')} />
            </div>
          </Panel>

          {isProduct && (
            <Panel title="Price and stock">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label={`Price${business.currencyCode ? ` (${business.currencyCode})` : ''}`}
                  required
                  inputMode="decimal"
                  error={errors.price?.message}
                  {...register('price')}
                />
                <TextField
                  label="In stock"
                  required
                  inputMode="numeric"
                  hint="Units available to request. Requests reserve stock automatically; cancellations return it."
                  error={errors.stock?.message}
                  {...register('stock')}
                />
              </div>
            </Panel>
          )}

          <Panel title="Visibility">
            <div className="grid gap-5">
              <SelectField label="Status" required {...register('status')} className="sm:max-w-xs">
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published (visible)</option>
                <option value="archived">Archived (hidden, kept for records)</option>
              </SelectField>
              <TextField label="Sort order" inputMode="numeric" hint="Lower numbers appear first." error={errors.sortOrder?.message} {...register('sortOrder')} className="sm:max-w-xs" />
              <CheckboxField label="Feature on the home page" {...register('featured')} />
              <CheckboxField label='Demo content (shows a "Demo" label on the site)' {...register('isDemo')} />
            </div>
          </Panel>

          {save.isError && <Alert tone="error">{errorMessage(save.error)}</Alert>}
          {saved && !save.isPending && <Alert tone="success">Saved.</Alert>}
          <div className="flex flex-wrap justify-between gap-3">
            <Button type="submit" size="lg" loading={save.isPending}>
              {item ? 'Save Changes' : `Create ${label}`}
            </Button>
            {item && (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </div>
        </form>

        <div className="grid content-start gap-6">
          {item ? (
            <ImageManager kind={kind} parentId={item.id} />
          ) : (
            <Panel title="Photos">
              <p className="text-mist-400">Save the {label} first, then add photos.</p>
            </Panel>
          )}
        </div>
      </div>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete this ${label}?`}>
        <p className="leading-relaxed text-ivory-200">
          This permanently removes it and its photos. If it's linked to existing orders or requests, archive it instead.
        </p>
        {remove.isError && <Alert tone="error" className="mt-4">{errorMessage(remove.error)}</Alert>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Keep
          </Button>
          <Button loading={remove.isPending} onClick={() => remove.mutate()}>
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
