import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const auth = await isAuthenticated();
  if (!auth) redirect('/login');
  return <DashboardClient />;
}
