import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest } from '../../api';
import { PageShell } from '../../components/layout/PageShell';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

type FormValues = z.infer<typeof schema>;

export function AdminResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const token = searchParams.get('token');

  if (!token) {
    return (
      <PageShell title="Invalid Link" description="The password reset link is invalid or expired.">
        <section className="section">
          <div className="container text-center">
            <div className="card" style={{ maxWidth: '450px', margin: '0 auto' }}>
              <p style={{ color: 'var(--color-error)' }}>Missing password reset token.</p>
              <div style={{ marginTop: '24px' }}>
                <a href="/admin/login" className="button button-outline" style={{ display: 'inline-block', width: '100%' }}>
                  Back to Login
                </a>
              </div>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setError('');
      await apiRequest('/api/v1/auth/admin/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: token,
          new_password: values.password
        })
      }, { skipAuth: true, allowRetry: false });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. The link may have expired.');
    }
  };

  return (
    <PageShell title="Reset Admin Password" description="Enter your new password to regain admin access.">
      <section className="section">
        <div className="container">
          <div className="card form-card" style={{ maxWidth: '450px', margin: '0 auto' }}>
            {success ? (
              <div className="text-center">
                <p style={{ color: 'var(--color-success)', fontWeight: '600', fontSize: '1.1rem' }}>
                  Password Reset Successful!
                </p>
                <p style={{ marginTop: '16px', color: 'var(--color-text-muted)' }}>
                  Your password has been updated. You can now log in using your new credentials.
                </p>
                <div style={{ marginTop: '24px' }}>
                  <button onClick={() => navigate('/admin/login')} className="button button-primary" style={{ width: '100%' }}>
                    Go to Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="form-group">
                  <label htmlFor="password" style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>New Password</label>
                  <input type="password" id="password" {...register('password')} />
                  {errors.password && <p className="error-text" style={{ color: 'var(--color-error)', marginTop: '4px' }}>{errors.password.message}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword" style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Confirm New Password</label>
                  <input type="password" id="confirmPassword" {...register('confirmPassword')} />
                  {errors.confirmPassword && <p className="error-text" style={{ color: 'var(--color-error)', marginTop: '4px' }}>{errors.confirmPassword.message}</p>}
                </div>
                <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: '8px' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Resetting...' : 'Update Password'}
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
