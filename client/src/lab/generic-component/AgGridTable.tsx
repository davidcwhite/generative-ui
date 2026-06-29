/**
 * ag-grid-backed renderer for the contract's `table` body. Gives sortable,
 * resizable, virtualized rows with a sticky header and row hover, themed to the
 * stone palette via the Theming API (no legacy CSS imports).
 *
 * Portability note: this file adds `ag-grid-react` + `ag-grid-community` to the
 * folder's dependency surface. The rest of the generic component does not need
 * ag-grid — only this body renderer does.
 */

import { useMemo } from 'react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellStyle,
  type ColDef,
  type ValueFormatterParams,
  type ValueGetterParams,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { TableBody, TableCell, Tone } from './contract';
import { formatValue, type FormatOptions } from './formatValue';

// Register once at module load, before any grid is instantiated.
ModuleRegistry.registerModules([AllCommunityModule]);

/** Quartz tuned to the stone palette so the grid matches the rest of the UI. */
const stoneTheme = themeQuartz.withParams({
  accentColor: '#292524', // stone-800
  backgroundColor: '#ffffff',
  foregroundColor: '#1c1917', // stone-900
  borderColor: '#e7e5e4', // stone-200
  headerBackgroundColor: '#fafaf9', // stone-50
  headerTextColor: '#78716c', // stone-500
  headerFontSize: 11,
  headerFontWeight: 600,
  fontFamily: 'inherit',
  fontSize: 13,
  rowHoverColor: '#f5f5f4', // stone-100
  oddRowBackgroundColor: '#ffffff',
  rowBorder: true,
  columnBorder: false,
  wrapperBorder: false,
  cellHorizontalPadding: 12,
  headerHeight: 40,
  rowHeight: 44,
});

const TONE_COLOR: Record<Tone, string> = {
  positive: '#059669', // emerald-600
  negative: '#e11d48', // rose-600
  warning: '#d97706', // amber-600
  neutral: '#78716c', // stone-500
};

interface RowShape {
  __emphasis: boolean;
  [field: string]: TableCell | boolean;
}

function unwrap(cell: TableCell | undefined): string | number | undefined {
  if (cell == null) return undefined;
  return typeof cell === 'object' ? cell.value : cell;
}

function toneOf(cell: TableCell | undefined): Tone | undefined {
  return cell != null && typeof cell === 'object' ? cell.tone : undefined;
}

export function AgGridTable({
  body,
  fmt,
  reduced,
}: {
  body: TableBody;
  fmt: FormatOptions;
  reduced: boolean;
}) {
  const columnDefs = useMemo<ColDef<RowShape>[]>(() => {
    return body.columns.map((col, i) => {
      const field = `c${i}`;
      return {
        headerName: col.label,
        field,
        type: col.numeric ? 'rightAligned' : undefined,
        flex: 1,
        minWidth: col.numeric ? 96 : 140,
        sortable: true,
        resizable: true,
        valueGetter: (p: ValueGetterParams<RowShape>) => unwrap(p.data?.[field] as TableCell),
        valueFormatter: (p: ValueFormatterParams<RowShape>) =>
          col.numeric && typeof p.value === 'number'
            ? formatValue(p.value, col.format, fmt)
            : String(p.value ?? ''),
        cellStyle: (p) => {
          const tone = toneOf(p.data?.[field] as TableCell);
          const style: CellStyle = { fontWeight: i === 0 || p.data?.__emphasis ? 600 : 400 };
          if (tone) style.color = TONE_COLOR[tone];
          return style;
        },
      } satisfies ColDef<RowShape>;
    });
  }, [body.columns, fmt]);

  const rowData = useMemo<RowShape[]>(() => {
    return body.rows.map((row) => {
      const obj: RowShape = { __emphasis: Boolean(row.emphasis) };
      row.cells.forEach((cell, i) => {
        obj[`c${i}`] = cell;
      });
      return obj;
    });
  }, [body.rows]);

  // Fit the grid to its rows for typical payloads (no scrollbar to clip the
  // last column); cap + virtualize only when there are many rows.
  const HEADER = 40;
  const ROW = 44;
  const MAX = 9; // rows visible before the body scrolls
  const visibleRows = Math.min(body.rows.length, MAX);
  const height = HEADER + visibleRows * ROW + 2;

  return (
    <div style={{ height, scrollbarGutter: 'stable' }}>
      <AgGridReact<RowShape>
        theme={stoneTheme}
        columnDefs={columnDefs}
        rowData={rowData}
        animateRows={!reduced}
        suppressCellFocus
        getRowStyle={(p) =>
          p.data?.__emphasis ? { backgroundColor: '#fafaf9' } : undefined
        }
        defaultColDef={{ sortable: true, resizable: true }}
        aria-label={body.caption}
      />
    </div>
  );
}
