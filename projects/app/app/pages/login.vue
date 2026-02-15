<script setup lang="ts">
const { loggedIn, fetch: fetchSession } = useUserSession();

definePageMeta({
  layout: 'auth',
});

const { $t } = useNuxtApp();
const router = useRouter();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

// Redirect if already logged in
watchEffect(() => {
  if (loggedIn.value) {
    router.push('/');
  }
});

async function handleLogin() {
  error.value = '';
  loading.value = true;

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value,
      },
    });
    await fetchSession();
    await navigateTo('/', { replace: true });
  } catch (e: unknown) {
    error.value = $t('auth.invalidCredentials');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
    <div class="space-y-2 text-center">
      <h1 class="text-2xl font-bold">SquadScript</h1>
      <p class="text-muted-foreground">{{ $t('auth.signIn') }}</p>
    </div>

    <form class="space-y-4" @submit.prevent="handleLogin">
      <div class="space-y-2">
        <label for="username" class="text-sm font-medium">
          {{ $t('auth.username') }}
        </label>
        <input
          id="username"
          v-model="username"
          type="text"
          :placeholder="$t('auth.enterUsername')"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          required
        />
      </div>

      <div class="space-y-2">
        <label for="password" class="text-sm font-medium">
          {{ $t('auth.password') }}
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          :placeholder="$t('auth.enterPassword')"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          required
        />
      </div>

      <div v-if="error" class="text-sm text-destructive">
        {{ error }}
      </div>

      <button
        type="submit"
        class="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        :disabled="loading"
      >
        {{ loading ? $t('general.loading') : $t('auth.signIn') }}
      </button>
    </form>
  </div>
</template>
