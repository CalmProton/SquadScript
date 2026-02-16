<script setup lang="ts">
import { useNotificationsStore } from '~/stores/notifications';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';

const { loggedIn, user, clear } = useUserSession();
const { $t } = useNuxtApp();
const { isAdmin, isModerator, canAccessRcon, canManageUsers } = usePermissions();
const notificationsStore = useNotificationsStore();

onMounted(() => {
  notificationsStore.fetchNotifications();
  useWebSocket();
});

const navItems = computed(() => {
  const items = [
    { to: '/', label: 'nav.dashboard', show: true },
    { to: '/players', label: 'nav.players', show: true },
    { to: '/teams', label: 'nav.teams', show: true },
    { to: '/logs', label: 'nav.logs', show: true },
    { to: '/plugins', label: 'nav.plugins', show: true },
    { to: '/rcon', label: 'nav.rcon', show: canAccessRcon.value },
    { to: '/notifications', label: 'nav.notifications', show: true },
    { to: '/users', label: 'nav.users', show: canManageUsers.value },
    { to: '/settings', label: 'nav.settings', show: true },
  ];
  return items.filter((item) => item.show);
});

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
          <!-- Notification bell -->
          <NuxtLink to="/notifications" class="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <Badge
              v-if="notificationsStore.unreadCount > 0"
              variant="destructive"
              class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {{ notificationsStore.unreadCount > 9 ? '9+' : notificationsStore.unreadCount }}
            </Badge>
          </NuxtLink>

          <Separator orientation="vertical" class="h-6" />

          <span v-if="user" class="text-sm text-muted-foreground">
            {{ user.username }}
          </span>
          <Button
            v-if="loggedIn"
            variant="ghost"
            size="sm"
            @click="handleLogout"
          >
            {{ $t('auth.signOut') }}
          </Button>
        </div>
      </header>

      <!-- Page content -->
      <main class="p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
