import { z } from 'zod';
import { registry } from './data/registry.js';

// Import data sources to register them
import './data/bondTrades.js';
import './data/employees.js';
import './data/products.js';

// Build tools dynamically based on registered data sources
export function buildTools() {
  const dataSources = registry.getAll();
  const sourceNames = registry.getNames();
  
  if (sourceNames.length === 0) {
    throw new Error('No data sources registered');
  }

  // Build aggregation options from all sources
  const allAggregations: string[] = [];
  const aggregationMap: Record<string, { source: string; xKey: string; yKey: string; recommendedType: string }> = {};
  
  for (const source of dataSources) {
    for (const agg of source.chartAggregations) {
      const key = `${source.name}:${agg.key}`;
      allAggregations.push(key);
      aggregationMap[key] = {
        source: source.name,
        xKey: agg.xKey,
        yKey: agg.yKey,
        recommendedType: agg.recommendedType,
      };
    }
  }

  return {
    // Generic query tool for any data source
    query_data: {
      description: `Query data from available sources. 
      
Available data sources:
${dataSources.map(s => `- "${s.name}": ${s.description}`).join('\n')}

Returns matching records as a table. Pass filters as a JSON string.`,
      parameters: z.object({
        dataSource: z.enum(sourceNames as [string, ...string[]]).describe('Which data source to query'),
        filtersJson: z.string().describe('Filter criteria as JSON string, e.g. {"department":"Engineering"} or "{}" for no filters'),
        limit: z.number().describe('Maximum number of results to return'),
      }),
      execute: async (args: { dataSource: string; filtersJson: string; limit: number }) => {
        const filters = args.filtersJson && args.filtersJson !== '{}' ? JSON.parse(args.filtersJson) : {};
        const source = registry.get(args.dataSource);
        if (!source) {
          throw new Error(`Unknown data source: ${args.dataSource}`);
        }
        
        const data = source.query(filters);
        const limited = data.slice(0, args.limit || 20);
        const summary = source.getSummary(data);
        
        // Format data for table display
        const rows = limited.map(item => {
          const row: Record<string, string | number | null> = {};
          for (const col of source.columns) {
            const value = (item as Record<string, unknown>)[col.key];
            if (typeof value === 'number') {
              row[col.label] = col.key.includes('rice') || col.key.includes('alary') || col.key.includes('otional') || col.key.includes('alue')
                ? '$' + value.toLocaleString()
                : value;
            } else {
              row[col.label] = value as string | null;
            }
          }
          return row;
        });
        
        return {
          dataSource: args.dataSource,
          columns: source.columns.map(c => c.label),
          rows,
          totalMatches: data.length,
          showing: limited.length,
          summary,
        };
      },
    },

    // Generic chart tool for any data source
    show_chart: {
      description: `Display a chart from available data sources.

Available chart aggregations:
${dataSources.map(s => 
  `- ${s.name}: ${s.chartAggregations.map(a => `"${s.name}:${a.key}" (${a.label}, ${a.recommendedType})`).join(', ')}`
).join('\n')}

Specify aggregation as "dataSource:aggregationType" (e.g., "employees:byDepartment").`,
      parameters: z.object({
        title: z.string().describe('Chart title'),
        type: z.enum(['bar', 'line', 'pie', 'area']).describe('Chart type'),
        aggregation: z.string().describe('Aggregation in format "dataSource:type" (e.g., "employees:byDepartment")'),
        filtersJson: z.string().describe('Filters as JSON string, or "{}" for no filters'),
      }),
      execute: async (args: { title: string; type: string; aggregation: string; filtersJson: string }) => {
        const filters = args.filtersJson && args.filtersJson !== '{}' ? JSON.parse(args.filtersJson) : {};
        const [sourceName, aggType] = args.aggregation.split(':');
        const source = registry.get(sourceName);
        
        if (!source) {
          throw new Error(`Unknown data source: ${sourceName}`);
        }
        
        const aggConfig = source.chartAggregations.find(a => a.key === aggType);
        if (!aggConfig) {
          throw new Error(`Unknown aggregation type: ${aggType} for ${sourceName}`);
        }
        
        const data = source.query(filters);
        const aggregatedData = source.aggregate(data, aggType);
        const summary = source.getSummary(data);
        
        return {
          title: args.title,
          type: args.type,
          data: aggregatedData,
          xKey: aggConfig.xKey,
          yKey: aggConfig.yKey,
          yLabel: aggConfig.label,
          summary,
        };
      },
    },

    // Display data in a table (generic)
    show_table: {
      description: 'Display custom data in a table format. Pass rows as a JSON array string.',
      parameters: z.object({
        title: z.string().describe('The title of the table'),
        columns: z.array(z.string()).describe('Column headers'),
        rowsJson: z.string().describe('Table data rows as JSON array string, e.g. [{"col1":"val1","col2":"val2"}]'),
      }),
      execute: async (args: { title: string; columns: string[]; rowsJson: string }) => {
        const rows = JSON.parse(args.rowsJson);
        return { title: args.title, columns: args.columns, rows };
      },
    },

    // Client-side tool: collect filters from user via a form
    collect_filters: {
      description: 'Display a form to collect filter criteria from the user.',
      parameters: z.object({
        title: z.string().describe('The title of the form'),
        fields: z.array(z.object({
          key: z.string().describe('Unique identifier for this field'),
          label: z.string().describe('Display label for the field'),
          type: z.enum(['text', 'select', 'date']).describe('The input type'),
          options: z.array(z.string()).describe('Options for select type (use empty array [] if not select)'),
          defaultValue: z.string().describe('Default value (use empty string "" if none)'),
        })).describe('The form fields to display'),
      }),
      // No execute - client-side tool
    },

    // Client-side tool: ask for user confirmation
    confirm_action: {
      description: 'Ask the user to confirm an action before proceeding.',
      parameters: z.object({
        summary: z.string().describe('Description of the action to confirm'),
        risk: z.enum(['low', 'medium', 'high']).describe('Risk level of the action'),
        actions: z.array(z.object({
          id: z.string().describe('Unique action identifier'),
          label: z.string().describe('Button label'),
        })).describe('Available action buttons'),
      }),
      // No execute - client-side tool
    },
  };
}

