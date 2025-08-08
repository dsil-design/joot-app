"use client";

import { Button } from '@/components/ui/button';
import { useGlobalAction } from '@/contexts/GlobalActionContext';
import { signOut } from './actions';

export function SignOutButton() {
  const { withGlobalAction } = useGlobalAction();

  const handleSignOut = async () => {
    await withGlobalAction('sign-out', async () => {
      // Add a small delay to show the global disabled state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create a form and submit it
      const form = document.createElement('form');
      form.style.display = 'none';
      document.body.appendChild(form);
      
      try {
        await signOut();
      } finally {
        document.body.removeChild(form);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleSignOut}
    >
      Sign Out
    </Button>
  );
}
