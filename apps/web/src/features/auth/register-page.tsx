import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@teamflow/shared';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ApiError, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { useRegister } from './api';
import { AuthLayout } from './auth-layout';

export function RegisterPage() {
  const register = useRegister();
  const [params] = useSearchParams();
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    register.mutate(values, {
      onError: (error) => applyServerErrors(error, form.setError, ['name', 'email', 'password']),
    }),
  );

  return (
    <AuthLayout
      title="Vytvořte si účet"
      subtitle={
        <>
          Už účet máte?{' '}
          <Link
            to={`/login${params.get('next') ? `?next=${encodeURIComponent(params.get('next') ?? '')}` : ''}`}
            className="font-semibold text-primary hover:underline"
          >
            Přihlaste se
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        {register.isError && !(register.error instanceof ApiError && register.error.details.length > 0) ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
          >
            {errorMessage(register.error)}
          </div>
        ) : null}
        <FormField label="Jméno a příjmení" error={errors.name?.message}>
          <Input autoComplete="name" autoFocus placeholder="Jana Nováková" {...form.register('name')} />
        </FormField>
        <FormField label="E-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="jana@firma.cz" {...form.register('email')} />
        </FormField>
        <FormField label="Heslo" error={errors.password?.message} hint="Alespoň 8 znaků, obsahuje písmeno a číslici.">
          <Input type="password" autoComplete="new-password" placeholder="••••••••" {...form.register('password')} />
        </FormField>
        <Button type="submit" size="lg" className="mt-2 w-full" loading={register.isPending}>
          Vytvořit účet
        </Button>
      </form>
    </AuthLayout>
  );
}
