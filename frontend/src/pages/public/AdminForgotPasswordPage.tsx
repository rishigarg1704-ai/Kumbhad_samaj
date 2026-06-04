import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest } from '../../api';
import { PageShell } from '../../components/layout/PageShell';

const schema = z.object({
  email: z.string().email('Enter a valid email')
});

type FormValues = z.infer<typeof schema>;

export function AdminForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setError('');
      await apiRequest('/api/v1/auth/admin/forgot-password', {
        method: 'POST',
        body: JSON.stringify(values)
      }, { skipAuth: true, allowRetry: false });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <PageShell title="Recover Admin Password" description="Request a password reset link for your administrator account.">
      <section className="section">
        <div className="container">
          <div className="card form-card" style={{ maxWidth: '450px', margin: '0 auto' }}>
            {success ? (
              <div className="text-center">
                <p style={{ color: 'var(--color-success)', fontWeight: '600', fontSize: '1.1rem' }}>
                  Recovery Link Sent!
                </p>
                <p style={{ marginTop: '16px', color: 'var(--color-text-muted)' }}>
                  If the email address is registered, you will receive a password reset link shortly. Please check your inbox (including your spam folder).
                </p>
                <div style={{ marginTop: '24px' }}>
                  <a href="/admin/login" className="button button-outline" style={{ width: '100%' }}>
                    Back to Login
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                <p style={{ marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                  Enter your registered administrator email address and we will send you a password reset link.
                </p>
                <div className="form-group">
                  <label htmlFor="email" style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Email Address</label>
                  <input type="email" id="email" {...register('email')} />
                  {errors.email && <p className="error-text" style={{ color: 'var(--color-error)', marginTop: '4px' }}>{errors.email.message}</p>}
                </div>
                <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: '8px' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Recovery Link'}
                </button>
                {error && <p className="error-text" style={{ color: 'var(--color-error)', marginTop: '12px', textAlign: 'center' }}>{error}</p>}
              </form>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
