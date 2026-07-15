import type { Metadata } from 'next';
import LegalPage from '../components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service | Udharwale',
  description: 'Terms of Service for Udharwale, a personal digital debt ledger and khata book app.',
};

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      effectiveDate="July 15, 2026"
      intro="These terms describe the basic rules for using Udharwale. By using the app, you agree to use it responsibly and understand that it is a personal record-keeping tool, not a financial institution."
      sections={[
        {
          title: 'Use of the Service',
          body: [
            'Udharwale helps you record personal balances, shared expenses, loans, settlements, and reminders. You are responsible for the accuracy of the entries you create.',
            'You should not use Udharwale for unlawful activity, harassment, fraud, or storing information you do not have permission to store.',
          ],
        },
        {
          title: 'No Financial or Legal Advice',
          body: [
            'Udharwale is a ledger and reminder tool. It does not verify debts, enforce payments, provide lending services, or offer legal, tax, accounting, or financial advice.',
            'Any settlement or payment decision is between you and the other person involved.',
          ],
        },
        {
          title: 'Your Account',
          body: [
            'You are responsible for keeping your login credentials and recovery details private.',
            'If you believe your account has been accessed without permission, change your password and recovery details as soon as those settings are available.',
          ],
        },
        {
          title: 'Your Data',
          body: [
            'You retain responsibility for the ledger data you enter. You may export backups from Settings for your own records.',
            'Do not rely on Udharwale as your only record for critical financial information. Keep independent records where necessary.',
          ],
        },
        {
          title: 'Availability and Changes',
          body: [
            'The app may change, break, or become unavailable during updates, maintenance, hosting issues, or development changes.',
            'Features may be added, removed, or adjusted to improve the product or protect users.',
          ],
        },
        {
          title: 'Limitation of Liability',
          body: [
            'Udharwale is provided as-is. To the maximum extent allowed by law, the maintainer is not responsible for disputes, missed payments, lost exports, inaccurate entries, or decisions made based on app data.',
          ],
        },
      ]}
    />
  );
}
