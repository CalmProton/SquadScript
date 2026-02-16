<script setup lang="ts">
import { useUsersStore } from '~/stores/users';
import type { DashboardUserDTO } from '@squadscript/types/api';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '~/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '~/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '~/components/ui/select';

const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

const usersStore = useUsersStore();

onMounted(() => {
  usersStore.fetchUsers();
});

const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);
const actionLoading = ref(false);

const editingUser = ref<DashboardUserDTO | null>(null);

const newUsername = ref('');
const newPassword = ref('');
const newRole = ref('viewer');

const editRole = ref('');
const editPassword = ref('');

const roles = ['admin', 'moderator', 'viewer'];

function openCreate() {
  newUsername.value = '';
  newPassword.value = '';
  newRole.value = 'viewer';
  showCreateDialog.value = true;
}

function openEdit(user: DashboardUserDTO) {
  editingUser.value = user;
  editRole.value = user.role;
  editPassword.value = '';
  showEditDialog.value = true;
}

function openDelete(user: DashboardUserDTO) {
  editingUser.value = user;
  showDeleteDialog.value = true;
}

async function createUser() {
  actionLoading.value = true;
  try {
    await usersStore.createUser({
      username: newUsername.value,
      password: newPassword.value,
      role: newRole.value,
    });
    showCreateDialog.value = false;
  } finally {
    actionLoading.value = false;
  }
}

async function updateUser() {
  if (!editingUser.value) return;
  actionLoading.value = true;
  try {
    const data: { role?: string; password?: string } = {};
    if (editRole.value !== editingUser.value.role) data.role = editRole.value;
    if (editPassword.value) data.password = editPassword.value;
    await usersStore.updateUser(editingUser.value.id, data);
    showEditDialog.value = false;
  } finally {
    actionLoading.value = false;
  }
}

async function deleteUser() {
  if (!editingUser.value) return;
  actionLoading.value = true;
  try {
    await usersStore.deleteUser(editingUser.value.id);
    showDeleteDialog.value = false;
    editingUser.value = null;
  } finally {
    actionLoading.value = false;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'admin') return 'default';
  if (role === 'moderator') return 'secondary';
  return 'outline';
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">User Management</h1>
      <Button @click="openCreate">Create User</Button>
    </div>

    <!-- Users Table -->
    <div class="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="user in usersStore.users" :key="user.id">
            <TableCell class="font-medium">{{ user.username }}</TableCell>
            <TableCell>
              <Badge :variant="getRoleBadgeVariant(user.role)">{{ user.role }}</Badge>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">{{ formatDate(user.createdAt) }}</TableCell>
            <TableCell>
              <div class="flex gap-1">
                <Button size="sm" variant="outline" class="h-7 text-xs" @click="openEdit(user)">
                  Edit
                </Button>
                <Button size="sm" variant="destructive" class="h-7 text-xs" @click="openDelete(user)">
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="usersStore.users.length === 0 && !usersStore.loading">
            <TableCell colspan="4" class="py-8 text-center text-muted-foreground">
              No users found
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create User Dialog -->
    <Dialog :open="showCreateDialog" @update:open="(v: boolean) => showCreateDialog = v">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>Username</Label>
            <Input v-model="newUsername" />
          </div>
          <div class="space-y-2">
            <Label>Password</Label>
            <Input v-model="newPassword" type="password" />
          </div>
          <div class="space-y-2">
            <Label>Role</Label>
            <Select v-model="newRole">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="role in roles" :key="role" :value="role">
                  {{ role }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showCreateDialog = false">{{ $t('general.cancel') }}</Button>
          <Button :disabled="actionLoading || !newUsername || !newPassword" @click="createUser">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit User Dialog -->
    <Dialog :open="showEditDialog" @update:open="(v: boolean) => showEditDialog = v">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User: {{ editingUser?.username }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>Role</Label>
            <Select v-model="editRole">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="role in roles" :key="role" :value="role">
                  {{ role }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>New Password (leave blank to keep current)</Label>
            <Input v-model="editPassword" type="password" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showEditDialog = false">{{ $t('general.cancel') }}</Button>
          <Button :disabled="actionLoading" @click="updateUser">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog :open="showDeleteDialog" @update:open="(v: boolean) => showDeleteDialog = v">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
        </DialogHeader>
        <p class="py-4 text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{{ editingUser?.username }}</strong>? This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false">{{ $t('general.cancel') }}</Button>
          <Button variant="destructive" :disabled="actionLoading" @click="deleteUser">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
