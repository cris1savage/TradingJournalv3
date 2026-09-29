import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import ProfessionalDashboard from '@/app/dashboard/ProfessionalDashboard';

export default async function ProfessionalPage() {
  const auth = await isAuthenticated();
  if (!auth) redirect('/login');

  return <ProfessionalDashboard />;
}
