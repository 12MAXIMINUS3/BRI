import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { errorMessage } from '@/lib/errors';
import { usePageMeta } from '@/lib/usePageMeta';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/form/Field';
import { useAuth } from '../AuthProvider';
import { AuthCard } from '../components/AuthCard';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas';

export function ForgotPasswordPage() {
  usePageMeta({ title: 'Reset your password', description: 'Get a link to reset your password.', noIndex: true });
  const { sendPasswordReset } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthCard
      eyebrow="Your account"
      title="Reset your password"
      description="Enter the email you registered with and we'll send you a link to choose a new password."
      footer={
        <Link to="/sign-in" className="text-gold-300 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        // Same message whether or not the email exists, so the form can't be used to discover accounts.
        <Alert tone="success" title="Check your email">
          If an account exists for that address, a reset link is on its way.
        </Alert>
      ) : (
        <form noValidate onSubmit={onSubmit} className="grid gap-5">
          <TextField label="Email" type="email" required autoComplete="email" error={errors.email?.message} {...register('email')} />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" size="lg" loading={isSubmitting}>
            Send Reset Link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
