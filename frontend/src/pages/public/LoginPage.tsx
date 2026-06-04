import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../auth/AuthProvider';
import { PageShell } from '../../components/layout/PageShell';

export function MemberLoginPage() {
  const { beginMemberLogin, status } = useAuth();
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setError('');
      await beginMemberLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <PageShell title="Member Login" description="Access your family membership portal securely with Google.">
      <section className="section">
        <div className="container text-center">
          <div className="card" style={{ maxWidth: '450px', margin: '0 auto' }}>
            <p className="mb-8">Use your registered Google account to view membership details, certificates, and renewal options.</p>
            <button
              className="button button-primary"
              style={{ width: '100%', gap: '12px' }}
              onClick={handleLogin}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Checking session...' : 'Continue with Google'}
            </button>
            {error && <p className="error-text mt-4">{error}</p>}
            <p style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Not a member yet? <a href="/become-member">Register here</a>
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

const adminSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required')
});

export function AdminLoginPage() {
  const { beginAdminLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema)
  });

  const onSubmit = async (values: z.infer<typeof adminSchema>) => {
    try {
      setError('');
      const result = await beginAdminLogin(values.email, values.password);
      if (result.two_factor_required) {
        navigate(`/admin/2fa?challengeId=${encodeURIComponent(result.challenge_id!)}`);
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <PageShell title="Admin Portal" description="Authorized Trust administrator access only.">
      <section className="section">
        <div className="container">
          <div className="card form-card" style={{ maxWidth: '400px' }}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-group">
                <label>Administrator Email</label>
                <input type="email" {...register('email')} />
                {errors.email && <p className="error-text">{errors.email.message}</p>}
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" {...register('password')} />
                {errors.password && <p className="error-text">{errors.password.message}</p>}
              </div>
              <button type="submit" className="button button-primary" style={{ width: '100%' }} disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Sign In'}
              </button>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <a href="/admin/forgot-password" style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                  Forgot Password?
                </a>
              </div>
              {error && <p className="error-text mt-4">{error}</p>}
            </form>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
