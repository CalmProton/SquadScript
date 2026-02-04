<script setup lang="ts">
const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

// Mock data - replace with actual API calls
const players = ref([
  { id: '1', name: 'Player1', steamId: '76561198012345678', team: 'US Army', squad: 'SQUAD 1', role: 'Squad Leader' },
  { id: '2', name: 'Player2', steamId: '76561198012345679', team: 'Russian Army', squad: 'SQUAD 2', role: 'Rifleman' },
  { id: '3', name: 'Player3', steamId: '76561198012345680', team: 'US Army', squad: 'SQUAD 1', role: 'Medic' },
]);

const selectedPlayer = ref<typeof players.value[0] | null>(null);
const showKickDialog = ref(false);
const showBanDialog = ref(false);
const showWarnDialog = ref(false);
const showMessageDialog = ref(false);

const kickReason = ref('');
const banReason = ref('');
const banDuration = ref('1h');
const warnMessage = ref('');
const messageContent = ref('');

function openAction(player: typeof players.value[0], action: string) {
  selectedPlayer.value = player;
  if (action === 'kick') showKickDialog.value = true;
  if (action === 'ban') showBanDialog.value = true;
  if (action === 'warn') showWarnDialog.value = true;
  if (action === 'message') showMessageDialog.value = true;
}

function executeKick() {
  // TODO: Implement kick via RCON
  console.log('Kick:', selectedPlayer.value?.name, kickReason.value);
  showKickDialog.value = false;
  kickReason.value = '';
}

function executeBan() {
  // TODO: Implement ban via RCON
  console.log('Ban:', selectedPlayer.value?.name, banReason.value, banDuration.value);
  showBanDialog.value = false;
  banReason.value = '';
  banDuration.value = '1h';
}

function executeWarn() {
  // TODO: Implement warn via RCON
  console.log('Warn:', selectedPlayer.value?.name, warnMessage.value);
  showWarnDialog.value = false;
  warnMessage.value = '';
}

function sendMessage() {
  // TODO: Implement message via RCON
  console.log('Message to:', selectedPlayer.value?.name, messageContent.value);
  showMessageDialog.value = false;
  messageContent.value = '';
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">{{ $t('players.title') }}</h1>

    <!-- Players Table -->
    <div class="rounded-lg border bg-card">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="px-4 py-3 text-left text-sm font-medium">{{ $t('players.name') }}</th>
              <th class="px-4 py-3 text-left text-sm font-medium">{{ $t('players.steamId') }}</th>
              <th class="px-4 py-3 text-left text-sm font-medium">{{ $t('players.team') }}</th>
              <th class="px-4 py-3 text-left text-sm font-medium">{{ $t('players.squad') }}</th>
              <th class="px-4 py-3 text-left text-sm font-medium">{{ $t('players.role') }}</th>
              <th class="px-4 py-3 text-left text-sm font-medium">{{ $t('players.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="player in players" :key="player.id" class="border-b last:border-0">
              <td class="px-4 py-3 text-sm">{{ player.name }}</td>
              <td class="px-4 py-3 text-sm font-mono">{{ player.steamId }}</td>
              <td class="px-4 py-3 text-sm">{{ player.team }}</td>
              <td class="px-4 py-3 text-sm">{{ player.squad }}</td>
              <td class="px-4 py-3 text-sm">{{ player.role }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <button
                    class="rounded bg-yellow-500/10 px-2 py-1 text-xs text-yellow-600 hover:bg-yellow-500/20"
                    @click="openAction(player, 'warn')"
                  >
                    {{ $t('players.warn') }}
                  </button>
                  <button
                    class="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600 hover:bg-blue-500/20"
                    @click="openAction(player, 'message')"
                  >
                    {{ $t('players.message') }}
                  </button>
                  <button
                    class="rounded bg-orange-500/10 px-2 py-1 text-xs text-orange-600 hover:bg-orange-500/20"
                    @click="openAction(player, 'kick')"
                  >
                    {{ $t('players.kick') }}
                  </button>
                  <button
                    class="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600 hover:bg-red-500/20"
                    @click="openAction(player, 'ban')"
                  >
                    {{ $t('players.ban') }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="players.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
                {{ $t('players.noPlayers') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Kick Dialog -->
    <div v-if="showKickDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-full max-w-md rounded-lg bg-card p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ $t('players.kick') }}: {{ selectedPlayer?.name }}</h2>
        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium">{{ $t('players.kickReason') }}</label>
          <input
            v-model="kickReason"
            type="text"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div class="flex justify-end gap-2">
          <button
            class="rounded-md bg-secondary px-4 py-2 text-sm"
            @click="showKickDialog = false"
          >
            {{ $t('general.cancel') }}
          </button>
          <button
            class="rounded-md bg-destructive px-4 py-2 text-sm text-white"
            @click="executeKick"
          >
            {{ $t('players.kick') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Ban Dialog -->
    <div v-if="showBanDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-full max-w-md rounded-lg bg-card p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ $t('players.ban') }}: {{ selectedPlayer?.name }}</h2>
        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium">{{ $t('players.banReason') }}</label>
          <input
            v-model="banReason"
            type="text"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium">{{ $t('players.banDuration') }}</label>
          <select
            v-model="banDuration"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="1h">1 hour</option>
            <option value="1d">1 day</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="permanent">Permanent</option>
          </select>
        </div>
        <div class="flex justify-end gap-2">
          <button
            class="rounded-md bg-secondary px-4 py-2 text-sm"
            @click="showBanDialog = false"
          >
            {{ $t('general.cancel') }}
          </button>
          <button
            class="rounded-md bg-destructive px-4 py-2 text-sm text-white"
            @click="executeBan"
          >
            {{ $t('players.ban') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Warn Dialog -->
    <div v-if="showWarnDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-full max-w-md rounded-lg bg-card p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ $t('players.warn') }}: {{ selectedPlayer?.name }}</h2>
        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium">{{ $t('players.warnMessage') }}</label>
          <textarea
            v-model="warnMessage"
            rows="3"
            class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div class="flex justify-end gap-2">
          <button
            class="rounded-md bg-secondary px-4 py-2 text-sm"
            @click="showWarnDialog = false"
          >
            {{ $t('general.cancel') }}
          </button>
          <button
            class="rounded-md bg-yellow-600 px-4 py-2 text-sm text-white"
            @click="executeWarn"
          >
            {{ $t('players.warn') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Message Dialog -->
    <div v-if="showMessageDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-full max-w-md rounded-lg bg-card p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ $t('players.message') }}: {{ selectedPlayer?.name }}</h2>
        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium">{{ $t('players.messageContent') }}</label>
          <textarea
            v-model="messageContent"
            rows="3"
            class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div class="flex justify-end gap-2">
          <button
            class="rounded-md bg-secondary px-4 py-2 text-sm"
            @click="showMessageDialog = false"
          >
            {{ $t('general.cancel') }}
          </button>
          <button
            class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            @click="sendMessage"
          >
            {{ $t('general.submit') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
