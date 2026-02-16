<script setup lang="ts">
import { useNotificationsStore } from '~/stores/notifications';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';

definePageMeta({
  middleware: 'auth',
});

const notificationsStore = useNotificationsStore();

onMounted(() => {
  notificationsStore.fetchNotifications();
});

function getSeverityVariant(severity: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (severity === 'error' || severity === 'critical') return 'destructive';
  if (severity === 'warning') return 'secondary';
  if (severity === 'success') return 'default';
  return 'outline';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return d.toLocaleDateString();
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Notifications</h1>
      <div class="flex items-center gap-2">
        <Badge v-if="notificationsStore.unreadCount > 0" variant="destructive">
          {{ notificationsStore.unreadCount }} unread
        </Badge>
        <Button
          v-if="notificationsStore.unreadCount > 0"
          variant="outline"
          size="sm"
          @click="notificationsStore.markAllAsRead()"
        >
          Mark all as read
        </Button>
      </div>
    </div>

    <div class="space-y-2">
      <Card
        v-for="notification in notificationsStore.notifications"
        :key="notification.id"
        :class="[
          'transition-colors',
          !notification.read && 'border-primary/30 bg-primary/5',
        ]"
      >
        <CardContent class="flex items-start gap-4 pt-4">
          <div class="flex-1 space-y-1">
            <div class="flex items-center gap-2">
              <Badge :variant="getSeverityVariant(notification.severity)" class="text-xs">
                {{ notification.severity }}
              </Badge>
              <Badge variant="outline" class="text-xs">{{ notification.type }}</Badge>
              <span class="text-xs text-muted-foreground">{{ formatDate(notification.createdAt) }}</span>
              <Badge v-if="!notification.read" variant="default" class="text-xs">new</Badge>
            </div>
            <h3 class="font-medium">{{ notification.title }}</h3>
            <p v-if="notification.message" class="text-sm text-muted-foreground">
              {{ notification.message }}
            </p>
          </div>
          <Button
            v-if="!notification.read"
            variant="ghost"
            size="sm"
            class="shrink-0"
            @click="notificationsStore.markAsRead(notification.id)"
          >
            Mark read
          </Button>
        </CardContent>
      </Card>

      <div v-if="notificationsStore.notifications.length === 0 && !notificationsStore.loading" class="py-12 text-center text-muted-foreground">
        No notifications yet
      </div>
    </div>
  </div>
</template>
