import type { WSChannel } from '@squadscript/types/api';

/**
 * WebSocket composable for auto-connecting and managing channel subscriptions.
 *
 * Usage in app.vue or layout:
 *   const { status, subscribe } = useWebSocket()
 *
 * Usage in pages:
 *   const { subscribe } = useWebSocket()
 *   subscribe(['chat', 'kills'])  // subscribe to page-specific channels
 */
export function useWebSocket() {
  const wsStore = useWebSocketStore();
  const authStore = useAuthStore();

  const status = computed(() => {
    if (wsStore.connected) return 'connected' as const;
    if (wsStore.reconnecting) return 'reconnecting' as const;
    return 'disconnected' as const;
  });

  /**
   * Connect to the WebSocket server. Requires auth token.
   * Called automatically on app mount when authenticated.
   */
  function connect() {
    if (!authStore.token) return;
    wsStore.connect(authStore.token);
  }

  /**
   * Disconnect from the WebSocket server.
   */
  function disconnect() {
    wsStore.disconnect();
  }

  /**
   * Subscribe to one or more channels.
   */
  function subscribe(channels: WSChannel[]) {
    wsStore.subscribe(channels);
  }

  /**
   * Unsubscribe from one or more channels.
   */
  function unsubscribe(channels: WSChannel[]) {
    wsStore.unsubscribe(channels);
  }

  // Auto-connect when authenticated
  watch(
    () => authStore.isAuthenticated,
    (authenticated) => {
      if (authenticated) {
        connect();
        // Subscribe to default channels
        subscribe(['players', 'squads', 'metrics', 'logs', 'plugins']);
      } else {
        disconnect();
      }
    },
    { immediate: true },
  );

  return {
    status,
    connected: computed(() => wsStore.connected),
    error: computed(() => wsStore.error),
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
}
