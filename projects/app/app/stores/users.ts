import { defineStore } from 'pinia';
import type {
  DashboardUserDTO,
  CreateUserRequest,
  UpdateUserRequest,
} from '@squadscript/types/api';

/**
 * Users store.
 * Dashboard user management (CRUD).
 */
export const useUsersStore = defineStore('users', () => {
  const users = ref<DashboardUserDTO[]>([]);
  const loading = ref(false);

  async function fetchUsers() {
    loading.value = true;
    try {
      const api = useApi();
      const result = await api.get<DashboardUserDTO[]>('/users');
      users.value = result;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(data: CreateUserRequest) {
    const api = useApi();
    const created = await api.post<DashboardUserDTO>('/users', data);
    users.value.push(created);
    return created;
  }

  async function updateUser(id: string, data: UpdateUserRequest) {
    const api = useApi();
    const updated = await api.patch<DashboardUserDTO>(`/users/${id}`, data);
    const idx = users.value.findIndex((u) => u.id === id);
    if (idx >= 0) {
      users.value[idx] = updated;
    }
    return updated;
  }

  async function deleteUser(id: string) {
    const api = useApi();
    await api.delete(`/users/${id}`);
    users.value = users.value.filter((u) => u.id !== id);
  }

  return {
    users,
    loading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
});
