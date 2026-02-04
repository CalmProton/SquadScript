<script setup lang="ts">
const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

const currentLocale = ref('en');
const theme = ref('system');

const { defaultLocale } = useI18n();

onMounted(() => {
  currentLocale.value = defaultLocale.value || 'en';
});

function changeLanguage(locale: string) {
  // Navigate to the new locale
  navigateTo(`/${locale}/settings`);
}

function saveSettings() {
  // TODO: Save settings
  console.log('Settings saved:', { locale: currentLocale.value, theme: theme.value });
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">{{ $t('settings.title') }}</h1>

    <div class="max-w-lg space-y-6">
      <!-- Language -->
      <div class="rounded-lg border bg-card p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ $t('settings.language') }}</h2>
        <select
          v-model="currentLocale"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          @change="changeLanguage(currentLocale)"
        >
          <option value="en">English</option>
          <option value="ru">Русский</option>
          <option value="uk">Українська</option>
        </select>
      </div>

      <!-- Theme -->
      <div class="rounded-lg border bg-card p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ $t('settings.theme') }}</h2>
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
      </div>

      <!-- Save Button -->
      <button
        class="inline-flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        @click="saveSettings"
      >
        {{ $t('settings.saveSettings') }}
      </button>
    </div>
  </div>
</template>
