'use client';

import { Fragment, useMemo, useState } from 'react';
import { ShieldCheck, RotateCcw, Save, Info, Crown } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader, ButtonLoader } from '@/components/ui/loaders';
import Checkbox from '@/components/ui/Checkbox';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';

type SubjectKey = 'STUDENT' | 'COLLABORATOR_TUTOR' | 'COLLABORATOR_SECRETARY';

interface CapabilityRowData {
  key: string;
  area: string;
  label: string;
  description: string | null;
  enabled: Record<SubjectKey, boolean>;
  defaults: Record<SubjectKey, boolean>;
}

const cellKey = (subject: SubjectKey, capability: string) => `${subject}::${capability}`;

function ConfirmResetDialog({
  open,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className={`w-full max-w-md rounded-xl ${colors.background.card} ${colors.effects.shadow.xl} border ${colors.border.primary} p-6`}>
        <h3 className={`text-lg font-semibold ${colors.text.primary}`}>Ripristinare i valori predefiniti?</h3>
        <p className={`mt-2 text-sm ${colors.text.secondary}`}>
          Verranno rimosse tutte le personalizzazioni e ogni ruolo tornerà alle abilitazioni predefinite del sistema. L&apos;operazione non è reversibile.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${colors.text.secondary} ${colors.background.secondary} ${colors.effects.hover.bg} transition-colors disabled:opacity-50`}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <ButtonLoader loading={loading}>Ripristina</ButtonLoader>
          </button>
        </div>
      </div>
    </div>
  );
}

function MatrixCell({
  checked,
  differsFromDefault,
  readOnly,
  ariaLabel,
  onChange,
}: {
  checked: boolean;
  differsFromDefault?: boolean;
  readOnly?: boolean;
  ariaLabel: string;
  onChange?: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-1">
      <Checkbox
        checked={checked}
        disabled={readOnly}
        aria-label={ariaLabel}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span
        className={`h-1.5 w-1.5 rounded-full ${differsFromDefault ? 'bg-amber-500' : 'bg-transparent'}`}
        title={differsFromDefault ? 'Diverso dal valore predefinito' : undefined}
        aria-hidden
      />
    </div>
  );
}

export default function AdminPermessiContent() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  const { data, isLoading, refetch } = trpc.permissions.getMatrix.useQuery();
  const [edits, setEdits] = useState<Record<string, boolean>>({});
  const [confirmReset, setConfirmReset] = useState(false);

  const setMutation = trpc.permissions.setCapabilities.useMutation({
    onError: handleMutationError,
    onSuccess: async () => {
      showSuccess('Permessi aggiornati', 'Le abilitazioni sono state salvate.');
      setEdits({});
      await refetch();
    },
  });

  const resetMutation = trpc.permissions.resetToDefaults.useMutation({
    onError: handleMutationError,
    onSuccess: async () => {
      showSuccess('Valori predefiniti ripristinati', 'Tutte le personalizzazioni sono state rimosse.');
      setEdits({});
      setConfirmReset(false);
      await refetch();
    },
  });

  // Group capabilities by area, preserving the catalog order.
  const groups = useMemo(() => {
    const result: { area: string; caps: CapabilityRowData[] }[] = [];
    for (const cap of (data?.capabilities ?? []) as CapabilityRowData[]) {
      const last = result[result.length - 1];
      if (last && last.area === cap.area) last.caps.push(cap);
      else result.push({ area: cap.area, caps: [cap] });
    }
    return result;
  }, [data]);

  if (isLoading || !data) return <PageLoader />;

  const subjects = data.subjects as { key: SubjectKey; label: string }[];
  const pendingCount = Object.keys(edits).length;

  const currentValue = (cap: CapabilityRowData, subject: SubjectKey) =>
    edits[cellKey(subject, cap.key)] ?? cap.enabled[subject];

  const toggle = (cap: CapabilityRowData, subject: SubjectKey, next: boolean) => {
    const key = cellKey(subject, cap.key);
    setEdits((prev) => {
      const copy = { ...prev };
      if (next === cap.enabled[subject]) delete copy[key];
      else copy[key] = next;
      return copy;
    });
  };

  const onSave = () => {
    const changes = Object.entries(edits).map(([key, enabled]) => {
      const [subject, capability] = key.split('::');
      return { subject: subject as SubjectKey, capability, enabled };
    });
    if (changes.length > 0) setMutation.mutate({ changes });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors.primary.gradient} text-white`}>
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Permessi</h1>
            <p className={`text-sm ${colors.text.muted}`}>
              Configura cosa può fare ogni ruolo. Le modifiche valgono per tutti gli utenti di quel tipo.
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className={`mb-6 flex items-start gap-3 rounded-xl border ${colors.border.primary} ${colors.background.secondary} p-4`}>
        <Info className={`mt-0.5 h-5 w-5 shrink-0 ${colors.primary.text}`} />
        <p className={`text-sm ${colors.text.secondary}`}>
          Gli <strong>amministratori</strong> hanno sempre ogni permesso e non sono configurabili. Un pallino{' '}
          <span className="mx-0.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-amber-500 align-middle" /> indica un valore
          diverso da quello predefinito del sistema.
        </p>
      </div>

      {/* Matrix */}
      <div className={`overflow-x-auto rounded-xl border ${colors.border.primary} ${colors.background.card} ${colors.effects.shadow.sm}`}>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className={`sticky top-0 z-10 ${colors.background.secondary}`}>
              <th className={`px-4 py-3 text-left font-semibold ${colors.text.secondary}`}>Permesso</th>
              {subjects.map((s) => (
                <th key={s.key} className={`px-3 py-3 text-center font-semibold ${colors.text.secondary} whitespace-nowrap`}>
                  {s.label}
                </th>
              ))}
              <th className={`px-3 py-3 text-center font-semibold ${colors.text.muted} whitespace-nowrap`}>
                <span className="inline-flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  Admin
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.area}>
                <tr>
                  <td
                    colSpan={subjects.length + 2}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${colors.text.muted} ${colors.background.tertiary}`}
                  >
                    {group.area}
                  </td>
                </tr>
                {group.caps.map((cap) => (
                  <tr key={cap.key} className={`border-t ${colors.border.primary} ${colors.background.cardHover}`}>
                    <td className="px-4 py-2.5">
                      <div className={`font-medium ${colors.text.primary}`}>{cap.label}</div>
                      {cap.description && <div className={`text-xs ${colors.text.muted}`}>{cap.description}</div>}
                    </td>
                    {subjects.map((s) => {
                      const value = currentValue(cap, s.key);
                      return (
                        <td key={s.key} className="px-3">
                          <MatrixCell
                            checked={value}
                            differsFromDefault={value !== cap.defaults[s.key]}
                            ariaLabel={`${cap.label} — ${s.label}`}
                            onChange={(next) => toggle(cap, s.key, next)}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3">
                      <MatrixCell checked readOnly ariaLabel={`${cap.label} — Admin (sempre attivo)`} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sticky save bar */}
      <div className={`fixed inset-x-0 bottom-0 z-40 border-t ${colors.border.primary} ${colors.background.card} ${colors.effects.shadow.lg}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            disabled={resetMutation.isPending || setMutation.isPending}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${colors.text.secondary} ${colors.effects.hover.bg} transition-colors disabled:opacity-50`}
          >
            <RotateCcw className="h-4 w-4" />
            Ripristina default
          </button>

          <div className="flex items-center gap-4">
            <span className={`text-sm ${pendingCount > 0 ? colors.text.primary : colors.text.muted}`}>
              {pendingCount === 0
                ? 'Nessuna modifica in sospeso'
                : `${pendingCount} ${pendingCount === 1 ? 'modifica' : 'modifiche'} in sospeso`}
            </span>
            <button
              type="button"
              onClick={onSave}
              disabled={pendingCount === 0 || setMutation.isPending}
              className={`inline-flex items-center gap-2 rounded-lg ${colors.primary.bg} ${colors.primary.hover} px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <ButtonLoader loading={setMutation.isPending}>
                <span className="inline-flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Salva
                </span>
              </ButtonLoader>
            </button>
          </div>
        </div>
      </div>

      <ConfirmResetDialog
        open={confirmReset}
        loading={resetMutation.isPending}
        onConfirm={() => resetMutation.mutate({})}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
