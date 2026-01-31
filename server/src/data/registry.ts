import { z, ZodObject, ZodRawShape } from 'zod';

// Generic data source interface
export interface DataSource<T = unknown> {
  name: string;
  description: string;
  // Schema for filtering/querying
  filterSchema: ZodObject<ZodRawShape>;
  // Columns for table display
  columns: Array<{ key: string; label: string }>;
  // Available chart aggregations
  chartAggregations: Array<{
    key: string;
    label: string;
    xKey: string;
    yKey: string;
    recommendedType: 'bar' | 'line' | 'pie' | 'area';
  }>;
  // Query function
  query: (filters: Record<string, unknown>) => T[];
  // Aggregation function for charts
  aggregate: (data: T[], aggregationType: string) => Record<string, string | number>[];
  // Get summary statistics
  getSummary: (data: T[]) => Record<string, string | number>;
}

// Registry to hold all data sources
class DataSourceRegistry {
  private sources: Map<string, DataSource> = new Map();

  register<T>(source: DataSource<T>): void {
    this.sources.set(source.name, source as DataSource);
  }

  get(name: string): DataSource | undefined {
    return this.sources.get(name);
  }

  getAll(): DataSource[] {
    return Array.from(this.sources.values());
  }

  getNames(): string[] {
    return Array.from(this.sources.keys());
  }

  // Generate a description for the LLM
  getDescription(): string {
    const sources = this.getAll();
    if (sources.length === 0) {
      return 'No data sources available.';
    }

    return sources.map(source => {
      const filterFields = Object.keys(source.filterSchema.shape).join(', ');
      const aggregations = source.chartAggregations.map(a => a.key).join(', ');
      
      return `- **${source.name}**: ${source.description}
  Filters: ${filterFields || 'none'}
  Chart aggregations: ${aggregations || 'none'}`;
    }).join('\n\n');
  }
}

// Singleton registry instance
export const registry = new DataSourceRegistry();

// Helper to create a data source with proper typing
export function createDataSource<T>(config: DataSource<T>): DataSource<T> {
  return config;
}
