import { defineStore } from 'pinia';
import type { RconCommandResultDTO, ExecuteRconRequest, BroadcastRequest } from '@squadscript/types/api';

interface RconHistoryEntry {
  command: string;
  response: string;
  timestamp: string;
  success: boolean;
}

/**
 * RCON console store.
 * Command history and execution.
 */
export const useRconStore = defineStore('rcon', () => {
  const history = ref<RconHistoryEntry[]>([]);
  const loading = ref(false);
  const MAX_HISTORY = 200;

  function addEntry(entry: RconHistoryEntry) {
    history.value.push(entry);
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(-MAX_HISTORY);
    }
  }

  async function execute(command: string) {
    loading.value = true;
    try {
      const api = useApi();
      const result = await api.post<RconCommandResultDTO>('/rcon/execute', {
        command,
      } satisfies ExecuteRconRequest);
      addEntry({
        command: result.command,
        response: result.response,
        timestamp: result.executedAt,
        success: true,
      });
      return result;
    } catch (error) {
      addEntry({
        command,
        response: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        success: false,
      });
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function broadcast(message: string) {
    const api = useApi();
    return api.post<RconCommandResultDTO>('/rcon/broadcast', {
      message,
    } satisfies BroadcastRequest);
  }

  function clearHistory() {
    history.value = [];
  }

  return {
    history,
    loading,
    addEntry,
    execute,
    broadcast,
    clearHistory,
  };
});
