<script setup lang="ts">
import { useLogsStore } from '~/stores/logs';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '~/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '~/components/ui/select';

const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

const logsStore = useLogsStore();

const logTypes = [
  'PLAYER_CONNECTED', 'PLAYER_DISCONNECTED', 'PLAYER_DIED',
  'PLAYER_WOUNDED', 'PLAYER_REVIVED', 'CHAT_MESSAGE',
  'NEW_GAME', 'ROUND_ENDED', 'ADMIN_BROADCAST',
  'PLAYER_KICKED', 'PLAYER_WARNED', 'PLAYER_BANNED',
  'SQUAD_CREATED', 'RCON_CONNECTED', 'RCON_DISCONNECTED',
];

const filterType = ref('all');
const playerFilter = ref('');

onMounted(() => {
  logsStore.fetchLogs();
});

function onFilterChange(val: string) {
  filterType.value = val;
  logsStore.fetchLogs({
    type: val === 'all' ? undefined : val,
    player: playerFilter.value || undefined,
    offset: 0,
  });
}

function onPlayerSearch() {
  logsStore.fetchLogs({
    type: filterType.value === 'all' ? undefined : filterType.value,
    player: playerFilter.value || undefined,
    offset: 0,
  });
}

function loadMore() {
  logsStore.loadMore();
}

function getTypeBadgeVariant(type: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (type.includes('DIED') || type.includes('BANNED') || type.includes('ERROR')) return 'destructive';
  if (type.includes('KICKED') || type.includes('WARNED') || type.includes('WOUNDED')) return 'secondary';
  if (type.includes('CONNECTED') || type.includes('NEW_GAME') || type.includes('REVIVED')) return 'default';
  return 'outline';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">{{ $t('logs.title') }}</h1>
      <Badge variant="outline">{{ logsStore.total }} entries</Badge>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3">
      <Select :model-value="filterType" @update:model-value="onFilterChange">
        <SelectTrigger class="w-[200px]">
          <SelectValue :placeholder="$t('logs.allTypes')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{{ $t('logs.allTypes') }}</SelectItem>
          <SelectItem v-for="type in logTypes" :key="type" :value="type">
            {{ type }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Input
        v-model="playerFilter"
        :placeholder="$t('logs.filterByPlayer') || 'Filter by player...'"
        class="max-w-[200px]"
        @keyup.enter="onPlayerSearch"
      />
    </div>

    <!-- Logs Table -->
    <div class="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[180px]">{{ $t('logs.timestamp') }}</TableHead>
            <TableHead class="w-[180px]">{{ $t('logs.type') }}</TableHead>
            <TableHead>{{ $t('logs.message') }}</TableHead>
            <TableHead class="w-[140px]">{{ $t('logs.source') || 'Player' }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="entry in logsStore.entries" :key="entry.id">
            <TableCell class="whitespace-nowrap font-mono text-xs">
              {{ formatDate(entry.createdAt) }}
            </TableCell>
            <TableCell>
              <Badge :variant="getTypeBadgeVariant(entry.type)" class="text-xs">
                {{ entry.type }}
              </Badge>
            </TableCell>
            <TableCell class="text-sm">{{ entry.message }}</TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ entry.player ?? '-' }}
            </TableCell>
          </TableRow>
          <TableRow v-if="logsStore.entries.length === 0 && !logsStore.loading">
            <TableCell colspan="4" class="py-8 text-center text-muted-foreground">
              {{ $t('logs.noLogs') }}
            </TableCell>
          </TableRow>
          <TableRow v-if="logsStore.loading">
            <TableCell colspan="4" class="py-8 text-center text-muted-foreground">
              Loading...
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div v-if="logsStore.entries.length < logsStore.total" class="flex justify-center">
      <Button variant="outline" :disabled="logsStore.loading" @click="loadMore">
        Load more ({{ logsStore.entries.length }}/{{ logsStore.total }})
      </Button>
    </div>
  </div>
</template>
