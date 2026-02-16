import { defineStore } from 'pinia';
import type { PluginDTO, UpdatePluginRequest } from '@squadscript/types/api';

/**
 * Plugins store.
 * Plugin list, state, and configuration management.
 */
export const usePluginsStore = defineStore('plugins', () => {
  const plugins = ref<PluginDTO[]>([]);
  const loading = ref(false);

  const enabledPlugins = computed(() => plugins.value.filter((p) => p.enabled));
  const disabledPlugins = computed(() => plugins.value.filter((p) => !p.enabled));

  function setPlugins(list: PluginDTO[]) {
    plugins.value = list;
  }

  function updatePluginState(name: string, state: Partial<PluginDTO>) {
    const idx = plugins.value.findIndex((p) => p.name === name);
    if (idx >= 0) {
      plugins.value[idx] = { ...plugins.value[idx], ...state } as PluginDTO;
    }
  }

  async function fetchPlugins() {
    loading.value = true;
    try {
      const api = useApi();
      const result = await api.get<PluginDTO[]>('/plugins');
      plugins.value = result;
    } finally {
      loading.value = false;
    }
  }

  async function updatePlugin(name: string, data: UpdatePluginRequest) {
    const api = useApi();
    const updated = await api.patch<PluginDTO>(`/plugins/${name}`, data);
    updatePluginState(name, updated);
    return updated;
  }

  return {
    plugins,
    loading,
    enabledPlugins,
    disabledPlugins,
    setPlugins,
    updatePluginState,
    fetchPlugins,
    updatePlugin,
  };
});
