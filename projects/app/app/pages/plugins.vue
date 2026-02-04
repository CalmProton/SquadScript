<script setup lang="ts">
const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

// Mock data - replace with actual API calls
const plugins = ref([
  { id: 'auto-kick-unassigned', name: 'Auto Kick Unassigned', enabled: true, description: 'Automatically kicks players who remain unassigned' },
  { id: 'team-randomizer', name: 'Team Randomizer', enabled: true, description: 'Randomizes teams at match start' },
  { id: 'seeding-mode', name: 'Seeding Mode', enabled: false, description: 'Manages seeding mode rules' },
  { id: 'squad-name-enforcer', name: 'Squad Name Enforcer', enabled: true, description: 'Enforces squad naming conventions' },
]);

const selectedPlugin = ref<typeof plugins.value[0] | null>(null);
const showConfigDialog = ref(false);

function togglePlugin(plugin: typeof plugins.value[0]) {
  plugin.enabled = !plugin.enabled;
  // TODO: Save to server
}

function openConfig(plugin: typeof plugins.value[0]) {
  selectedPlugin.value = plugin;
  showConfigDialog.value = true;
}

function saveConfig() {
  // TODO: Save configuration
  showConfigDialog.value = false;
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">{{ $t('plugins.title') }}</h1>

    <!-- Plugins Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="plugin in plugins"
        :key="plugin.id"
        class="rounded-lg border bg-card p-6"
      >
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h3 class="font-semibold">{{ plugin.name }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ plugin.description }}</p>
          </div>
          <span
            :class="[
              'rounded px-2 py-1 text-xs',
              plugin.enabled ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'
            ]"
          >
            {{ plugin.enabled ? $t('plugins.enabled') : $t('plugins.disabled') }}
          </span>
        </div>
        <div class="flex gap-2">
          <button
            :class="[
              'rounded-md px-3 py-1.5 text-sm',
              plugin.enabled ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
            ]"
            @click="togglePlugin(plugin)"
          >
            {{ plugin.enabled ? $t('plugins.disable') : $t('plugins.enable') }}
          </button>
          <button
            class="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
            @click="openConfig(plugin)"
          >
            {{ $t('plugins.configure') }}
          </button>
        </div>
      </div>

      <div v-if="plugins.length === 0" class="col-span-full py-8 text-center text-muted-foreground">
        {{ $t('plugins.noPlugins') }}
      </div>
    </div>

    <!-- Config Dialog -->
    <div v-if="showConfigDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-full max-w-lg rounded-lg bg-card p-6">
        <h2 class="mb-4 text-lg font-semibold">
          {{ $t('plugins.configuration') }}: {{ selectedPlugin?.name }}
        </h2>
        <p class="mb-4 text-sm text-muted-foreground">
          Plugin configuration options will be displayed here based on the plugin's schema.
        </p>
        <div class="flex justify-end gap-2">
          <button
            class="rounded-md bg-secondary px-4 py-2 text-sm"
            @click="showConfigDialog = false"
          >
            {{ $t('general.cancel') }}
          </button>
          <button
            class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            @click="saveConfig"
          >
            {{ $t('plugins.saveConfig') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
