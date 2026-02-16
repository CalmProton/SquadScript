<script setup lang="ts">
import { useSquadsStore } from '~/stores/squads';
import { usePlayersStore } from '~/stores/players';
import type { SquadDTO, PlayerDTO } from '@squadscript/types/api';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '~/components/ui/table';

const { $t } = useNuxtApp();

definePageMeta({
  middleware: 'auth',
});

const squadsStore = useSquadsStore();
const playersStore = usePlayersStore();

onMounted(() => {
  squadsStore.fetchSquads();
  playersStore.fetchPlayers();
});

function getSquadPlayers(squad: SquadDTO): PlayerDTO[] {
  return playersStore.players.filter(
    (p: PlayerDTO) => p.teamId === squad.teamId && p.squadId === squad.squadId,
  );
}

function getUnassignedPlayers(teamId: number): PlayerDTO[] {
  return playersStore.players.filter(
    (p: PlayerDTO) => p.teamId === teamId && !p.squadId,
  );
}

const expandedSquads = ref<Set<string>>(new Set());

function toggleSquad(key: string) {
  if (expandedSquads.value.has(key)) {
    expandedSquads.value.delete(key);
  } else {
    expandedSquads.value.add(key);
  }
}

function squadKey(squad: SquadDTO): string {
  return `${squad.teamId}-${squad.squadId}`;
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Teams &amp; Squads</h1>
      <div class="flex items-center gap-2">
        <Badge variant="outline">{{ squadsStore.squads.length }} squads</Badge>
        <Badge variant="outline">{{ playersStore.playerCount }} players</Badge>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Team 1 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>Team 1</span>
            <Badge variant="default">{{ squadsStore.teamOne.length }} squads</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <!-- Squads -->
          <div
            v-for="squad in squadsStore.teamOne"
            :key="squadKey(squad)"
            class="rounded-lg border"
          >
            <button
              class="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
              @click="toggleSquad(squadKey(squad))"
            >
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ squad.name }}</span>
                <Badge variant="outline" class="text-xs">{{ getSquadPlayers(squad).length }}/{{ squad.size }}</Badge>
                <Badge v-if="squad.locked" variant="destructive" class="text-xs">Locked</Badge>
              </div>
              <span class="text-xs text-muted-foreground">SL: {{ squad.creatorName }}</span>
            </button>

            <div v-if="expandedSquads.has(squadKey(squad))">
              <Table>
                <TableBody>
                  <TableRow v-for="player in getSquadPlayers(squad)" :key="player.eosId">
                    <TableCell class="py-2">
                      {{ player.name }}
                      <Badge v-if="player.isSquadLeader" variant="secondary" class="ml-1 text-xs">SL</Badge>
                    </TableCell>
                    <TableCell class="py-2 text-sm text-muted-foreground">{{ player.role ?? '-' }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <!-- Unassigned -->
          <div v-if="getUnassignedPlayers(1).length > 0" class="rounded-lg border border-dashed">
            <div class="p-3 text-sm text-muted-foreground">
              Unassigned ({{ getUnassignedPlayers(1).length }})
            </div>
            <Table>
              <TableBody>
                <TableRow v-for="player in getUnassignedPlayers(1)" :key="player.eosId">
                  <TableCell class="py-2 text-sm">{{ player.name }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div v-if="squadsStore.teamOne.length === 0" class="py-4 text-center text-sm text-muted-foreground">
            No squads
          </div>
        </CardContent>
      </Card>

      <!-- Team 2 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>Team 2</span>
            <Badge variant="secondary">{{ squadsStore.teamTwo.length }} squads</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="squad in squadsStore.teamTwo"
            :key="squadKey(squad)"
            class="rounded-lg border"
          >
            <button
              class="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
              @click="toggleSquad(squadKey(squad))"
            >
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ squad.name }}</span>
                <Badge variant="outline" class="text-xs">{{ getSquadPlayers(squad).length }}/{{ squad.size }}</Badge>
                <Badge v-if="squad.locked" variant="destructive" class="text-xs">Locked</Badge>
              </div>
              <span class="text-xs text-muted-foreground">SL: {{ squad.creatorName }}</span>
            </button>

            <div v-if="expandedSquads.has(squadKey(squad))">
              <Table>
                <TableBody>
                  <TableRow v-for="player in getSquadPlayers(squad)" :key="player.eosId">
                    <TableCell class="py-2">
                      {{ player.name }}
                      <Badge v-if="player.isSquadLeader" variant="secondary" class="ml-1 text-xs">SL</Badge>
                    </TableCell>
                    <TableCell class="py-2 text-sm text-muted-foreground">{{ player.role ?? '-' }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <!-- Unassigned -->
          <div v-if="getUnassignedPlayers(2).length > 0" class="rounded-lg border border-dashed">
            <div class="p-3 text-sm text-muted-foreground">
              Unassigned ({{ getUnassignedPlayers(2).length }})
            </div>
            <Table>
              <TableBody>
                <TableRow v-for="player in getUnassignedPlayers(2)" :key="player.eosId">
                  <TableCell class="py-2 text-sm">{{ player.name }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div v-if="squadsStore.teamTwo.length === 0" class="py-4 text-center text-sm text-muted-foreground">
            No squads
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
