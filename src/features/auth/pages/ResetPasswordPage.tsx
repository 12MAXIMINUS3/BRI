import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { errorMessage } from '@/lib/errors';
import { usePageMeta } from '@/lib/usePageMeta';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/form/Field';
import { LoadingState } from '@/components/ui/States';
import { useAuth } from '../AuthProvider';
import { AuthCard } from '../components/AuthCard';
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas';

/** Landing page for the password-reset email link. */
export function ResetPasswordPage() {
  usePageMeta({ title: 'Choose a new password', description: 'Choose a new password for your account.', noIndex: true });
  const { ready, user, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (!ready) return <LoadingState className="py-32" />;

  if (!user) {
    return (
      <AuthCard eyebrow="Your account" title="Link expired">
        <p className="leading-relaxed text-ivory-200">This reset link is invalid or has expired.</p>
        <Link to="/forgot-password" className="mt-4 inline-block text-gold-300 hover:underline">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await updatePassword(password);
      navigate('/account', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthCard eyebrow="Your account" title="Choose a new password">
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <TextField
          label="New password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 8 characters, including a letter and a number."
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirm new password"
          type="password"
          required
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" loading={isSubmitting}>
          Save Password
        </Button>
      </form>
    </AuthCard>
  );
}
