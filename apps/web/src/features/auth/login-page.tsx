import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@teamflow/shared';
import { Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api';

import { useLogin } from './api';
import { AuthLayout } from './auth-layout';

const DEMO = { email: 'demo@teamflow.local', password: 'Demo1234!' };
const SHOW_DEMO_HINT = import.meta.env.VITE_SHOW_DEMO_HINT !== 'false';

export function LoginPage() {
  const login = useLogin();
  const [params] = useSearchParams();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => login.mutate(values));

  return (
    <AuthLayout
      title="Vítejte zpět"
      subtitle={
        <>
          Nemáte účet?{' '}
          <Link
            to={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next') ?? '')}` : ''}`}
            className="font-semibold text-primary hover:underline"
          >
            Zaregistrujte se
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        {login.isError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
          >
            {errorMessage(login.error)}
          </div>
        ) : null}
        <FormField label="E-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="email" autoFocus placeholder="jana@firma.cz" {...form.register('email')} />
        </FormField>
        <FormField label="Heslo" error={errors.password?.message}>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...form.register('password')}
          />
        </FormField>
        <Button type="submit" size="lg" className="mt-2 w-full" loading={login.isPending}>
          Přihlásit se
        </Button>
      </form>

      {SHOW_DEMO_HINT ? (
        <div className="mt-8 rounded-xl border border-dashed border-border-strong bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0 flex-1 text-[13px]">
              <p className="font-bold">Lokální demo účet</p>
              <p className="mt-0.5 text-muted-foreground">
                <span className="font-mono">{DEMO.email}</span> · <span className="font-mono">{DEMO.password}</span>
              </p>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1 h-auto text-[13px]"
                onClick={() => {
                  form.setValue('email', DEMO.email, { shouldValidate: true });
                  form.setValue('password', DEMO.password, { shouldValidate: true });
                }}
              >
                Vyplnit přihlašovací údaje
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AuthLayout>
  );
}
