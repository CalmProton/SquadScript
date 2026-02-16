import { defineStore } from 'pinia';
import type { NotificationDTO } from '@squadscript/types/api';

/**
 * Notifications store.
 * Notification feed with read/unread tracking.
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<NotificationDTO[]>([]);
  const loading = ref(false);

  const unreadCount = computed(
    () => notifications.value.filter((n) => !n.read).length,
  );

  function addNotification(notification: NotificationDTO) {
    notifications.value.unshift(notification);
  }

  async function fetchNotifications() {
    loading.value = true;
    try {
      const api = useApi();
      const result = await api.get<NotificationDTO[]>('/notifications');
      notifications.value = result;
    } finally {
      loading.value = false;
    }
  }

  async function markAsRead(id: number) {
    const api = useApi();
    await api.post(`/notifications/${id}/read`);
    const idx = notifications.value.findIndex((n) => n.id === id);
    if (idx >= 0) {
      notifications.value[idx] = { ...notifications.value[idx], read: true };
    }
  }

  async function markAllAsRead() {
    const api = useApi();
    await api.post('/notifications/read-all');
    notifications.value = notifications.value.map((n) => ({ ...n, read: true }));
  }

  return {
    notifications,
    loading,
    unreadCount,
    addNotification,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
});
