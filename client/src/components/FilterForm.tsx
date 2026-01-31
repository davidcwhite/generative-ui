import React, { useState } from 'react';

interface Field {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  options?: string[];
  defaultValue?: string;
}

interface FilterFormProps {
  title: string;
  fields: Field[];
  onSubmit: (values: Record<string, string>) => void;
}

export function FilterForm({ title, fields, onSubmit }: FilterFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((field) => {
      initial[field.key] = field.defaultValue || '';
    });
    return initial;
  });

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{title}</h3>
      <form onSubmit={handleSubmit} style={styles.form}>
        {fields.map((field) => (
          <div key={field.key} style={styles.field}>
            <label style={styles.label}>{field.label}</label>
            {field.type === 'select' ? (
              <select
                value={values[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                style={styles.select}
              >
                <option value="">Select...</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                value={values[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                style={styles.input}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
              />
            )}
          </div>
        ))}
        <button type="submit" style={styles.button}>
          Submit
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '12px',
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  title: {
    margin: 0,
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 600,
    background: '#e3f2fd',
    borderBottom: '1px solid #bbdefb',
    color: '#1565c0',
  },
  form: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    background: '#fff',
  },
  button: {
    marginTop: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
