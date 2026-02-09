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
    name: string;
    picture?: string;
    joinedAt: number;
}

export class PresenceManager {
    private readonly CURSOR_TTL = 10; // 10 seconds

    /**
     * Add user to online list
     */
    async userJoin(
        projectId: string,
        userId: string,
        userName: string,
        userPicture?: string
    ): Promise<OnlineUser[]> {
        const onlineKey = `project:${projectId}:online`;
        const userInfo: OnlineUser = {
            id: userId,
            name: userName,
            picture: userPicture,
            joinedAt: Date.now(),
        };

        await redis.hset(onlineKey, userId, JSON.stringify(userInfo));
        return this.getOnlineUsers(projectId);
    }

    /**
     * Remove user from online list
     */
    async userLeave(projectId: string, userId: string): Promise<OnlineUser[]> {
        const onlineKey = `project:${projectId}:online`;
        const cursorKey = `project:${projectId}:cursors`;

        await redis.hdel(onlineKey, userId);
        await redis.hdel(cursorKey, userId);

        return this.getOnlineUsers(projectId);
    }

    /**
     * Get all online users
     */
    async getOnlineUsers(projectId: string): Promise<OnlineUser[]> {
        const onlineKey = `project:${projectId}:online`;
        const all = await redis.hgetall(onlineKey);

        return Object.values(all).map(data => JSON.parse(data));
    }

    /**
     * Update user cursor position
     */
    async updateCursor(
        projectId: string,
        userId: string,
        position: { x: number; y: number; viewport?: { x: number; y: number; zoom: number } }
    ): Promise<void> {
        const cursorKey = `project:${projectId}:cursors`;
        const cursorInfo: CursorInfo = {
            ...position,
            lastUpdated: Date.now(),
        };

        await redis.hset(cursorKey, userId, JSON.stringify(cursorInfo));
        // Set TTL on the cursor (auto-cleanup on disconnect)
        await redis.expire(cursorKey, this.CURSOR_TTL);
    }

    /**
     * Get all cursors
     */
    async getAllCursors(projectId: string): Promise<Map<string, CursorInfo>> {
        const cursorKey = `project:${projectId}:cursors`;
        const cursors = new Map<string, CursorInfo>();
        const now = Date.now();

        const all = await redis.hgetall(cursorKey);

        for (const [userId, data] of Object.entries(all)) {
            const cursor: CursorInfo = JSON.parse(data);

            // Only include recent cursors (within 15 seconds)
            if (now - cursor.lastUpdated < 15000) {
                cursors.set(userId, cursor);
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
