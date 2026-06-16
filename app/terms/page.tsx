import type { Metadata } from 'next'
import LegalLayout from '@/components/LegalLayout'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of the Medico Me prototype.',
}

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="June 17, 2026">
      <p>
        These terms govern your use of Medico Me (the &ldquo;Service&rdquo;). By creating an account
        or using the Service, you agree to them. If you do not agree, please do not use the Service.
      </p>

      <h2>Not medical advice</h2>
      <p>
        Medico Me provides general health information and an automated symptom check. It is{' '}
        <strong>not</strong> a medical device and does not provide medical advice, diagnosis, or
        treatment, and using it does not create a doctor–patient relationship. Always consult a
        qualified clinician. See our <a href="/disclaimer">Medical Disclaimer</a> for details.
      </p>

      <h2>Eligibility</h2>
      <p>You must be at least 16 years old and able to form a binding agreement to use the Service.</p>

      <h2>Your account</h2>
      <ul>
        <li>You are responsible for the accuracy of the information you provide and for keeping your password confidential.</li>
        <li>You are responsible for activity that happens under your account. Notify us promptly of any unauthorized use.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for unlawful purposes or to upload content you do not have the right to share.</li>
        <li>Attempt to access other users&rsquo; data, probe or breach security, or disrupt the Service.</li>
        <li>Rely on the Service for emergencies or as a substitute for professional care.</li>
      </ul>

      <h2>Availability and changes</h2>
      <p>
        Medico Me is an evolving prototype. We may add, change, or remove features, and the Service
        may be unavailable from time to time. We may update these terms; continued use after an
        update means you accept the revised terms.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
        warranties of any kind, whether express or implied, including fitness for a particular
        purpose and non-infringement. We do not warrant that the Service or any health information
        it surfaces is accurate, complete, or error-free.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Medico Me and its creators will not be liable for any
        indirect, incidental, or consequential damages, or for any decisions made in reliance on the
        Service.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time. We may suspend or
        terminate access if these terms are violated.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href="mailto:support@medicome.app">support@medicome.app</a>.
      </p>
    </LegalLayout>
  )
}
