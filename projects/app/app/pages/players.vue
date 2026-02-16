<script setup lang="ts">
import { usePlayersStore } from '~/stores/players';
import type { PlayerDTO } from '@squadscript/types/api';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '~/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '~/components/ui/select';

const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

const playersStore = usePlayersStore();
const api = useApi();

onMounted(() => {
  playersStore.fetchPlayers();
});

const selectedPlayer = ref<PlayerDTO | null>(null);
const activeDialog = ref<'warn' | 'kick' | 'ban' | 'message' | null>(null);
const actionLoading = ref(false);

const warnMessage = ref('');
const kickReason = ref('');
const banReason = ref('');
const banDuration = ref('3600');
const messageContent = ref('');

function openAction(player: PlayerDTO, action: 'warn' | 'kick' | 'ban' | 'message') {
  selectedPlayer.value = player;
  activeDialog.value = action;
}

function closeDialog() {
  activeDialog.value = null;
  selectedPlayer.value = null;
  warnMessage.value = '';
  kickReason.value = '';
  banReason.value = '';
  banDuration.value = '3600';
  messageContent.value = '';
}

async function executeWarn() {
  if (!selectedPlayer.value) return;
  actionLoading.value = true;
  try {
    await api.post(`/players/${selectedPlayer.value.eosId}/warn`, {
      message: warnMessage.value,
    });
    closeDialog();
  } finally {
    actionLoading.value = false;
  }
}

async function executeKick() {
  if (!selectedPlayer.value) return;
  actionLoading.value = true;
  try {
    await api.post(`/players/${selectedPlayer.value.eosId}/kick`, {
      reason: kickReason.value,
    });
    closeDialog();
    playersStore.removePlayer(selectedPlayer.value.eosId);
  } finally {
    actionLoading.value = false;
  }
}

async function executeBan() {
  if (!selectedPlayer.value) return;
  actionLoading.value = true;
  try {
    await api.post(`/players/${selectedPlayer.value.eosId}/ban`, {
      reason: banReason.value,
      duration: Number(banDuration.value),
    });
    closeDialog();
    playersStore.removePlayer(selectedPlayer.value.eosId);
  } finally {
    actionLoading.value = false;
  }
}

async function executeMessage() {
  if (!selectedPlayer.value) return;
  actionLoading.value = true;
  try {
    await api.post(`/players/${selectedPlayer.value.eosId}/warn`, {
      message: messageContent.value,
    });
    closeDialog();
  } finally {
    actionLoading.value = false;
  }
}

function getTeamLabel(teamId: number | null): string {
  if (teamId === 1) return $t('players.teamOne');
  if (teamId === 2) return $t('players.teamTwo');
  return $t('players.unassigned');
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">{{ $t('players.title') }}</h1>
      <Badge variant="outline">{{ $t('players.onlineCount', { count: playersStore.playerCount }) }}</Badge>
    </div>

    <!-- Search -->
    <Input
      v-model="playersStore.search"
      :placeholder="$t('players.searchPlaceholder')"
      class="max-w-sm"
    />

    <!-- Players Table -->
    <div class="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ $t('players.name') }}</TableHead>
            <TableHead>{{ $t('players.steamId') }}</TableHead>
            <TableHead>{{ $t('players.team') }}</TableHead>
            <TableHead>{{ $t('players.squad') }}</TableHead>
            <TableHead>{{ $t('players.role') }}</TableHead>
            <TableHead>{{ $t('players.actions') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="player in playersStore.filtered" :key="player.eosId">
            <TableCell class="font-medium">
              {{ player.name }}
              <Badge v-if="player.isSquadLeader" variant="secondary" class="ml-1 text-xs">SL</Badge>
            </TableCell>
            <TableCell class="font-mono text-xs">{{ player.steamId ?? player.eosId }}</TableCell>
            <TableCell>
              <Badge :variant="player.teamId === 1 ? 'default' : player.teamId === 2 ? 'secondary' : 'outline'">
                {{ getTeamLabel(player.teamId) }}
              </Badge>
            </TableCell>
            <TableCell>{{ player.squadName ?? '-' }}</TableCell>
            <TableCell>{{ player.role ?? '-' }}</TableCell>
            <TableCell>
              <div class="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" class="h-7 text-xs" @click="openAction(player, 'warn')">
                  {{ $t('players.warn') }}
                </Button>
                <Button size="sm" variant="outline" class="h-7 text-xs" @click="openAction(player, 'message')">
                  {{ $t('players.message') }}
                </Button>
                <Button size="sm" variant="outline" class="h-7 text-xs text-orange-600" @click="openAction(player, 'kick')">
                  {{ $t('players.kick') }}
                </Button>
                <Button size="sm" variant="destructive" class="h-7 text-xs" @click="openAction(player, 'ban')">
                  {{ $t('players.ban') }}
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="playersStore.filtered.length === 0">
            <TableCell colspan="6" class="py-8 text-center text-muted-foreground">
              {{ $t('players.noPlayers') }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Warn Dialog -->
    <Dialog :open="activeDialog === 'warn'" @update:open="closeDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('players.warn') }}: {{ selectedPlayer?.name }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>{{ $t('players.warnMessage') }}</Label>
            <Textarea v-model="warnMessage" rows="3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="closeDialog">{{ $t('general.cancel') }}</Button>
          <Button variant="default" :disabled="actionLoading || !warnMessage" @click="executeWarn">
            {{ $t('players.warn') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Kick Dialog -->
    <Dialog :open="activeDialog === 'kick'" @update:open="closeDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('players.kick') }}: {{ selectedPlayer?.name }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>{{ $t('players.kickReason') }}</Label>
            <Input v-model="kickReason" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="closeDialog">{{ $t('general.cancel') }}</Button>
          <Button variant="destructive" :disabled="actionLoading || !kickReason" @click="executeKick">
            {{ $t('players.kick') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Ban Dialog -->
    <Dialog :open="activeDialog === 'ban'" @update:open="closeDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('players.ban') }}: {{ selectedPlayer?.name }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>{{ $t('players.banReason') }}</Label>
            <Input v-model="banReason" />
          </div>
          <div class="space-y-2">
            <Label>{{ $t('players.banDuration') }}</Label>
            <Select v-model="banDuration">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3600">{{ $t('players.banDurations.oneHour') }}</SelectItem>
                <SelectItem value="86400">{{ $t('players.banDurations.oneDay') }}</SelectItem>
                <SelectItem value="604800">{{ $t('players.banDurations.sevenDays') }}</SelectItem>
                <SelectItem value="2592000">{{ $t('players.banDurations.thirtyDays') }}</SelectItem>
                <SelectItem value="0">{{ $t('players.banDurations.permanent') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="closeDialog">{{ $t('general.cancel') }}</Button>
          <Button variant="destructive" :disabled="actionLoading || !banReason" @click="executeBan">
            {{ $t('players.ban') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Message Dialog -->
    <Dialog :open="activeDialog === 'message'" @update:open="closeDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('players.message') }}: {{ selectedPlayer?.name }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>{{ $t('players.messageContent') }}</Label>
            <Textarea v-model="messageContent" rows="3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="closeDialog">{{ $t('general.cancel') }}</Button>
          <Button :disabled="actionLoading || !messageContent" @click="executeMessage">
            {{ $t('general.submit') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
