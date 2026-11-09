import { Checkbox, Field, Input, Select } from '@/components/ui/field';
import { reasoningOptions, type CostSavingForm } from '@/lib/providers';

interface CostSavingFieldsProps {
  form: CostSavingForm;
  onChange: (form: CostSavingForm) => void;
  checkboxLabel: string;
  keySaved?: boolean;
}

/** Browser Use + Jev (1.1, 2.3): fields appear only when the box is ticked, indented under it. */
export function CostSavingFields({ form, onChange, checkboxLabel, keySaved = false }: CostSavingFieldsProps) {
  const set = (patch: Partial<CostSavingForm>) => onChange({ ...form, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <Checkbox label={<span className="font-semibold">{checkboxLabel}</span>} checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
      {form.enabled && (
        <div className="ml-2 flex flex-col gap-3 border-l-2 border-border pl-4">
          <Field label="TypeSafe API key" required={!keySaved}>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="off"
                placeholder={keySaved ? 'Saved · leave empty to keep it' : 'Enter TypeSafe API key'}
                value={form.typeSafeKey}
                onChange={(e) => set({ typeSafeKey: e.target.value })}
              />
            )}
          </Field>
          <Field label="TypeSafe model" required>
            {(p) => <Input {...p} value={form.typeSafeModel} onChange={(e) => set({ typeSafeModel: e.target.value })} />}
          </Field>
          <Field label="Text model reasoning">
            {(p) => (
              <Select {...p} value={form.reasoning} onChange={(e) => set({ reasoning: e.target.value as CostSavingForm['reasoning'] })}>
                {reasoningOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      )}
    </div>
  );
}
