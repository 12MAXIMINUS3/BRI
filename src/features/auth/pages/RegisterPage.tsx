import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { errorMessage } from '@/lib/errors';
import { usePageMeta } from '@/lib/usePageMeta';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/form/Field';
import { useAuth } from '../AuthProvider';
import { AuthCard } from '../components/AuthCard';
import { safeNext, signInPath } from '../redirect';
import { registerSchema, type RegisterValues } from '../schemas';

export function RegisterPage() {
  usePageMeta({ title: 'Create an account', description: 'Create an account to request custom work and track orders.', noIndex: true });
  const { signUp, user, ready } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  if (ready && user && !sentTo) return <Navigate to={next} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const { needsConfirmation } = await signUp(values);
      if (needsConfirmation) setSentTo(values.email);
      else navigate(next, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  if (sentTo) {
    return (
      <AuthCard eyebrow="Almost done" title="Check your email">
        <p className="leading-relaxed text-ivory-200">
          We sent a confirmation link to <strong className="text-gold-300">{sentTo}</strong>. Open it to activate your
          account, then sign in to continue.
        </p>
        <p className="mt-4 text-sm text-mist-400">Can't find it? Check your spam folder.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Your account"
      title="Create an account"
      description="An account lets you send requests, review and accept quotations, and follow your orders."
      footer={
        <>
          Already registered?{' '}
          <Link to={signInPath(next)} className="font-medium text-gold-300 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <TextField label="Full name" required autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
        <TextField label="Email" type="email" required autoComplete="email" error={errors.email?.message} {...register('email')} />
        <TextField label="Phone" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
        <TextField
          label="Password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 8 characters, including a letter and a number."
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirm password"
          type="password"
          required
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" loading={isSubmitting}>
          Create Account
        </Button>
      </form>
    </AuthCard>
  );
}
