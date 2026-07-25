import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useWorkspaceTarget } from '@/blocks/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type PrototypeId = 'curated' | 'configurable' | 'workbench' | 'shadcn_issuance';
export type Density = 'comfortable' | 'compact';

export interface PrototypeOption {
  id: PrototypeId;
  label: string;
  description: string;
  /** Prototypes opt into their own page canvas. */
  canvas: 'white' | 'warm';
}

export const PROTOTYPES: PrototypeOption[] = [
  {
    id: 'curated',
    label: 'Curated overview',
    description: 'Responsive CSS Grid, strongest default hierarchy',
    canvas: 'warm',
  },
  {
    id: 'configurable',
    label: 'Configurable workspace',
    description: 'React Grid Layout, explicit edit mode',
    canvas: 'warm',
  },
  {
    id: 'workbench',
    label: 'Data workbench',
    description: 'AG Grid, dense analytical workflow',
    canvas: 'warm',
  },
  {
    id: 'shadcn_issuance',
    label: 'ShadCN issuance',
    description: 'ShadCN charts, cross-filtered AG Grid',
    canvas: 'white',
  },
];

export interface DisplayPrefs {
  density: Density;
  showSectorMix: boolean;
  showDetailPanel: boolean;
}

const DEFAULT_PREFS: DisplayPrefs = {
  density: 'comfortable',
  showSectorMix: true,
  showDetailPanel: true,
};

const STORAGE_KEY = 'dashboard-chrome-v1';

interface ChromeValue {
  prototype: PrototypeOption;
  setPrototype: (id: PrototypeId) => void;
  prefs: DisplayPrefs;
  setPrefs: (patch: Partial<DisplayPrefs>) => void;
}

const ChromeContext = createContext<ChromeValue | null>(null);

interface StoredChrome {
  prototypeId?: PrototypeId;
  prefs?: Partial<DisplayPrefs>;
}

function readStored(): StoredChrome {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredChrome) : {};
  } catch {
    return {};
  }
}

export function DashboardChromeProvider({ children }: { children: ReactNode }) {
  const [prototypeId, setPrototypeId] = useState<PrototypeId>(() => {
    const stored = readStored().prototypeId;
    return PROTOTYPES.some((item) => item.id === stored) ? stored! : 'shadcn_issuance';
  });
  const [prefs, setPrefsState] = useState<DisplayPrefs>(() => ({
    ...DEFAULT_PREFS,
    ...readStored().prefs,
  }));

  // Blocks live in the Shadcn dashboard, so a chat deep link has to land there
  // whichever prototype the user last had open.
  const workspaceTarget = useWorkspaceTarget();
  useEffect(() => {
    if (workspaceTarget) setPrototypeId('shadcn_issuance');
  }, [workspaceTarget]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ prototypeId, prefs }));
    } catch {
      // A full or blocked store shouldn't break the dashboard.
    }
  }, [prefs, prototypeId]);

  const setPrefs = useCallback(
    (patch: Partial<DisplayPrefs>) => setPrefsState((current) => ({ ...current, ...patch })),
    [],
  );

  const value = useMemo<ChromeValue>(
    () => ({
      prototype: PROTOTYPES.find((item) => item.id === prototypeId) ?? PROTOTYPES[0],
      setPrototype: setPrototypeId,
      prefs,
      setPrefs,
    }),
    [prefs, prototypeId, setPrefs],
  );

  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useDashboardChrome() {
  const value = useContext(ChromeContext);
  if (!value) throw new Error('useDashboardChrome must be used inside DashboardChromeProvider');
  return value;
}

/**
 * The only piece of prototype chrome on the page. Every control applies
 * immediately, so the menu has no save step.
 */
export function DashboardSettingsButton({ className = '' }: { className?: string }) {
  const { prototype, setPrototype, prefs, setPrefs } = useDashboardChrome();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Dashboard settings"
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 data-[state=open]:bg-stone-100 data-[state=open]:text-stone-700 ${className}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Dashboard</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={prototype.id}
          onValueChange={(value) => setPrototype(value as PrototypeId)}
        >
          {PROTOTYPES.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id} className="items-start py-2">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium text-stone-800">{item.label}</span>
                <span className="text-[10px] leading-4 text-stone-400">{item.description}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Display</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={prefs.density}
          onValueChange={(value) => setPrefs({ density: value as Density })}
        >
          <DropdownMenuRadioItem value="comfortable">Comfortable rows</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="compact">Compact rows</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          checked={prefs.showSectorMix}
          onCheckedChange={(checked) => setPrefs({ showSectorMix: checked })}
          onSelect={(event) => event.preventDefault()}
        >
          Sector mix
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={prefs.showDetailPanel}
          onCheckedChange={(checked) => setPrefs({ showDetailPanel: checked })}
          onSelect={(event) => event.preventDefault()}
        >
          Detail panel
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
