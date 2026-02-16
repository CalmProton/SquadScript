<script setup lang="ts">
import { useRconStore } from '~/stores/rcon';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '~/components/ui/dialog';
import { Textarea } from '~/components/ui/textarea';

const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

const rconStore = useRconStore();

const command = ref('');
const broadcastMessage = ref('');
const showBroadcastDialog = ref(false);
const commandHistory = ref<string[]>([]);
const historyIndex = ref(-1);

async function executeCommand() {
  if (!command.value.trim()) return;
  const cmd = command.value.trim();

  commandHistory.value.push(cmd);
  historyIndex.value = commandHistory.value.length;

  try {
    await rconStore.execute(cmd);
  } catch {
    // Error is already recorded in history by the store
  }
  command.value = '';
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (historyIndex.value > 0) {
      historyIndex.value--;
      command.value = commandHistory.value[historyIndex.value];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex.value < commandHistory.value.length - 1) {
      historyIndex.value++;
      command.value = commandHistory.value[historyIndex.value];
    } else {
      historyIndex.value = commandHistory.value.length;
      command.value = '';
    }
  }
}

async function sendBroadcast() {
  if (!broadcastMessage.value.trim()) return;
  try {
    await rconStore.broadcast(broadcastMessage.value.trim());
    broadcastMessage.value = '';
    showBroadcastDialog.value = false;
  } catch {
    // Error handling
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">{{ $t('rcon.title') }}</h1>
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="showBroadcastDialog = true">
          Broadcast
        </Button>
        <Button
          v-if="rconStore.history.length > 0"
          variant="ghost"
          size="sm"
          @click="rconStore.clearHistory()"
        >
          {{ $t('rcon.clearHistory') }}
        </Button>
      </div>
    </div>

    <!-- Command Input -->
    <Card>
      <CardContent class="pt-6">
        <form class="flex gap-3" @submit.prevent="executeCommand">
          <Input
            v-model="command"
            :placeholder="$t('rcon.placeholder')"
            class="flex-1 font-mono"
            :disabled="rconStore.loading"
            @keydown="handleKeyDown"
          />
          <Button type="submit" :disabled="rconStore.loading || !command.trim()">
            {{ $t('rcon.execute') }}
          </Button>
        </form>
      </CardContent>
    </Card>

    <!-- Command History -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-lg">{{ $t('rcon.history') }}</CardTitle>
      </CardHeader>
      <Separator />
      <ScrollArea class="h-[500px]">
        <div v-if="rconStore.history.length === 0" class="px-6 py-8 text-center text-muted-foreground">
          No commands executed yet
        </div>

        <div
          v-for="(item, index) in [...rconStore.history].reverse()"
          :key="index"
          class="border-b p-4 last:border-0"
        >
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <code class="rounded bg-muted px-2 py-1 font-mono text-sm">{{ item.command }}</code>
              <Badge
                :variant="item.success ? 'default' : 'destructive'"
                class="text-xs"
              >
                {{ item.success ? 'OK' : 'Error' }}
              </Badge>
            </div>
            <span class="text-xs text-muted-foreground">{{ formatTime(item.timestamp) }}</span>
          </div>
          <div class="rounded bg-muted/50 p-3">
            <pre class="whitespace-pre-wrap font-mono text-sm">{{ item.response }}</pre>
          </div>
        </div>
      </ScrollArea>
    </Card>

    <!-- Broadcast Dialog -->
    <Dialog :open="showBroadcastDialog" @update:open="(v: boolean) => showBroadcastDialog = v">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Server Broadcast</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <Textarea
            v-model="broadcastMessage"
            placeholder="Enter broadcast message..."
            rows="3"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showBroadcastDialog = false">
            {{ $t('general.cancel') }}
          </Button>
          <Button :disabled="!broadcastMessage.trim()" @click="sendBroadcast">
            Send Broadcast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
