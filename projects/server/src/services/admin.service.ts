/**
 * @squadscript/server
 *
 * Admin service - manages admin lists and permission checks.
 *
 * @module
 */

import type { ModuleLogger } from '@squadscript/logger';
import type { Result } from '@squadscript/types';
import { Ok, Err, type EOSID, type SteamID } from '@squadscript/types';
import { AdminListError, ErrorCode } from '../errors.js';
import type {
  AdminListSource,
  ResolvedAdmin,
  AdminGroup,
  ParsedAdminList,
} from '../types.js';

/**
 * Options for creating an AdminService.
 */
export interface AdminServiceOptions {
  /** Logger instance. */
  readonly logger: ModuleLogger;
  /** Admin list sources to load. */
  readonly sources?: readonly AdminListSource[];
}

/**
 * Service for managing admin permissions.
 *
 * Supports loading admin lists from multiple sources:
 * - Local files
 * - Remote URLs (HTTP/HTTPS)
 *
 * Admin lists follow Squad's format:
 * - Group=GroupName:permission1,permission2,permission3
 * - Admin=SteamID64:GroupName
 * - Admin=EOSID:GroupName (32-character hex)
 *
 * @example
 * ```typescript
 * const adminService = new AdminService({
 *   logger,
 *   sources: [
 *     { type: 'local', source: '/path/to/Admins.cfg' },
 *     { type: 'remote', source: 'https://example.com/admins.txt' },
 *   ],
 * });
 *
 * await adminService.refresh();
 *
 * if (adminService.hasPermission(steamId, 'kick')) {
 *   // Allow kick
 * }
 * ```
 */
export class AdminService {
  private readonly logger: ModuleLogger;
  private readonly sources: readonly AdminListSource[];

  // Resolved admins: ID -> permissions
  private readonly admins = new Map<string, ResolvedAdmin>();

  // Track admins currently in admin cam
  private readonly inAdminCam = new Set<string>();

  constructor(options: AdminServiceOptions) {
    this.logger = options.logger;
    this.sources = options.sources ?? [];
  }

  // ===========================================================================
  // State Accessors
  // ===========================================================================

  /**
   * Gets all resolved admins.
   */
  getAll(): ReadonlyMap<string, ResolvedAdmin> {
    return this.admins;
  }

  /**
   * Gets the number of admins.
   */
  get count(): number {
    return this.admins.size;
  }

  /**
   * Gets admin permissions for a specific ID.
   *
   * @param id - Steam ID or EOS ID
   * @returns Admin info or null if not an admin
   */
  getAdmin(id: SteamID | EOSID): ResolvedAdmin | null {
    return this.admins.get(id) ?? null;
  }

  /**
   * Checks if an ID has a specific permission.
   *
   * @param id - Steam ID or EOS ID
   * @param permission - Permission to check
   * @returns True if the ID has the permission
   */
  hasPermission(id: SteamID | EOSID, permission: string): boolean {
    const admin = this.admins.get(id);
    if (!admin) return false;

    // Check for exact permission or wildcard
    return (
      admin.permissions.has(permission.toLowerCase()) ||
      admin.permissions.has('*')
    );
  }

  /**
   * Gets all permissions for an ID.
   *
   * @param id - Steam ID or EOS ID
   * @returns Set of permissions or null if not an admin
   */
  getPermissions(id: SteamID | EOSID): ReadonlySet<string> | null {
    const admin = this.admins.get(id);
    return admin?.permissions ?? null;
  }

  /**
   * Checks if an admin is currently in admin cam.
   *
   * @param id - Steam ID or EOS ID
   * @returns True if in admin cam
   */
  isInAdminCam(id: SteamID | EOSID): boolean {
    return this.inAdminCam.has(id);
  }

  /**
   * Gets all admins currently in admin cam.
   */
  getAdminsInCam(): readonly string[] {
    return Array.from(this.inAdminCam);
  }

  // ===========================================================================
  // State Updates
  // ===========================================================================

