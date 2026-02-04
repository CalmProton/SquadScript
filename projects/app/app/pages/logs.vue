<script setup lang="ts">
const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

// Mock data - replace with actual API calls
const logs = ref([
  { id: '1', timestamp: '2026-02-05 12:34:56', type: 'chat', message: '[ALL] Player1: Hello everyone!', source: 'Player1' },
  { id: '2', timestamp: '2026-02-05 12:35:12', type: 'kills', message: 'Player2 killed Player3 with AK-74M', source: 'Game' },
  { id: '3', timestamp: '2026-02-05 12:36:00', type: 'adminActions', message: 'Admin kicked Player4 (reason: TK)', source: 'Admin' },
  { id: '4', timestamp: '2026-02-05 12:37:30', type: 'serverEvents', message: 'Match started on Gorodok RAAS v1', source: 'Server' },
]);

const filterType = ref('');

const filteredLogs = computed(() => {
  if (!filterType.value) return logs.value;
  return logs.value.filter(log => log.type === filterType.value);
});

const logTypes = ['chat', 'kills', 'adminActions', 'serverEvents'];

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    chat: 'bg-blue-500/10 text-blue-600',
    kills: 'bg-red-500/10 text-red-600',
    adminActions: 'bg-yellow-500/10 text-yellow-600',
    serverEvents: 'bg-green-500/10 text-green-600',
  };
  return colors[type] || 'bg-gray-500/10 text-gray-600';
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">{{ $t('logs.title') }}</h1>

      <!-- Filter -->
      <select
        v-model="filterType"
        class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{{ $t('logs.allTypes') }}</option>
        <option v-for="type in logTypes" :key="type" :value="type">
          {{ $t(`logs.${type}`) }}
        </option>
      </select>
    </div>

    <!-- Logs Table -->
    <div class="rounded-lg border bg-card">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="px-4 py-3 text-left text-sm font-medium">{{ $t('logs.timestamp') }}</th>
              <th class="px-4 py-3 text-left text-sm font-medium">{{ $t('logs.type') }}</th>
              <th class="px-4 py-3 text-left text-sm font-medium">{{ $t('logs.message') }}</th>
              <th class="px-4 py-3 text-left text-sm font-medium">{{ $t('logs.source') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in filteredLogs" :key="log.id" class="border-b last:border-0">
              <td class="whitespace-nowrap px-4 py-3 font-mono text-sm">{{ log.timestamp }}</td>
              <td class="px-4 py-3">
                <span :class="['rounded px-2 py-1 text-xs', getTypeColor(log.type)]">
                  {{ $t(`logs.${log.type}`) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm">{{ log.message }}</td>
              <td class="px-4 py-3 text-sm text-muted-foreground">{{ log.source }}</td>
            </tr>
            <tr v-if="filteredLogs.length === 0">
              <td colspan="4" class="px-4 py-8 text-center text-muted-foreground">
                {{ $t('logs.noLogs') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
