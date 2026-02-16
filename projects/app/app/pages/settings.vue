<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '~/components/ui/select';
import { Alert, AlertDescription } from '~/components/ui/alert';

const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

const { canEditConfig } = usePermissions();
const api = useApi();

const currentLocale = ref('en');
const theme = ref('system');
const { defaultLocale } = useI18n();

// Server config
const serverCfg = ref<Record<string, string>>({});
const serverCfgRaw = ref('');
const mapRotation = ref<string[]>([]);
const mapRotationRaw = ref('');
const configLoading = ref(false);
const configSaving = ref(false);
const configMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

onMounted(() => {
  currentLocale.value = defaultLocale.value || 'en';
  if (canEditConfig.value) {
    loadServerConfig();
    loadMapRotation();
  }
});

function changeLanguage(locale: string) {
  navigateTo(`/${locale}/settings`);
}

async function loadServerConfig() {
  configLoading.value = true;
  try {
    const result = await api.get<Record<string, string>>('/config/server');
    serverCfg.value = result;
    serverCfgRaw.value = Object.entries(result)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
  } catch {
    // Config API may not be available
  } finally {
    configLoading.value = false;
  }
}

async function loadMapRotation() {
  try {
    const result = await api.get<string[]>('/config/rotation');
    mapRotation.value = result;
    mapRotationRaw.value = result.join('\n');
  } catch {
    // Config API may not be available
  }
}

async function saveServerConfig() {
  configSaving.value = true;
  configMessage.value = null;
  try {
    const config: Record<string, string> = {};
    for (const line of serverCfgRaw.value.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        config[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
      }
    }
    await api.put('/config/server', config);
    serverCfg.value = config;
    configMessage.value = { type: 'success', text: 'Server configuration saved.' };
  } catch {
    configMessage.value = { type: 'error', text: 'Failed to save configuration.' };
  } finally {
    configSaving.value = false;
  }
}

async function saveMapRotation() {
  configSaving.value = true;
  configMessage.value = null;
  try {
    const layers = mapRotationRaw.value
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    await api.put('/config/rotation', layers);
    mapRotation.value = layers;
    configMessage.value = { type: 'success', text: 'Map rotation saved.' };
  } catch {
    configMessage.value = { type: 'error', text: 'Failed to save map rotation.' };
  } finally {
    configSaving.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">{{ $t('settings.title') }}</h1>

    <Tabs default-value="general" class="w-full">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger v-if="canEditConfig" value="server-config">Server Config</TabsTrigger>
        <TabsTrigger v-if="canEditConfig" value="map-rotation">Map Rotation</TabsTrigger>
      </TabsList>

      <!-- General Settings -->
      <TabsContent value="general" class="max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{{ $t('settings.language') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select v-model="currentLocale" @update:model-value="changeLanguage">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="uk">Українська</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{{ $t('settings.theme') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex gap-4">
              <label class="flex items-center gap-2">
                <input v-model="theme" type="radio" value="light" class="h-4 w-4" />
                <span>{{ $t('settings.light') }}</span>
              </label>
              <label class="flex items-center gap-2">
                <input v-model="theme" type="radio" value="dark" class="h-4 w-4" />
                <span>{{ $t('settings.dark') }}</span>
              </label>
              <label class="flex items-center gap-2">
                <input v-model="theme" type="radio" value="system" class="h-4 w-4" />
                <span>{{ $t('settings.system') }}</span>
              </label>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Server Config Tab -->
      <TabsContent v-if="canEditConfig" value="server-config" class="space-y-4">
        <Alert v-if="configMessage">
          <AlertDescription :class="configMessage.type === 'error' ? 'text-destructive' : 'text-green-600'">
            {{ configMessage.text }}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Server.cfg</CardTitle>
            <CardDescription>
              Edit server configuration (key=value format, one per line).
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <Textarea
              v-model="serverCfgRaw"
              rows="20"
              class="font-mono text-sm"
              :disabled="configLoading"
            />
            <Button :disabled="configSaving" @click="saveServerConfig">
              Save Server Config
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Map Rotation Tab -->
      <TabsContent v-if="canEditConfig" value="map-rotation" class="space-y-4">
        <Alert v-if="configMessage">
          <AlertDescription :class="configMessage.type === 'error' ? 'text-destructive' : 'text-green-600'">
            {{ configMessage.text }}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>MapRotation.cfg</CardTitle>
            <CardDescription>
              One layer per line. Order determines rotation sequence.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <Textarea
              v-model="mapRotationRaw"
              rows="20"
              class="font-mono text-sm"
              :disabled="configLoading"
            />
            <Button :disabled="configSaving" @click="saveMapRotation">
              Save Map Rotation
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
