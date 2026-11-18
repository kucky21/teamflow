import { zodResolver } from '@hookform/resolvers/zod';
import { AVATAR_COLORS, changePasswordSchema, personNameSchema } from '@teamflow/shared';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { UserAvatar } from '@/components/domain/user-avatar';
import { PageContainer, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { FormField, Label } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useChangePassword, useCurrentUser, useUpdateProfile } from '@/features/auth/api';
import { ApiError, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { applyServerErrors } from '@/lib/forms';
import { type ThemePreference, useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

const profileSchema = z.object({ name: personNameSchema, avatarColor: z.enum(AVATAR_COLORS) });

export function SettingsPage() {
  return (
    <PageContainer className="max-w-3xl">
      <PageHeader title="Nastavení účtu" description="Profil, zabezpečení a vzhled aplikace." />
      <div className="mt-6 grid gap-5">
        <ProfileCard />
        <PasswordCard />
        <AppearanceCard />
      </div>
    </PageContainer>
  );
}

function ProfileCard() {
  const user = useCurrentUser();
  const update = useUpdateProfile();
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      avatarColor: (AVATAR_COLORS as readonly string[]).includes(user.avatarColor)
        ? (user.avatarColor as (typeof AVATAR_COLORS)[number])
        : AVATAR_COLORS[0],
    },
  });
  const [name, avatarColor] = useWatch({ control: form.control, name: ['name', 'avatarColor'] });

  return (
    <Card>
      <CardHeader title="Profil" description={`Člen od ${formatDate(user.createdAt)}`} />
      <form
        noValidate
        className="grid gap-5 p-5"
        onSubmit={form.handleSubmit((values) =>
          update.mutate(values, {
            onSuccess: (res) => {
              toast.success('Profil byl uložen.');
              form.reset({ name: res.user.name, avatarColor: values.avatarColor });
            },
            onError: (e) => {
              if (!applyServerErrors(e, form.setError, ['name', 'avatarColor'])) toast.error(errorMessage(e));
            },
          }),
        )}
      >
        <div className="flex items-center gap-4">
          <UserAvatar user={{ name: name || user.name, avatarColor }} size="lg" />
          <div className="grid gap-1.5">
            <Label>Barva avataru</Label>
            <div role="radiogroup" aria-label="Barva avataru" className="flex gap-1.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={avatarColor === c}
                  aria-label={c}
                  onClick={() => form.setValue('avatarColor', c, { shouldDirty: true })}
                  className={cn(
                    'size-6 rounded-full ring-offset-2 ring-offset-surface',
                    avatarColor === c && 'ring-2 ring-foreground/60',
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Jméno a příjmení" error={form.formState.errors.name?.message}>
            <Input autoComplete="name" {...form.register('name')} />
          </FormField>
          <FormField label="E-mail" hint="E-mail slouží k přihlášení a nelze ho změnit.">
            <Input value={user.email} disabled readOnly />
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={update.isPending} disabled={!form.formState.isDirty}>
            Uložit profil
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const change = useChangePassword();
  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });
  const { errors } = form.formState;

  return (
    <Card>
      <CardHeader title="Heslo" description="Po změně hesla budete odhlášeni ze všech ostatních zařízení." />
      <form
        noValidate
        className="grid gap-4 p-5"
        onSubmit={form.handleSubmit((values) =>
          change.mutate(values, {
            onSuccess: () => {
              toast.success('Heslo bylo změněno.');
              form.reset();
            },
            onError: (e) => {
              if (e instanceof ApiError && e.code === 'INVALID_PASSWORD') {
                form.setError('currentPassword', { message: e.message });
              } else if (!applyServerErrors(e, form.setError, ['currentPassword', 'newPassword'])) {
                toast.error(errorMessage(e));
              }
            },
          }),
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Současné heslo" error={errors.currentPassword?.message}>
            <Input type="password" autoComplete="current-password" {...form.register('currentPassword')} />
          </FormField>
          <FormField label="Nové heslo" error={errors.newPassword?.message} hint="Alespoň 8 znaků, písmeno a číslice.">
            <Input type="password" autoComplete="new-password" {...form.register('newPassword')} />
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={change.isPending}>
            Změnit heslo
          </Button>
        </div>
      </form>
    </Card>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Světlý', icon: Sun },
  { value: 'dark', label: 'Tmavý', icon: Moon },
  { value: 'system', label: 'Podle systému', icon: Monitor },
];

function AppearanceCard() {
  const { preference, setPreference } = useTheme();
  return (
    <Card>
      <CardHeader title="Vzhled" description="Volba se ukládá v tomto prohlížeči." />
      <div role="radiogroup" aria-label="Motiv" className="grid gap-3 p-5 sm:grid-cols-3">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={preference === value}
            onClick={() => setPreference(value)}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 text-left text-[13.5px] font-semibold transition-colors',
              preference === value
                ? 'border-primary bg-primary-soft text-primary-soft-foreground'
                : 'border-border hover:bg-accent',
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
    </Card>
  );
}
