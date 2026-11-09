import type { ReactNode } from 'react';
import type { DomainError } from '../core/errors.ts';
import { explain } from './copy.ts';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <input value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />;
}

export function SelectInput({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <select value={value} onChange={event => onChange(event.target.value)}>{children}</select>;
}

export function Errors({ errors }: { errors: DomainError[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="banner bad" role="alert" data-testid="errors">
      <strong>Δεν αποθηκεύτηκε</strong>
      <ul>
        {errors.map(error => <li key={`${error.code}-${error.message}`}>{explain(error.message)}</li>)}
      </ul>
    </div>
  );
}

export function Submit({ children, busy }: { children: ReactNode; busy: boolean }) {
  return <button className="primary" type="submit" disabled={busy}>{children}</button>;
}
