<script setup lang="ts">
const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

// Mock data - replace with actual API calls
const stats = ref({
  status: 'online',
  players: { current: 45, max: 100 },
  currentMap: 'Gorodok RAAS v1',
  nextMap: 'Yehorivka AAS v1',
  uptime: '3h 24m',
});
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">{{ $t('dashboard.title') }}</h1>

    <!-- Stats Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <!-- Server Status -->
      <div class="rounded-lg border bg-card p-6">
        <h3 class="text-sm font-medium text-muted-foreground">{{ $t('dashboard.serverStatus') }}</h3>
        <div class="mt-2 flex items-center gap-2">
          <div
            class="h-3 w-3 rounded-full"
            :class="stats.status === 'online' ? 'bg-green-500' : 'bg-red-500'"
          />
          <span class="text-2xl font-bold">
            {{ stats.status === 'online' ? $t('dashboard.online') : $t('dashboard.offline') }}
          </span>
        </div>
      </div>

      <!-- Players -->
      <div class="rounded-lg border bg-card p-6">
        <h3 class="text-sm font-medium text-muted-foreground">{{ $t('dashboard.players') }}</h3>
        <p class="mt-2 text-2xl font-bold">{{ stats.players.current }} / {{ stats.players.max }}</p>
      </div>

      <!-- Current Map -->
      <div class="rounded-lg border bg-card p-6">
        <h3 class="text-sm font-medium text-muted-foreground">{{ $t('dashboard.currentMap') }}</h3>
        <p class="mt-2 text-2xl font-bold">{{ stats.currentMap }}</p>
      </div>

      <!-- Uptime -->
      <div class="rounded-lg border bg-card p-6">
        <h3 class="text-sm font-medium text-muted-foreground">{{ $t('dashboard.uptime') }}</h3>
        <p class="mt-2 text-2xl font-bold">{{ stats.uptime }}</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="rounded-lg border bg-card p-6">
      <h2 class="mb-4 text-lg font-semibold">{{ $t('dashboard.quickActions') }}</h2>
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
    </div>
  </div>
</template>
