import { defineStore } from 'pinia';
import type { SquadDTO } from '@squadscript/types/api';

/**
 * Squads store.
 * Squads grouped by team with reactive updates.
 */
export const useSquadsStore = defineStore('squads', () => {
  const squads = ref<SquadDTO[]>([]);
  const loading = ref(false);

  const byTeam = computed(() => {
    const map = new Map<number, SquadDTO[]>();
    for (const squad of squads.value) {
      const existing = map.get(squad.teamId) ?? [];
      existing.push(squad);
      map.set(squad.teamId, existing);
    }
    return map;
  });

  const teamOne = computed(() => byTeam.value.get(1) ?? []);
  const teamTwo = computed(() => byTeam.value.get(2) ?? []);

  function setSquads(list: readonly SquadDTO[]) {
    squads.value = [...list];
  }

  async function fetchSquads() {
    loading.value = true;
    try {
      const api = useApi();
      const result = await api.get<SquadDTO[]>('/squads');
      squads.value = result;
    } finally {
      loading.value = false;
    }
  }

  return {
    squads,
    loading,
    byTeam,
    teamOne,
    teamTwo,
    setSquads,
    fetchSquads,
  };
});
