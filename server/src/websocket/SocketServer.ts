import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Types } from 'mongoose';
import { config } from '../config';
import { syncEngine, type CRDTOperation, type ERDState } from '../services/SyncEngine';
import { lockManager } from '../services/LockManager';
import { presenceManager, projectStateManager } from '../services/PresenceManager';
import { Project, History } from '../models';

interface UserInfo {
    id: string;
    name: string;
    picture?: string;
}

interface SocketData {
    user: UserInfo;
    projectId?: string;
}

export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: (origin, callback) => {
                const allowed = [
                    config.frontendUrl,
                    'http://localhost:5173',
                    'http://127.0.0.1:5173',
                ];
                if (!origin || allowed.includes(origin) || origin.startsWith('http://192.168.')) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.on('connection', (socket: Socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Store user data on socket
        const socketData: SocketData = {
            user: { id: 'anonymous', name: 'Anonymous' },
        };

        // Authenticate user
        socket.on('authenticate', async (userData: UserInfo) => {
            const oldUserId = socketData.user.id;
            socketData.user = userData;
            console.log(`✅ User authenticated: ${userData.name}`);

            // If already in a project, update the presence with new identity
            if (socketData.projectId) {
                const onlineUsers = await presenceManager.userJoin(
                    socketData.projectId,
                    socket.id, // Use socket.id as key
                    userData.id,
                    userData.name,
                    userData.picture
                );

                // Notify others of identity update
                io.to(`project:${socketData.projectId}`).emit('user_joined', {
                    user: userData,
                    onlineUsers,
                });
            }

            socket.emit('authenticated', { success: true });
        });

        // Join project room
        socket.on('join_project', async (data: { projectId: string }) => {
            const { projectId } = data;
            socketData.projectId = projectId;

            // Leave previous rooms
            socket.rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.leave(room);
                }
            });

            // Join new project room
            socket.join(`project:${projectId}`);

            // Add to online users
            const onlineUsers = await presenceManager.userJoin(
                projectId,
                socket.id, // clientId
                socketData.user.id,
                socketData.user.name,
                socketData.user.picture
            );

            // ... (rest of join logic)

            // Get current state
            let state = await projectStateManager.getState(projectId);

            // If no state in Redis, load from MongoDB
            if (!state) {
                // Check if projectId is a valid MongoDB ObjectId
                if (Types.ObjectId.isValid(projectId)) {
                    const project = await Project.findById(projectId);
                    if (project) {
                        state = {
                            entities: project.currentSnapshot.entities || [],
                            relationships: project.currentSnapshot.relationships || [],
                            version: project.currentSnapshot.version || 0,
                        };
                        await projectStateManager.initializeFromDB(
                            projectId,
                            state.entities,
                            state.relationships,
                            state.version
                        );
                    } else {
                        // Project not found in DB
                        state = { entities: [], relationships: [], version: 0 };
                    }
                } else {
                    // Invalid ObjectId (e.g. temporary ID 'proj_...'), treat as new empty project
                    console.log(`ℹ️ Project ID ${projectId} is not a valid ObjectId (likely temporary), initializing empty state.`);
                    state = { entities: [], relationships: [], version: 0 };
                }
            }

            // Get current locks
            const locks = await lockManager.getAllLocks(projectId);
            const locksObject: Record<string, unknown> = {};
            locks.forEach((value, key) => {
                locksObject[key] = value;
            });

            // Send current state to joining user
            socket.emit('state_sync', {
                state,
                onlineUsers,
                locks: locksObject,
            });

            // Notify others of new user
            socket.to(`project:${projectId}`).emit('user_joined', {
                user: socketData.user,
                onlineUsers,
            });

            console.log(`👤 ${socketData.user.name} joined project ${projectId}`);
        });

        // Handle ERD operations
        socket.on('operation', async (operation: CRDTOperation) => {
            if (!socketData.projectId) return;

            const projectId = socketData.projectId;

            // Update Lamport clock
            syncEngine.updateClock(projectId, operation.lamportClock);

            // Get current state
            let state = await projectStateManager.getState(projectId);
            if (!state) {
                state = { entities: [], relationships: [], version: 0 };
            }

            // Apply operation
            const newState = syncEngine.applyOperation(state, operation);

            // Save to Redis
            await projectStateManager.saveState(
                projectId,
                newState.entities,
                newState.relationships,
                newState.version
            );

            // Broadcast to all other clients in the project
            socket.to(`project:${projectId}`).emit('operation', {
                ...operation,
                appliedAt: Date.now(),
            });

            // Save to MongoDB (debounced, every 5 seconds)
            debouncedSaveToMongo(projectId, newState);
        });

        // Handle cursor movement
        socket.on('cursor_move', async (data: { x: number; y: number; viewport?: { x: number; y: number; zoom: number } }) => {
            if (!socketData.projectId) return;

            await presenceManager.updateCursor(socketData.projectId, socketData.user.id, socket.id, data);

            // Broadcast to others
            socket.to(`project:${socketData.projectId}`).emit('cursor_update', {
                userId: socketData.user.id,
                clientId: socket.id, // Support multi-tab sessions
                userName: socketData.user.name,
                userPicture: socketData.user.picture,
                ...data,
            });
        });

        // Handle lock requests
        socket.on('request_lock', async (data: { entityId: string }) => {
            if (!socketData.projectId) return;

            const result = await lockManager.acquireLock(
                socketData.projectId,
                data.entityId,
                socketData.user.id,
                socketData.user.name
            );

            if (result.success) {
                // Notify all clients of lock acquisition
                io.to(`project:${socketData.projectId}`).emit('lock_acquired', {
                    entityId: data.entityId,
                    userId: socketData.user.id,
                    userName: socketData.user.name,
                });
                socket.emit('lock_result', { success: true, entityId: data.entityId });
            } else {
                socket.emit('lock_result', {
                    success: false,
                    entityId: data.entityId,
                    holder: result.holder,
                });
            }
        });

        // Handle lock release
        socket.on('release_lock', async (data: { entityId: string }) => {
            if (!socketData.projectId) return;

            const released = await lockManager.releaseLock(
                socketData.projectId,
                data.entityId,
                socketData.user.id
            );

            if (released) {
                io.to(`project:${socketData.projectId}`).emit('lock_released', {
                    entityId: data.entityId,
                });
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);

            if (socketData.projectId) {
                // Remove from online users using socket.id
                const onlineUsers = await presenceManager.userLeave(
                    socketData.projectId,
                    socket.id
                );

                // Release all locks held by this user
                await lockManager.releaseAllUserLocks(socketData.projectId, socketData.user.id);

                // Notify others
                socket.to(`project:${socketData.projectId}`).emit('user_left', {
                    userId: socketData.user.id,
                    onlineUsers,
                });
            }
        });
    });

    return io;
}

// Debounced save to MongoDB
const saveTimers = new Map<string, NodeJS.Timeout>();

function debouncedSaveToMongo(projectId: string, state: ERDState): void {
    const existing = saveTimers.get(projectId);
    if (existing) {
        clearTimeout(existing);
    }

    const timer = setTimeout(async () => {
        try {
            if (Types.ObjectId.isValid(projectId)) {
                await Project.findByIdAndUpdate(projectId, {
                    currentSnapshot: {
                        version: state.version,
                        entities: state.entities,
                        relationships: state.relationships,
                        savedAt: new Date(),
                    },
                    updatedAt: new Date(),
                });
                console.log(`💾 Project ${projectId} saved to MongoDB`);
            } else {
                console.log(`⚠️ Skipping MongoDB save for temporary Project ID: ${projectId}`);
            }
        } catch (error) {
            console.error('MongoDB save error:', error);
        }
        saveTimers.delete(projectId);
    }, 5000); // Save every 5 seconds

    saveTimers.set(projectId, timer);
}
