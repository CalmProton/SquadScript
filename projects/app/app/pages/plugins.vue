<script setup lang="ts">
import { usePluginsStore } from '~/stores/plugins';
import type { PluginDTO } from '@squadscript/types/api';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '~/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '~/components/ui/table';

const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

const pluginsStore = usePluginsStore();

onMounted(() => {
  pluginsStore.fetchPlugins();
});

const selectedPlugin = ref<PluginDTO | null>(null);
const showConfigDialog = ref(false);

function openConfig(plugin: PluginDTO) {
  selectedPlugin.value = plugin;
  showConfigDialog.value = true;
}

function closeConfig() {
  showConfigDialog.value = false;
  selectedPlugin.value = null;
}

async function togglePlugin(plugin: PluginDTO) {
  try {
    await pluginsStore.updatePlugin(plugin.name, { enabled: !plugin.enabled });
  } catch {
    // Toggle failed - the store won't be updated
  }
}

function getStateBadgeVariant(state: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (state === 'running') return 'default';
  if (state === 'error') return 'destructive';
  if (state === 'stopped') return 'secondary';
  return 'outline';
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">{{ $t('plugins.title') }}</h1>
      <div class="flex items-center gap-2">
        <Badge variant="default">{{ pluginsStore.enabledPlugins.length }} enabled</Badge>
        <Badge variant="outline">{{ pluginsStore.plugins.length }} total</Badge>
      </div>
    </div>

    <!-- Plugins Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="plugin in pluginsStore.plugins" :key="plugin.name">
        <CardHeader>
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <CardTitle class="text-base">{{ plugin.name }}</CardTitle>
              <CardDescription>{{ plugin.description }}</CardDescription>
            </div>
            <Badge :variant="getStateBadgeVariant(plugin.state)" class="text-xs">
              {{ plugin.state }}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <span>v{{ plugin.version }}</span>
            <span v-if="plugin.optionsSpec.length > 0">
              &middot; {{ plugin.optionsSpec.length }} options
            </span>
          </div>
        </CardContent>
        <CardFooter class="flex justify-between">
          <div class="flex items-center gap-2">
            <Switch
              :checked="plugin.enabled"
              @update:checked="togglePlugin(plugin)"
            />
            <span class="text-sm">{{ plugin.enabled ? $t('plugins.enabled') : $t('plugins.disabled') }}</span>
          </div>
          <Button size="sm" variant="outline" @click="openConfig(plugin)">
            {{ $t('plugins.configure') }}
          </Button>
        </CardFooter>
      </Card>

      <div v-if="pluginsStore.plugins.length === 0 && !pluginsStore.loading" class="col-span-full py-8 text-center text-muted-foreground">
        {{ $t('plugins.noPlugins') }}
      </div>
    </div>

    <!-- Config Dialog -->
    <Dialog :open="showConfigDialog" @update:open="closeConfig">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {{ $t('plugins.configuration') }}: {{ selectedPlugin?.name }}
          </DialogTitle>
          <DialogDescription>
            {{ selectedPlugin?.description }}
          </DialogDescription>
        </DialogHeader>

        <!-- Current Options -->
        <div v-if="selectedPlugin" class="space-y-4">
          <div v-if="Object.keys(selectedPlugin.options).length > 0">
            <h4 class="mb-2 text-sm font-medium">Current Values</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Option</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(value, key) in selectedPlugin.options" :key="String(key)">
                  <TableCell class="font-mono text-sm">{{ key }}</TableCell>
                  <TableCell class="text-sm">{{ JSON.stringify(value) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Options Spec -->
          <div v-if="selectedPlugin.optionsSpec.length > 0">
            <h4 class="mb-2 text-sm font-medium">Options Schema</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Default</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="spec in selectedPlugin.optionsSpec" :key="spec.name">
                  <TableCell>
                    <div>
                      <span class="font-mono text-sm">{{ spec.name }}</span>
                      <p class="text-xs text-muted-foreground">{{ spec.description }}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" class="text-xs">{{ spec.type }}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="spec.required ? 'destructive' : 'outline'" class="text-xs">
                      {{ spec.required ? 'required' : 'optional' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-sm">{{ JSON.stringify(spec.default) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div v-if="selectedPlugin.optionsSpec.length === 0 && Object.keys(selectedPlugin.options).length === 0">
            <p class="text-sm text-muted-foreground">This plugin has no configurable options.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeConfig">{{ $t('general.cancel') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
