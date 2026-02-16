import { defineStore } from 'pinia';
import type {
  ServerStateSnapshot,
  ServerInfoDTO,
  LayerDTO,
} from '@squadscript/types/api';

/**
 * Server status store.
 * Tracks connection state, current layer, info, and uptime.
 */
export const useServerStore = defineStore('server', () => {
  const status = ref<'online' | 'offline' | 'starting' | 'stopping'>('offline');
  const info = ref<ServerInfoDTO | null>(null);
  const currentLayer = ref<LayerDTO | null>(null);
  const nextLayer = ref<LayerDTO | null>(null);
  const uptime = ref(0);
  const rconConnected = ref(false);
  const loading = ref(false);

  function applySnapshot(snapshot: ServerStateSnapshot) {
    status.value = snapshot.status;
    info.value = snapshot.info;
    currentLayer.value = snapshot.currentLayer;
    nextLayer.value = snapshot.nextLayer;
    uptime.value = snapshot.uptime;
    rconConnected.value = snapshot.rconConnected;
  }

  async function fetchStatus() {
    loading.value = true;
    try {
      const api = useApi();
      const snapshot = await api.get<ServerStateSnapshot>('/status');
      applySnapshot(snapshot);
    } finally {
      loading.value = false;
    }
  }

  return {
    status,
    info,
    currentLayer,
    nextLayer,
    uptime,
    rconConnected,
    loading,
    applySnapshot,
    fetchStatus,
  };
});
