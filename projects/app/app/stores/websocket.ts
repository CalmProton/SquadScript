import { defineStore } from 'pinia';
import type { WSChannel, WSClientMessage, WSServerMessage } from '@squadscript/types/api';

/**
 * WebSocket connection store.
 * Manages connection lifecycle, reconnect logic, and channel subscriptions.
 */
export const useWebSocketStore = defineStore('websocket', () => {
  const connected = ref(false);
  const reconnecting = ref(false);
  const subscribedChannels = ref<Set<WSChannel>>(new Set());
  const error = ref<string | null>(null);

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const MAX_RECONNECT_DELAY = 30_000;
  const HEARTBEAT_INTERVAL = 30_000;

  function getReconnectDelay(): number {
    return Math.min(1000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' } satisfies WSClientMessage));
      }
    }, HEARTBEAT_INTERVAL);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function connect(token: string) {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    error.value = null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/proxy/ws?token=${encodeURIComponent(token)}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      connected.value = true;
      reconnecting.value = false;
      reconnectAttempt = 0;
      error.value = null;
      startHeartbeat();

      // Resubscribe to channels on reconnect
      if (subscribedChannels.value.size > 0) {
        const msg: WSClientMessage = {
          type: 'subscribe',
          channels: [...subscribedChannels.value],
        };
        ws!.send(JSON.stringify(msg));
      }
    };

    ws.onclose = () => {
      connected.value = false;
      stopHeartbeat();
      scheduleReconnect(token);
    };

    ws.onerror = () => {
      error.value = 'WebSocket connection error';
      connected.value = false;
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as WSServerMessage;
        handleMessage(message);
      } catch {
        // Ignore malformed messages
      }
    };
  }

  function handleMessage(message: WSServerMessage) {
    switch (message.type) {
      case 'state': {
        const serverStore = useServerStore();
        serverStore.applySnapshot(message.data);

        const playersStore = usePlayersStore();
        playersStore.setPlayers(message.data.players);

        const squadsStore = useSquadsStore();
        squadsStore.setSquads(message.data.squads);

        const metricsStore = useMetricsStore();
        metricsStore.setCurrent(message.data.metrics);
        break;
      }
      case 'metrics': {
        const metricsStore = useMetricsStore();
        metricsStore.setCurrent(message.data);
        break;
      }
      case 'notification': {
        const notificationsStore = useNotificationsStore();
        notificationsStore.addNotification(message.data);
        break;
      }
      case 'pong':
        // Heartbeat acknowledged
        break;
      case 'error':
        error.value = message.message;
        break;
      case 'event':
        dispatchEvent(message.channel, message.data);
        break;
    }
  }

  function dispatchEvent(channel: WSChannel, data: unknown) {
    switch (channel) {
      case 'players': {
        const store = usePlayersStore();
        const payload = data as { event: string; player: { eosId: string } };
        if (payload.event === 'PLAYER_DISCONNECTED') {
          store.removePlayer(payload.player.eosId);
        } else {
          store.fetchPlayers();
        }
        break;
      }
      case 'squads': {
        const store = useSquadsStore();
        store.fetchSquads();
        break;
      }
      case 'logs': {
        const store = useLogsStore();
        store.addEntry(data as Parameters<typeof store.addEntry>[0]);
        break;
      }
      case 'plugins': {
        const store = usePluginsStore();
        const payload = data as { name: string; state: string; enabled: boolean };
        store.updatePluginState(payload.name, { state: payload.state, enabled: payload.enabled });
        break;
      }
      // chat, kills, game, admin, rcon — handled by specific page components via events
      default:
        break;
    }
  }

  function scheduleReconnect(token: string) {
    if (reconnectTimer) return;
    reconnecting.value = true;
    reconnectAttempt++;
    const delay = getReconnectDelay();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect(token);
    }, delay);
  }

  function subscribe(channels: WSChannel[]) {
    for (const ch of channels) {
      subscribedChannels.value.add(ch);
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      const msg: WSClientMessage = { type: 'subscribe', channels };
      ws.send(JSON.stringify(msg));
    }
  }

  function unsubscribe(channels: WSChannel[]) {
    for (const ch of channels) {
      subscribedChannels.value.delete(ch);
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      const msg: WSClientMessage = { type: 'unsubscribe', channels };
      ws.send(JSON.stringify(msg));
    }
  }

  function disconnect() {
    stopHeartbeat();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null; // Prevent reconnect on intentional close
      ws.close();
      ws = null;
    }
    connected.value = false;
    reconnecting.value = false;
    reconnectAttempt = 0;
  }

  return {
    connected,
    reconnecting,
    subscribedChannels,
    error,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
});
