<script setup lang="ts">
import { useNotificationsStore } from '~/stores/notifications';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';

const { $t } = useNuxtApp();
const { formatRelativeTime } = useLocaleFormatters();

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
  return formatRelativeTime(iso);
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">{{ $t('notifications.title') }}</h1>
      <div class="flex items-center gap-2">
        <Badge v-if="notificationsStore.unreadCount > 0" variant="destructive">
          {{ $t('notifications.unreadCount', { count: notificationsStore.unreadCount }) }}
        </Badge>
        <Button
          v-if="notificationsStore.unreadCount > 0"
          variant="outline"
          size="sm"
          @click="notificationsStore.markAllAsRead()"
        >
          {{ $t('notifications.markAllAsRead') }}
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
              <Badge v-if="!notification.read" variant="default" class="text-xs">{{ $t('notifications.new') }}</Badge>
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
            {{ $t('notifications.markRead') }}
          </Button>
        </CardContent>
      </Card>

      <div v-if="notificationsStore.notifications.length === 0 && !notificationsStore.loading" class="py-12 text-center text-muted-foreground">
        {{ $t('notifications.noNotifications') }}
      </div>
    </div>
  </div>
</template>