// Export the tools (built at import time)
export const tools = buildTools();

// ============================================================
// Standalone Display Tools (no data source dependency)
// These can be used by any endpoint for custom data display
// ============================================================

export const displayTools = {
  // Display custom data in a table format
  show_table: {
    description: 'Display data in a table format. Use this when the user asks to see data as a table. Pass the data as a JSON array string.',
    parameters: z.object({
      title: z.string().describe('The title of the table'),
      columns: z.array(z.string()).describe('Column headers'),
      rowsJson: z.string().describe('Table data rows as JSON array string, e.g. [{"col1":"val1","col2":"val2"}]'),
    }),
    execute: async (args: { title: string; columns: string[]; rowsJson: string }) => {
      const rows = JSON.parse(args.rowsJson);
      return { title: args.title, columns: args.columns, rows };
    },
  },

  // Display a chart from arbitrary data
  show_chart: {
    description: 'Display data as a chart (bar, line, pie, or area). Use this when the user asks to visualize data. Pass the data as a JSON array string.',
    parameters: z.object({
      title: z.string().describe('Chart title'),
      type: z.enum(['bar', 'line', 'pie', 'area']).describe('Chart type'),
      dataJson: z.string().describe('Chart data as JSON array string, e.g. [{"label":"A","value":10},{"label":"B","value":20}]'),
      xKey: z.string().describe('Key for x-axis values in the data objects'),
      yKey: z.string().describe('Key for y-axis values in the data objects'),
      yLabel: z.string().optional().describe('Label for y-axis'),
    }),
    execute: async (args: { title: string; type: string; dataJson: string; xKey: string; yKey: string; yLabel?: string }) => {
      const data = JSON.parse(args.dataJson);
      return {
        title: args.title,
        type: args.type,
        data,
        xKey: args.xKey,
        yKey: args.yKey,
        yLabel: args.yLabel || args.yKey,
      };
    },
  },

  // Client-side tool: collect user input via a form
  collect_filters: {
    description: 'Display a form to collect input from the user. Use for multi-field input or selections.',
    parameters: z.object({
      title: z.string().describe('The title of the form'),
      fields: z.array(z.object({
        key: z.string().describe('Unique identifier for this field'),
        label: z.string().describe('Display label for the field'),
        type: z.enum(['text', 'select', 'date']).describe('The input type'),
        options: z.array(z.string()).describe('Options for select type (use empty array [] if not select)'),
        defaultValue: z.string().describe('Default value (use empty string "" if none)'),
      })).describe('The form fields to display'),
    }),
    // No execute - client-side tool
  },

  // Client-side tool: ask for user confirmation or choice
  confirm_action: {
    description: 'Present action buttons to the user. Use for confirmations, choices, or next-step options.',
    parameters: z.object({
      summary: z.string().describe('Description or question to present'),
      risk: z.enum(['low', 'medium', 'high']).describe('Risk level (use "low" for simple choices)'),
      actions: z.array(z.object({
        id: z.string().describe('Unique action identifier'),
        label: z.string().describe('Button label'),
      })).describe('Available action buttons'),
    }),
    // No execute - client-side tool
  },
};
