import { notFound } from 'next/navigation';
import { AuthDebugClient } from './auth-debug-client';

export default function AuthDebugPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <AuthDebugClient />;
}
