<script setup lang="ts">
import { useServerStore } from '~/stores/server';
import { usePlayersStore } from '~/stores/players';
import { useMetricsStore } from '~/stores/metrics';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';

const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

const serverStore = useServerStore();
const playersStore = usePlayersStore();
const metricsStore = useMetricsStore();

// Initialize WebSocket connection
useWebSocket();

// Fetch initial data
onMounted(async () => {
  await Promise.all([
    serverStore.fetchStatus(),
    playersStore.fetchPlayers(),
    metricsStore.fetchCurrent(),
  ]);
});

const formattedUptime = computed(() => {
  const seconds = serverStore.uptime;
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
});

const statusColor = computed(() => {
  switch (serverStore.status) {
    case 'online': return 'bg-green-500';
    case 'starting': return 'bg-yellow-500';
    case 'stopping': return 'bg-orange-500';
    default: return 'bg-red-500';
  }
});

const statusLabel = computed(() => {
  switch (serverStore.status) {
    case 'online': return $t('dashboard.online');
    case 'offline': return $t('dashboard.offline');
    default: return serverStore.status;
  }
});
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">{{ $t('dashboard.title') }}</h1>

    <!-- Stats Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <!-- Server Status -->
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            {{ $t('dashboard.serverStatus') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-2">
            <div class="h-3 w-3 rounded-full" :class="statusColor" />
            <span class="text-2xl font-bold">{{ statusLabel }}</span>
          </div>
          <p v-if="serverStore.info" class="mt-1 text-xs text-muted-foreground">
            {{ serverStore.info.name }}
          </p>
        </CardContent>
      </Card>

      <!-- Players -->
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            {{ $t('dashboard.players') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">
            {{ playersStore.playerCount }}
            <span v-if="serverStore.info" class="text-lg font-normal text-muted-foreground">
              / {{ serverStore.info.maxPlayers }}
            </span>
          </p>
          <p v-if="serverStore.info" class="mt-1 text-xs text-muted-foreground">
            Queue: {{ serverStore.info.publicQueue }} public, {{ serverStore.info.reserveQueue }} reserve
          </p>
        </CardContent>
      </Card>

      <!-- Current Map -->
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            {{ $t('dashboard.currentMap') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold truncate">
            {{ serverStore.currentLayer?.name ?? 'Unknown' }}
          </p>
          <p v-if="serverStore.nextLayer" class="mt-1 text-xs text-muted-foreground">
            Next: {{ serverStore.nextLayer.name }}
          </p>
        </CardContent>
      </Card>

      <!-- Uptime -->
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            {{ $t('dashboard.uptime') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ formattedUptime }}</p>
          <div class="mt-1 flex items-center gap-1">
            <div
              class="h-2 w-2 rounded-full"
              :class="serverStore.rconConnected ? 'bg-green-500' : 'bg-red-500'"
            />
            <span class="text-xs text-muted-foreground">
              RCON {{ serverStore.rconConnected ? 'connected' : 'disconnected' }}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Metrics Row -->
    <div v-if="metricsStore.current" class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">Tick Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">
            {{ metricsStore.current.tickRate?.toFixed(1) ?? '--' }}
            <span class="text-sm font-normal text-muted-foreground">Hz</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">CPU</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">
            {{ metricsStore.current.cpuPercent?.toFixed(1) ?? '--' }}
            <span class="text-sm font-normal text-muted-foreground">%</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">Memory</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">
            {{ metricsStore.current.memoryMb?.toFixed(0) ?? '--' }}
            <span class="text-sm font-normal text-muted-foreground">MB</span>
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Quick Actions -->
    <Card>
      <CardHeader>
        <CardTitle>{{ $t('dashboard.quickActions') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            to="/players"
            class="inline-flex items-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            {{ $t('nav.players') }}
          </NuxtLink>
          <NuxtLink
            to="/rcon"
            class="inline-flex items-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            {{ $t('nav.rcon') }}
          </NuxtLink>
          <NuxtLink
            to="/logs"
            class="inline-flex items-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            {{ $t('nav.logs') }}
          </NuxtLink>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
