import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChartCardProps {
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area';
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  yLabel?: string;
  color?: string;
}

// Color palette for charts - keeping vibrant colors for data visualization
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export function ChartCard({ title, type, data, xKey, yKey, yLabel, color = '#3b82f6' }: ChartCardProps) {
  const renderChart = () => {
    const gridColor = '#e7e5e4'; // stone-200
    const textColor = '#78716c'; // stone-500

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey={xKey} 
                angle={-45} 
                textAnchor="end" 
                height={80}
                interval={0}
                tick={{ fontSize: 11, fill: textColor }}
              />
              <YAxis 
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: textColor } : undefined}
                tick={{ fill: textColor }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e7e5e4',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Bar dataKey={yKey} fill={color} name={yLabel || yKey} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey={xKey} 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 11, fill: textColor }}
              />
              <YAxis 
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: textColor } : undefined}
                tick={{ fill: textColor }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e7e5e4',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey={yKey} stroke={color} name={yLabel || yKey} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey={xKey} 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 11, fill: textColor }}
              />
              <YAxis 
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: textColor } : undefined}
                tick={{ fill: textColor }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e7e5e4',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey={yKey} fill={color} stroke={color} name={yLabel || yKey} fillOpacity={0.6} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                dataKey={yKey}
                nameKey={xKey}
                isAnimationActive={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e7e5e4',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-stone-500">Unsupported chart type: {type}</div>;
    }
  };

  return (
    <div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      <h3 className="m-0 px-4 py-3 text-sm font-semibold bg-stone-100 border-b border-stone-200 text-stone-700">
        {title}
      </h3>
      <div className="p-4">
        {renderChart()}
      </div>
    </div>
  );
}
