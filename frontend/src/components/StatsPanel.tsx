import { BarChart3, Loader2 } from 'lucide-react';
import { Stats } from '../services/api';

interface StatsPanelProps {
  stats: Stats[];
  loading: boolean;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Interested': return 'bg-green-500';
    case 'Meeting Booked': return 'bg-blue-500';
    case 'Not Interested': return 'bg-red-500';
    case 'Spam': return 'bg-gray-500';
    case 'Out of Office': return 'bg-yellow-500';
    default: return 'bg-gray-400';
  }
};

export default function StatsPanel({ stats, loading }: StatsPanelProps) {
  const total = stats.reduce((sum, s) => sum + s.count, 0);

  if (loading) {
    return (
      <div className="w-64 bg-white border-r flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r overflow-y-auto p-6">
      <div className="flex items-center mb-6">
        <BarChart3 className="h-6 w-6 text-blue-500 mr-2" />
        <h2 className="text-lg font-bold">Statistics</h2>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">Total Emails</p>
        <p className="text-3xl font-bold text-blue-600">{total}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase">By Category</h3>
        
        {stats.length === 0 ? (
          <p className="text-sm text-gray-500">No categorized emails</p>
        ) : (
          stats.map((stat) => {
            const percent = total > 0 ? (stat.count / total) * 100 : 0;
            return (
              <div key={stat.category} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">{stat.category}</span>
                  <span className="text-sm font-semibold">{stat.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-full rounded-full ${getCategoryColor(stat.category)}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{percent.toFixed(1)}%</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
