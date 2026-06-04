import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageShell } from '../../components/layout/PageShell';
import { createRegistrationDraft, type RegistrationResponse } from '../../api';

const registrationSchema = z.object({
  head_name: z.string().min(2, 'Enter the family head name').max(100),
  phone: z.string().regex(/^\+?[1-9][0-9]{9,14}$/, 'Enter a valid mobile number'),
  email: z.string().email('Enter a valid email').max(254),
  address: z.string().min(10, 'Enter the full address').max(500),
  consent_terms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Terms & Conditions'
  }),
  consent_privacy: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Privacy Policy'
  }),
  family_members: z
    .array(
      z.object({
        name: z.string().min(2, 'Enter the member name').max(100),
        date_of_birth: z.string().min(1, 'Date of birth is required'),
        gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
        relationship: z.string().min(2, 'Enter the relationship').max(50)
      })
    )
    .min(1, 'Add at least one family member')
    .max(25, 'A family can include up to 25 members')
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function BecomeMemberPage() {
  const navigate = useNavigate();
  const [createdRegistration, setCreatedRegistration] = useState<RegistrationResponse | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      family_members: [{ name: '', date_of_birth: '', gender: 'male', relationship: 'Self' }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'family_members' });

  const onSubmit = async (values: RegistrationFormValues) => {
    try {
      setCheckoutError('');
      const result = await createRegistrationDraft({
        head_name: values.head_name,
        phone: values.phone,
        email: values.email,
        address: values.address,
        family_members: values.family_members.map(member => ({
          name: member.name,
          date_of_birth: member.date_of_birth,
          gender: member.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say',
          relationship: member.relationship
        })),
        consent_version: 'v1.0',
        consent_terms: values.consent_terms,
        consent_privacy: values.consent_privacy
      });
      setCreatedRegistration(result);
    } catch (err) {
      setCheckoutError('Failed to create registration. Please try again.');
    }
  };

  const openCheckout = async () => {
    if (!createdRegistration) return;
    const payment = createdRegistration.data.payment;
    setIsOpeningCheckout(true);
    try {
      if (!window.Razorpay) {
        throw new Error('Razorpay is not loaded');
      }
      const checkout = new window.Razorpay({
        key: payment.checkout_key_id,
        amount: Math.round(Number(payment.amount) * 100),
        currency: payment.currency,
        name: 'Kumbhad Samaj Trust',
        description: `Membership ${createdRegistration.data.membership_number}`,
        order_id: payment.provider_order_id,
        handler: () => navigate(`/registration/status/${payment.payment_id}`),
        prefill: {
          name: getValues().head_name,
          email: getValues().email,
          contact: getValues().phone
        },
        notes: {
          membership_id: createdRegistration.data.membership_id
        },
        modal: { ondismiss: () => navigate(`/registration/status/${payment.payment_id}`) },
        theme: { color: '#1e3a8a' }
      });
      checkout.open();
    } catch (err) {
      setCheckoutError('Unable to open payment gateway.');
    } finally {
      setIsOpeningCheckout(false);
    }
  };

  return (
    <PageShell title="Become a Member" description="Join the Kumbhad Samaj Trust family today.">
      <section className="section section-alt">
        <div className="container">
          {!createdRegistration ? (
            <div className="card form-card">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label>Family Head Name</label>
                    <input {...register('head_name')} />
                    {errors.head_name && <p className="error-text">{errors.head_name.message}</p>}
                  </div>
                  <div className="form-group">
                    <label>Mobile Number</label>
                    <input type="tel" {...register('phone')} />
                    {errors.phone && <p className="error-text">{errors.phone.message}</p>}
                  </div>
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" {...register('email')} />
                  {errors.email && <p className="error-text">{errors.email.message}</p>}
                </div>
                <div className="form-group">
                  <label>Home Address</label>
                  <textarea rows={3} {...register('address')} />
                  {errors.address && <p className="error-text">{errors.address.message}</p>}
                </div>

                <div style={{ marginTop: '32px', marginBottom: '16px' }}>
                  <h3>Family Members</h3>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="card" style={{ marginBottom: '16px', background: '#f8fafc' }}>
                    <div className="grid grid-2">
                      <div className="form-group">
                        <label>Name</label>
                        <input {...register(`family_members.${index}.name`)} />
                      </div>
                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input type="date" {...register(`family_members.${index}.date_of_birth`)} />
                      </div>
                      <div className="form-group">
                        <label>Gender</label>
                        <select {...register(`family_members.${index}.gender`)}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Relationship</label>
                        <input {...register(`family_members.${index}.relationship`)} />
                      </div>
                    </div>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)} className="button button-outline" style={{ color: 'red', borderColor: 'red' }}>Remove</button>
                    )}
                  </div>
                ))}

                <button type="button" onClick={() => append({ name: '', date_of_birth: '', gender: 'male', relationship: '' })} className="button button-outline mb-8">Add Family Member</button>

                <div className="form-group" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <input type="checkbox" {...register('consent_terms')} style={{ width: 'auto', marginTop: '4px' }} />
                  <label style={{ fontWeight: 400 }}>
                    I agree to the <Link to="/terms" target="_blank">Terms & Conditions</Link>.
                  </label>
                </div>
                {errors.consent_terms && <p className="error-text" style={{ marginBottom: '16px' }}>{errors.consent_terms.message}</p>}

                <div className="form-group" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <input type="checkbox" {...register('consent_privacy')} style={{ width: 'auto', marginTop: '4px' }} />
                  <label style={{ fontWeight: 400 }}>
                    I agree to the <Link to="/privacy" target="_blank">Privacy Policy</Link>.
                  </label>
                </div>
                {errors.consent_privacy && <p className="error-text" style={{ marginBottom: '16px' }}>{errors.consent_privacy.message}</p>}

                <button type="submit" className="button button-primary" style={{ width: '100%' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Review & Pay'}
                </button>
              </form>
            </div>
          ) : (
            <div className="card text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2>Review Registration</h2>
              <div style={{ margin: '32px 0', textAlign: 'left' }}>
                <p><strong>Membership No:</strong> {createdRegistration.data.membership_number}</p>
                <p><strong>Total Fee:</strong> {createdRegistration.data.payment.currency} {createdRegistration.data.payment.amount}</p>
                <p><strong>Validity:</strong> 1 Year from activation</p>
              </div>
              <button 
                onClick={openCheckout} 
                className="button button-accent" 
                style={{ width: '100%' }}
                disabled={isOpeningCheckout}
              >
                {isOpeningCheckout ? 'Opening Razorpay...' : 'Pay Now'}
              </button>
              <p style={{ marginTop: '16px', fontSize: '0.85rem' }}>
                By clicking Pay Now, you agree to our <Link to="/refund">Refund Policy</Link>.
              </p>
            </div>
          )}
          {checkoutError && <p className="error-text text-center mt-4">{checkoutError}</p>}
        </div>
      </section>
    </PageShell>
  );
}
