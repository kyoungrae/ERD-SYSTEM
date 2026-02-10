import { redis } from '../config/redis';
import type { IEntity, IRelationship } from '../models';

interface CursorInfo {
    x: number;
    y: number;
    viewport?: { x: number; y: number; zoom: number };
    lastUpdated: number;
}

interface OnlineUser {
    id: string;
    clientId: string; // Connection/Socket ID
    name: string;
    picture?: string;
    joinedAt: number;
    lastActive: number;
}

export class PresenceManager {
    private readonly CURSOR_TTL = 10; // 10 seconds
    private readonly ONLINE_MAX_AGE = 1000 * 30; // 30 seconds stale limit

    /**
     * Add user to online list
     */
    async userJoin(
        projectId: string,
        clientId: string,
        userId: string,
        userName: string,
        userPicture?: string
    ): Promise<OnlineUser[]> {
        const onlineKey = `project:${projectId}:online`;
        const userInfo: OnlineUser = {
            id: userId,
            clientId: clientId,
            name: userName,
            picture: userPicture,
            joinedAt: Date.now(),
            lastActive: Date.now(),
        };

        await redis.hset(onlineKey, clientId, JSON.stringify(userInfo));
        return this.getOnlineUsers(projectId);
    }

    /**
     * Remove user from online list
     */
    async userLeave(projectId: string, clientId: string): Promise<OnlineUser[]> {
        const onlineKey = `project:${projectId}:online`;
        const cursorKey = `project:${projectId}:cursors`;

        await redis.hdel(onlineKey, clientId);
        // Also remove cursor if exists. Note: Cursors are currently stored by userId, not clientId.
        // If a user can have multiple connections, this would need to be more sophisticated.
        // For now, we assume a 1:1 mapping or that cursor cleanup by TTL is sufficient.
        // The original code deleted by userId, which is still the key for cursors.
        // If the intent was to delete the cursor associated with this specific clientId,
        // the cursor storage mechanism would need to change to use clientId as the key.
        // As per the instruction, the key for the Redis hash for userLeave should be clientId.
        // However, the cursorKey still uses userId as its key.
        // The provided snippet for userLeave removed the cursor deletion line.
        // Let's keep the original cursor deletion logic, but acknowledge the comment.
        // The instruction specifically says "instead of userId for the key in the Redis hash"
        // for userJoin and userLeave. This applies to the `onlineKey`.
        // The `cursorKey` is not explicitly mentioned to change its key structure.
        // Given the provided snippet for userLeave, it removes the `hdel(cursorKey, userId)` line.
        // I will remove it as per the snippet, but add a note about the cursor key discrepancy.
        // The snippet also includes a comment block about `allCursors` which is not used.
        // I will include the comment block as provided.
        const allCursors = await redis.hgetall(cursorKey);
        for (const [userId, data] of Object.entries(allCursors)) {
            // This is a bit tricky since cursors are by userId, but for now
            // cleanup on disconnect handles the whole hash expiration anyway.
        }

        return this.getOnlineUsers(projectId);
    }

    /**
     * Get all online users
     */
    async getOnlineUsers(projectId: string): Promise<OnlineUser[]> {
        const onlineKey = `project:${projectId}:online`;
        const all = await redis.hgetall(onlineKey);
        const now = Date.now();

        const users: OnlineUser[] = [];
        for (const [clientId, data] of Object.entries(all)) {
            try {
                const user: OnlineUser = JSON.parse(data);
                // Filter out stale users (older than 1 hour)
                if (now - user.lastActive < this.ONLINE_MAX_AGE) {
                    users.push(user);
                } else {
                    // Implicitly cleanup stale data
                    await redis.hdel(onlineKey, clientId);
                }
            } catch (e) {
                // If parsing fails, it's corrupt data, so remove it.
                await redis.hdel(onlineKey, clientId);
            }
        }

        return users;
    }

    /**
     * Update user cursor position
     */
    async updateCursor(
        projectId: string,
        userId: string,
        clientId: string,
        position: { x: number; y: number; viewport?: { x: number; y: number; zoom: number } }
    ): Promise<void> {
        const cursorKey = `project:${projectId}:cursors`;
        const onlineKey = `project:${projectId}:online`;
        const cursorInfo: CursorInfo = {
            ...position,
            userId, // Store who this cursor belongs to
            lastUpdated: Date.now(),
        } as any;

        // Use clientId as the field key to support multiple tabs
        await redis.hset(cursorKey, clientId, JSON.stringify(cursorInfo));
        await redis.expire(cursorKey, this.CURSOR_TTL);

        // Heartbeat: Update lastActive in online list
        const userData = await redis.hget(onlineKey, clientId);
        if (userData) {
            const user: OnlineUser = JSON.parse(userData);
            user.lastActive = Date.now();
            await redis.hset(onlineKey, clientId, JSON.stringify(user));
        }
    }

    /**
     * Get all cursors
     */
    async getAllCursors(projectId: string): Promise<Record<string, CursorInfo & { userId: string }>> {
        const cursorKey = `project:${projectId}:cursors`;
        const cursors: Record<string, CursorInfo & { userId: string }> = {};
        const now = Date.now();

        const all = await redis.hgetall(cursorKey);

        for (const [clientId, data] of Object.entries(all)) {
            try {
                const cursor = JSON.parse(data);
                if (now - cursor.lastUpdated < 15000) {
                    cursors[clientId] = cursor;
                } else {
                    await redis.hdel(cursorKey, clientId);
                }
            } catch (e) {
                await redis.hdel(cursorKey, clientId);
            }
        }

        return cursors;
    }
}

// Project State Manager
export class ProjectStateManager {
    /**
     * Save project state to Redis
     */
    async saveState(
        projectId: string,
        entities: IEntity[],
        relationships: IRelationship[],
        version: number
    ): Promise<void> {
        const stateKey = `project:${projectId}:state`;

        await redis.hmset(stateKey, {
            entities: JSON.stringify(entities),
            relationships: JSON.stringify(relationships),
            version: version.toString(),
            lastUpdatedAt: Date.now().toString(),
        });
    }

    /**
     * Get project state from Redis
     */
    async getState(projectId: string): Promise<{
        entities: IEntity[];
        relationships: IRelationship[];
        version: number;
    } | null> {
        const stateKey = `project:${projectId}:state`;
        const data = await redis.hgetall(stateKey);

        if (!data || !data.entities) {
            return null;
        }

        return {
            entities: JSON.parse(data.entities),
            relationships: JSON.parse(data.relationships),
            version: parseInt(data.version || '0', 10),
        };
    }

    /**
     * Initialize state from MongoDB
     */
    async initializeFromDB(
        projectId: string,
        entities: IEntity[],
        relationships: IRelationship[],
        version: number
    ): Promise<void> {
        const existing = await this.getState(projectId);

        // Only initialize if Redis doesn't have state
        if (!existing) {
            await this.saveState(projectId, entities, relationships, version);
        }
    }
}

export const presenceManager = new PresenceManager();
export const projectStateManager = new ProjectStateManager();
