<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession();

const { $t } = useNuxtApp();

const navItems = [
  { to: '/', label: 'nav.dashboard', icon: 'LayoutDashboard' },
  { to: '/players', label: 'nav.players', icon: 'Users' },
  { to: '/logs', label: 'nav.logs', icon: 'FileText' },
  { to: '/plugins', label: 'nav.plugins', icon: 'Puzzle' },
  { to: '/rcon', label: 'nav.rcon', icon: 'Terminal' },
  { to: '/settings', label: 'nav.settings', icon: 'Settings' },
];

async function handleLogout() {
  await $fetch('/api/auth/logout', { method: 'POST' });
  await clear();
  navigateTo('/login');
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Sidebar -->
    <aside class="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card">
      <div class="flex h-16 items-center border-b px-6">
        <h1 class="text-xl font-bold">SquadScript</h1>
      </div>
      <nav class="space-y-1 p-4">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          active-class="bg-accent text-accent-foreground"
        >
          <span>{{ $t(item.label) }}</span>
        </NuxtLink>
      </nav>
    </aside>

    <!-- Main content -->
    <div class="pl-64">
      <!-- Header -->
      <header class="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card px-6">
        <div />
        <div class="flex items-center gap-4">
          <span v-if="user" class="text-sm text-muted-foreground">
            {{ user.username }}
          </span>
          <button
            v-if="loggedIn"
            class="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            @click="handleLogout"
          >
            {{ $t('auth.signOut') }}
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
