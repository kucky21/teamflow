import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouterProvider } from 'react-router/dom';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/menu';
import { createQueryClient } from '@/lib/query-client';
import { ThemeProvider } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { router } from './router';

function ThemedToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: '!rounded-lg !border-border !bg-surface-raised !text-foreground !shadow-pop !font-sans',
          description: '!text-muted-foreground',
        },
      }}
    />
  );
}

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
          <ThemedToaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
