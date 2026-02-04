<script setup lang="ts">
const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

const command = ref('');
const history = ref<{ command: string; response: string; timestamp: string }[]>([]);

async function executeCommand() {
  if (!command.value.trim()) return;

  const cmd = command.value.trim();
  const timestamp = new Date().toLocaleTimeString();

  // TODO: Send command to RCON server
  // For now, simulate a response
  const response = `Executed: ${cmd}`;

  history.value.unshift({
    command: cmd,
    response,
    timestamp,
  });

  command.value = '';
}

function clearHistory() {
  history.value = [];
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">{{ $t('rcon.title') }}</h1>

    <!-- Command Input -->
    <div class="rounded-lg border bg-card p-6">
      <form class="flex gap-4" @submit.prevent="executeCommand">
        <input
          v-model="command"
          type="text"
          :placeholder="$t('rcon.placeholder')"
          class="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          class="inline-flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {{ $t('rcon.execute') }}
        </button>
      </form>
    </div>

    <!-- Command History -->
    <div class="rounded-lg border bg-card">
      <div class="flex items-center justify-between border-b px-6 py-4">
        <h2 class="font-semibold">{{ $t('rcon.history') }}</h2>
        <button
          v-if="history.length > 0"
          class="text-sm text-muted-foreground hover:text-foreground"
          @click="clearHistory"
        >
          {{ $t('rcon.clearHistory') }}
        </button>
      </div>

      <div class="max-h-[500px] overflow-y-auto">
        <div v-if="history.length === 0" class="px-6 py-8 text-center text-muted-foreground">
          No commands executed yet
        </div>

        <div v-for="(item, index) in history" :key="index" class="border-b p-4 last:border-0">
          <div class="mb-2 flex items-center justify-between">
            <code class="rounded bg-muted px-2 py-1 font-mono text-sm">{{ item.command }}</code>
            <span class="text-xs text-muted-foreground">{{ item.timestamp }}</span>
          </div>
          <div class="rounded bg-muted/50 p-3">
            <pre class="whitespace-pre-wrap font-mono text-sm">{{ item.response }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
