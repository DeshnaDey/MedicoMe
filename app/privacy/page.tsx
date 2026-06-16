import type { Metadata } from 'next'
import LegalLayout from '@/components/LegalLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Medico Me collects, uses, stores, and protects your information.',
}

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 17, 2026">
      <p>
        Medico Me (&ldquo;we&rdquo;, &ldquo;us&rdquo;) helps you keep your health records and run a
        symptom check. Because the app handles health-related information, we try to collect as
        little as possible and to be clear about what happens to it. This policy explains what we
        collect, why, and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address, and a password. We never store your password in plain text — it is hashed with bcrypt before it touches our database.</li>
        <li><strong>Health information you enter:</strong> medical records, prescriptions, test results, calendar events, and the messages you send in the chat. You decide what to add.</li>
        <li><strong>Technical data:</strong> a single session cookie to keep you signed in. We do not use advertising or third-party analytics trackers.</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To provide the core features: storing your records, scheduling, and answering symptom questions.</li>
        <li>To authenticate you and keep your account secure.</li>
        <li>We do <strong>not</strong> sell your data, and we do not use your health information to train AI models.</li>
      </ul>

      <h2>AI processing</h2>
      <p>
        The guided symptom triage runs on our own servers using fixed rules. When you type a
        <strong> free-text</strong> question in the chat, we send the relevant context (your message,
        recent chat turns, and a summary of your records) to a third-party AI provider so it can
        generate a response. That provider processes the text to return an answer and is not
        permitted to use it to train its models. <strong>Please avoid entering information you would
        not want processed by a third party,</strong> and remember the assistant&rsquo;s replies are
        informational only — see our <a href="/disclaimer">Medical Disclaimer</a>.
      </p>

      <h2>Storage and security</h2>
      <ul>
        <li>Your data is stored in a managed PostgreSQL database (hosted on Supabase).</li>
        <li>All traffic between your browser and our servers is encrypted in transit over HTTPS.</li>
        <li>Access is scoped to your account: every request is checked against your session, and queries are filtered to your user id.</li>
      </ul>

      <h2>Data retention and deletion</h2>
      <p>
        We keep your data until you remove it. Inside the app, <strong>Reset data</strong> in
        Settings permanently erases your records, calendar events, and chat sessions while keeping
        your account. To delete your account and all associated data, contact us at the address
        below.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access and correct your information at any time within the app, and you can request
        a copy or full deletion of your data by contacting us. Depending on where you live, you may
        have additional rights under laws such as the GDPR or CCPA.
      </p>

      <h2>Children</h2>
      <p>
        Medico Me is not intended for anyone under 16. We do not knowingly collect information from
        children.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as the product evolves. Material changes will be reflected by the
        &ldquo;Last updated&rdquo; date above.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email <a href="mailto:privacy@medicome.app">privacy@medicome.app</a>.
      </p>
    </LegalLayout>
  )
}
