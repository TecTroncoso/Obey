'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTrends } from '@/lib/actions/post.actions';

export function TrendsWidget() {
  const [trends, setTrends] = useState<any[]>([]);

  const fetchTrends = useCallback(async () => {
    try {
      const fetchedTrends = await getTrends(5);
      setTrends(fetchedTrends);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
    const interval = setInterval(fetchTrends, 10000); // Polling every 10 seconds
    return () => clearInterval(interval);
  }, [fetchTrends]);

  return (
    <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
      <h3 className="font-bold text-white mb-4 uppercase text-xs tracking-widest opacity-50">Currents</h3>
      <div className="space-y-4">
        {trends.length === 0 && (
          <p className="text-sm text-zinc-500">Nada fluyendo aún...</p>
        )}
        {trends.map(trend => (
          <div key={trend.id}>
            <p className="font-bold text-white">#{trend.name}</p>
            <p className="text-xs text-zinc-500">{trend.count} echoes</p>
          </div>
        ))}
      </div>
    </div>
  );
}
