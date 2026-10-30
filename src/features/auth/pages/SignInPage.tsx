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
import { signInSchema, type SignInValues } from '../schemas';

export function SignInPage() {
  usePageMeta({ title: 'Sign in', description: 'Sign in to view your requests, quotations, and orders.', noIndex: true });
  const { signIn, user, ready } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } });

  if (ready && user) return <Navigate to={next} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await signIn(values.email, values.password);
      navigate(next, { replace: true });
    } catch (e) {
      const message = errorMessage(e);
      setError(
        /email not confirmed/i.test(message)
          ? 'Please confirm your email address first. Check your inbox for the confirmation link.'
          : /invalid login credentials/i.test(message)
            ? 'That email and password combination is not recognised.'
            : message,
      );
    }
  });

  return (
    <AuthCard
      eyebrow="Your account"
      title="Sign in"
      description={
        params.get('next') ? 'Please sign in to continue. Anything you typed into a form has been kept.' : undefined
      }
      footer={
        <>
          New here?{' '}
          <Link to={signInPath(next, 'register')} className="font-medium text-gold-300 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {params.get('confirmed') && (
        <Alert tone="success" className="mb-6" title="Email confirmed">
          You can now sign in.
        </Alert>
      )}
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <TextField label="Email" type="email" required autoComplete="email" error={errors.email?.message} {...register('email')} />
        <TextField
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" loading={isSubmitting}>
          Sign In
        </Button>
        <Link to="/forgot-password" className="text-center text-sm text-gold-300 hover:underline">
          Forgot your password?
        </Link>
      </form>
    </AuthCard>
  );
}
