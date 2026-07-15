import type { Metadata } from 'next';
import LegalPage from '../components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy | Udharwale',
  description: 'Privacy Policy for Udharwale, a personal digital debt ledger and khata book app.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="July 15, 2026"
      intro="Udharwale is designed as a personal ledger for tracking money you gave, money you got, settlements, and contact-level balances. This policy explains what information the app uses and how it is handled."
      sections={[
        {
          title: 'Information We Collect',
          body: [
            'When you create an account, Udharwale stores your name, email address, password hash, recovery PIN hash, and recovery answer hash.',
            'When you use the ledger, the app stores contact names, phone numbers, optional emails, transaction amounts, transaction type, remarks, dates, and payment mode.',
            'If you use contact import on a supported browser, selected contact names and phone numbers are imported only after you choose them from your device prompt.',
          ],
        },
        {
          title: 'How We Use Information',
          body: [
            'Your information is used to authenticate your account, display your ledger, calculate balances, generate summaries, and support exports or WhatsApp reminders you choose to create.',
            'Udharwale does not sell your personal ledger data or use it for advertising.',
          ],
        },
        {
          title: 'Storage and Security',
          body: [
            'Ledger and account data is stored in the application database and scoped to your authenticated user account.',
            'Passwords, recovery PINs, and recovery answers are stored as hashes rather than plain text. You are still responsible for choosing strong credentials and keeping your account private.',
          ],
        },
        {
          title: 'Sharing and Exports',
          body: [
            'The app can generate WhatsApp messages, CSV files, JSON backups, printable reports, and copied summaries. These actions happen only when you choose them.',
            'Once you share or download exported ledger data, you are responsible for where that copy is stored or sent.',
          ],
        },
        {
          title: 'Data Deletion',
          body: [
            'The Settings area includes a wipe action that deletes your ledger data. Deletions are intended to be permanent.',
            'If account deletion is added later, it should remove both user profile data and ledger data connected to that account.',
          ],
        },
        {
          title: 'Contact',
          body: [
            'For questions about this policy, contact the Udharwale maintainer, Naeem Navjivan, through the project or deployment channel where you access the app.',
          ],
        },
      ]}
    />
  );
}
