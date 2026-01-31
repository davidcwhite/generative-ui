import { useState } from 'react';

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
    <div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      <h3 className="m-0 px-4 py-3 text-sm font-semibold bg-stone-100 border-b border-stone-200 text-stone-700">
        {title}
      </h3>
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
        {fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-stone-500">
              {field.label}
            </label>
            {field.type === 'select' ? (
              <select
                value={values[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="px-3 py-2.5 text-sm border border-stone-300 rounded-md outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
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
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                className="px-3 py-2.5 text-sm border border-stone-300 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          className="mt-2 px-6 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
