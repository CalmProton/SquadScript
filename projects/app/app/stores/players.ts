import { defineStore } from 'pinia';
import type { PlayerDTO } from '@squadscript/types/api';

/**
 * Players store.
 * Connected players list with search/filter support.
 */
export const usePlayersStore = defineStore('players', () => {
  const players = ref<PlayerDTO[]>([]);
  const loading = ref(false);
  const search = ref('');

  const filtered = computed(() => {
    if (!search.value) return players.value;
    const q = search.value.toLowerCase();
    return players.value.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.eosId.toLowerCase().includes(q) ||
        (p.steamId && p.steamId.toLowerCase().includes(q)),
    );
  });

  const playerCount = computed(() => players.value.length);

  function setPlayers(list: readonly PlayerDTO[]) {
    players.value = [...list];
  }

  function updatePlayer(player: PlayerDTO) {
    const idx = players.value.findIndex((p) => p.eosId === player.eosId);
    if (idx >= 0) {
      players.value[idx] = player;
    } else {
      players.value.push(player);
    }
  }

  function removePlayer(eosId: string) {
    players.value = players.value.filter((p) => p.eosId !== eosId);
  }

  async function fetchPlayers() {
    loading.value = true;
    try {
      const api = useApi();
      const result = await api.get<PlayerDTO[]>('/players');
      players.value = [...result];
    } finally {
      loading.value = false;
    }
  }

  return {
    players,
    loading,
    search,
    filtered,
    playerCount,
    setPlayers,
    updatePlayer,
    removePlayer,
    fetchPlayers,
  };
});
