import { defineStore } from 'pinia';
import type { LogEntryDTO, PaginatedResponse, LogsQueryParams } from '@squadscript/types/api';

/**
 * Logs store.
 * Log entries with pagination and filtering.
 */
export const useLogsStore = defineStore('logs', () => {
  const entries = ref<LogEntryDTO[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const filters = ref<LogsQueryParams>({
    limit: 50,
    offset: 0,
  });

  function addEntry(entry: LogEntryDTO) {
    entries.value.unshift(entry);
    // Keep a reasonable buffer on the client side
    if (entries.value.length > 500) {
      entries.value = entries.value.slice(0, 500);
    }
  }

  async function fetchLogs(params?: Partial<LogsQueryParams>) {
    loading.value = true;
    if (params) {
      filters.value = { ...filters.value, ...params };
    }
    try {
      const api = useApi();
      const query: Record<string, string | number | undefined> = {};
      if (filters.value.type) query.type = filters.value.type;
      if (filters.value.player) query.player = filters.value.player;
      if (filters.value.from) query.from = filters.value.from;
      if (filters.value.to) query.to = filters.value.to;
      if (filters.value.limit) query.limit = filters.value.limit;
      if (filters.value.offset !== undefined) query.offset = filters.value.offset;

      const result = await api.get<PaginatedResponse<LogEntryDTO>>('/logs', query);
      entries.value = [...result.data];
      total.value = result.total;
    } finally {
      loading.value = false;
    }
  }

  async function loadMore() {
    filters.value = {
      ...filters.value,
      offset: (filters.value.offset ?? 0) + (filters.value.limit ?? 50),
    };
    await fetchLogs();
  }

  return {
    entries,
    total,
    loading,
    filters,
    addEntry,
    fetchLogs,
    loadMore,
  };
});