  /**
   * Refreshes admin lists from all configured sources.
   *
   * @returns Result indicating success or failure
   */
  async refresh(): Promise<Result<void, AdminListError>> {
    if (this.sources.length === 0) {
      this.logger.debug('No admin list sources configured');
      return Ok(undefined);
    }

    const allAdmins = new Map<string, ResolvedAdmin>();
    const errors: Error[] = [];

    for (const source of this.sources) {
      try {
        const content = await this.loadSource(source);
        if (!content.ok) {
          errors.push(content.error);
          continue;
        }

        const parsed = this.parseAdminList(content.value);
        if (!parsed.ok) {
          errors.push(parsed.error);
          continue;
        }

        // Merge admins from this source
        const resolved = this.resolveAdmins(parsed.value);
        for (const [id, admin] of resolved) {
          const existing = allAdmins.get(id);
          if (existing) {
            // Merge permissions
            const mergedPermissions = new Set([
              ...existing.permissions,
              ...admin.permissions,
            ]);
            allAdmins.set(id, { id: admin.id, permissions: mergedPermissions });
          } else {
            allAdmins.set(id, admin);
          }
        }

        this.logger.debug(
          `Loaded ${resolved.size} admins from ${source.type}: ${source.source}`,
        );
      } catch (error) {
        errors.push(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    // Update stored admins
    this.admins.clear();
    for (const [id, admin] of allAdmins) {
      this.admins.set(id, admin);
    }

    this.logger.info(`Loaded ${this.admins.size} admins from ${this.sources.length} sources`);

    // Return error if all sources failed
    if (errors.length === this.sources.length && this.sources.length > 0) {
      return Err(
        new AdminListError(
          ErrorCode.ADMIN_LIST_LOAD_FAILED,
          'Failed to load any admin lists',
          { errors: errors.map((e) => e.message) },
        ),
      );
    }

    return Ok(undefined);
  }

  /**
   * Sets admin cam status for an admin.
   *
   * @param id - Steam ID or EOS ID
   * @param inCam - Whether they entered or exited admin cam
   */
  setAdminCamStatus(id: SteamID | EOSID, inCam: boolean): void {
    if (inCam) {
      this.inAdminCam.add(id);
      this.logger.debug(`Admin entered cam: ${id}`);
    } else {
      this.inAdminCam.delete(id);
      this.logger.debug(`Admin exited cam: ${id}`);
    }
  }

  /**
   * Clears admin cam tracking (e.g., on new game).
   */
  clearAdminCamTracking(): void {
    this.inAdminCam.clear();
  }

  /**
   * Clears all admin data.
   */
  clear(): void {
    this.admins.clear();
    this.inAdminCam.clear();
    this.logger.debug('Admin service cleared');
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Loads content from an admin list source.
   */
  private async loadSource(
    source: AdminListSource,
  ): Promise<Result<string, AdminListError>> {
    try {
      if (source.type === 'local') {
        const file = Bun.file(source.source);
        const exists = await file.exists();
        if (!exists) {
          return Err(
            new AdminListError(
              ErrorCode.ADMIN_LIST_LOAD_FAILED,
              `Admin list file not found: ${source.source}`,
            ),
          );
        }
        const content = await file.text();
        return Ok(content);
      }

      if (source.type === 'remote') {
        const response = await fetch(source.source, {
          headers: { Accept: 'text/plain' },
        });

        if (!response.ok) {
          return Err(
            new AdminListError(
              ErrorCode.ADMIN_LIST_LOAD_FAILED,
              `Failed to fetch admin list: ${response.status} ${response.statusText}`,
              { url: source.source },
            ),
          );
        }

        const content = await response.text();
        return Ok(content);
      }

      return Err(
        new AdminListError(
          ErrorCode.ADMIN_LIST_LOAD_FAILED,
          `Unknown source type: ${source.type}`,
        ),
      );
    } catch (error) {
      return Err(
        new AdminListError(
          ErrorCode.ADMIN_LIST_LOAD_FAILED,
          `Error loading admin list: ${error instanceof Error ? error.message : String(error)}`,
          { source: source.source },
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * Parses admin list content.
   *
   * Format:
   * - Group=GroupName:permission1,permission2,permission3
   * - Admin=ID:GroupName
   * - // comments
   */
  private parseAdminList(
    content: string,
  ): Result<ParsedAdminList, AdminListError> {
    const groups = new Map<string, AdminGroup>();
    const admins = new Map<string, string>();

    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
        continue;
      }

      // Parse Group definition: Group=GroupName:permission1,permission2
      const groupMatch = trimmed.match(/^Group\s*=\s*([^:]+):(.+)$/i);
      if (groupMatch) {
        const [, name, permissionsStr] = groupMatch;
        if (name && permissionsStr) {
          const permissions = permissionsStr
            .split(',')
            .map((p) => p.trim().toLowerCase())
            .filter((p) => p.length > 0);

          groups.set(name.trim(), {
            name: name.trim(),
            permissions,
          });
        }
        continue;
      }

      // Parse Admin definition: Admin=ID:GroupName
      const adminMatch = trimmed.match(/^Admin\s*=\s*([^:]+):(.+)$/i);
      if (adminMatch) {
        const [, id, groupName] = adminMatch;
        if (id && groupName) {
          admins.set(id.trim(), groupName.trim());
        }
        continue;
      }
    }

    return Ok({ groups, admins });
  }

  /**
   * Resolves admin groups into flat permission sets.
   */
  private resolveAdmins(
    parsed: ParsedAdminList,
  ): Map<string, ResolvedAdmin> {
    const resolved = new Map<string, ResolvedAdmin>();

    for (const [id, groupName] of parsed.admins) {
      const group = parsed.groups.get(groupName);
      if (!group) {
        this.logger.warn(`Admin ${id} references unknown group: ${groupName}`);
        continue;
      }

      // Validate ID format
      const isSteamID = /^[0-9]{17}$/.test(id);
      const isEOSID = /^[0-9a-f]{32}$/i.test(id);

      if (!isSteamID && !isEOSID) {
        this.logger.warn(`Invalid admin ID format: ${id}`);
        continue;
      }

      resolved.set(id, {
        id: id as SteamID | EOSID,
        permissions: new Set(group.permissions),
      });
    }

    return resolved;
  }
}
