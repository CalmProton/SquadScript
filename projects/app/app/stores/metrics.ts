import { defineStore } from 'pinia';
import type { MetricsSnapshot, MetricsHistoryParams } from '@squadscript/types/api';

/**
 * Metrics store.
 * Real-time + historical server performance metrics.
 */
export const useMetricsStore = defineStore('metrics', () => {
  const current = ref<MetricsSnapshot | null>(null);
  const history = ref<MetricsSnapshot[]>([]);
  const loading = ref(false);

  /** Rolling buffer of recent snapshots for sparkline charts. */
  const recentSnapshots = ref<MetricsSnapshot[]>([]);
  const MAX_RECENT = 60;

  function setCurrent(snapshot: MetricsSnapshot) {
    current.value = snapshot;
    recentSnapshots.value.push(snapshot);
    if (recentSnapshots.value.length > MAX_RECENT) {
      recentSnapshots.value = recentSnapshots.value.slice(-MAX_RECENT);
    }
  }

  async function fetchCurrent() {
    const api = useApi();
    const result = await api.get<MetricsSnapshot>('/metrics/current');
    setCurrent(result);
  }

  async function fetchHistory(params?: MetricsHistoryParams) {
    loading.value = true;
    try {
      const api = useApi();
      const query: Record<string, string | number | undefined> = {};
      if (params?.from) query.from = params.from;
      if (params?.to) query.to = params.to;
      if (params?.interval) query.interval = params.interval;

      const result = await api.get<MetricsSnapshot[]>('/metrics/history', query);
      history.value = result;
    } finally {
      loading.value = false;
    }
  }

  return {
    current,
    history,
    loading,
    recentSnapshots,
    setCurrent,
    fetchCurrent,
    fetchHistory,
  };
});
