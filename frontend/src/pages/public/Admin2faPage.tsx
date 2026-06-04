import { useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../auth/AuthProvider';
import { PageShell } from '../../components/layout/PageShell';

const schema = z.object({
  code: z.string()
    .length(6, '2FA code must be exactly 6 digits')
    .regex(/^\d+$/, '2FA code must contain only numbers')
});

type FormValues = z.infer<typeof schema>;

export function Admin2faPage() {
  const { verifyAdminCode } = useAuth();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  
  const challengeId = searchParams.get('challengeId');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  if (!challengeId) {
    return <Navigate to="/admin/login" replace />;
  }

  const onSubmit = async (values: FormValues) => {
    try {
      setError('');
      await verifyAdminCode(challengeId, values.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Try again.');
    }
  };

  return (
    <PageShell title="Two-Factor Authentication" description="Please enter the 6-digit verification code from your authenticator app.">
      <section className="section">
        <div className="container">
          <div className="card form-card" style={{ maxWidth: '400px', margin: '0 auto' }}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-group">
                <label htmlFor="code" style={{ marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>
                  Verification Code
                </label>
                <input 
                  id="code"
                  type="text" 
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  style={{ 
                    textAlign: 'center', 
                    fontSize: '1.8rem', 
                    letterSpacing: '0.2rem',
                    padding: '8px'
                  }}
                  {...register('code')} 
                />
                {errors.code && <p className="error-text" style={{ color: 'var(--color-error)', marginTop: '4px' }}>{errors.code.message}</p>}
              </div>
              <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Verify Code'}
              </button>
              {error && <p className="error-text" style={{ color: 'var(--color-error)', marginTop: '12px', textAlign: 'center' }}>{error}</p>}
            </form>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
