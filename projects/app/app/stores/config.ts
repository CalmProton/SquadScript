import { defineStore } from 'pinia';

/**
 * Config store.
 * Server configuration management (rotation, admin lists, etc.).
 */
export const useConfigStore = defineStore('config', () => {
  const serverConfig = ref<Record<string, unknown> | null>(null);
  const rotation = ref<string[]>([]);
  const loading = ref(false);

  async function fetchServerConfig() {
    loading.value = true;
    try {
      const api = useApi();
      const result = await api.get<Record<string, unknown>>('/config/server');
      serverConfig.value = result;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRotation() {
    loading.value = true;
    try {
      const api = useApi();
      const result = await api.get<{ layers: string[] }>('/config/rotation');
      rotation.value = result.layers;
    } finally {
      loading.value = false;
    }
  }

  async function updateRotation(layers: string[]) {
    const api = useApi();
    await api.put('/config/rotation', { layers });
    rotation.value = layers;
  }

  return {
    serverConfig,
    rotation,
    loading,
    fetchServerConfig,
    fetchRotation,
    updateRotation,
  };
});
