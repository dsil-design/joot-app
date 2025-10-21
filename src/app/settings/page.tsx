import { redirect } from 'next/navigation'

export default function SettingsPage() {
  // Redirect to payment methods as the default settings page
  redirect('/settings/payment-methods')
}
