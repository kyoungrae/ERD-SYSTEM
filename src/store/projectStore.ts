import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, DBType, ProjectMember } from '../types/erd';

const API_URL = 'http://localhost:3001/api/projects';

interface ProjectStore {
    projects: Project[];
    currentProjectId: string | null;
    fetchProjects: () => Promise<void>;
    addProject: (name: string, dbType: DBType, members: ProjectMember[], description?: string) => Promise<Project>;
    addRemoteProject: (id: string) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    setCurrentProject: (id: string | null) => void;
    updateProjectData: (id: string, data: any) => void;
    updateProjectMembers: (id: string, members: ProjectMember[]) => void;
    inviteMember: (projectId: string, email: string) => Promise<void>;
    joinWithCode: (code: string) => Promise<string>;
}

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set) => ({
            projects: [],
            currentProjectId: null,

            fetchProjects: async () => {
                const token = localStorage.getItem('auth-token');
                if (!token) return;

                try {
                    const response = await fetch(`${API_URL}?t=${Date.now()}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Cache-Control': 'no-cache'
                        },
                        cache: 'no-store'
                    });
                    if (response.ok) {
                        const data = await response.json();
                        // Map Mongo _id to id
                        const projects = data.map((p: any) => ({
                            ...p,
                            id: p._id,
                            members: p.members?.map((m: any) => ({
                                id: m.userId?._id || m.userId,
                                name: m.userId?.name || 'Unknown',
                                email: m.userId?.email || '',
                                picture: m.userId?.picture,
                                role: m.role || 'MEMBER'
                            })),
                            data: p.data || (p.currentSnapshot?.entities ? p.currentSnapshot : { entities: [], relationships: [] })
                        }));
                        set({ projects });
                    }
                } catch (error) {
                    console.error('Fetch projects error:', error);
                }
            },

            addProject: async (name, dbType, _members, description) => {
                const token = localStorage.getItem('auth-token');
                if (!token) throw new Error('Authentication required');

                try {
                    const response = await fetch(API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ name, dbType, description }),
                    });

                    if (!response.ok) throw new Error('Failed to create project');

                    const p = await response.json();
                    const newProject: Project = {
                        ...p,
                        id: p._id,
                        members: p.members?.map((m: any) => ({
                            id: m.userId?._id || m.userId,
                            name: m.userId?.name || 'Unknown',
                            email: m.userId?.email || '',
                            picture: m.userId?.picture,
                            role: m.role || 'MEMBER'
                        })),
                        data: { entities: [], relationships: [] },
                    };

                    set((state) => ({
                        projects: [newProject, ...state.projects],
                    }));
                    return newProject;
                } catch (error) {
                    console.error('Add project error:', error);
                    throw error;
                }
            },

            addRemoteProject: async (id) => {
                const token = localStorage.getItem('auth-token');

                // Check if already in list
                const { projects } = useProjectStore.getState();
                if (projects.find((p) => p.id === id)) {
                    set({ currentProjectId: id });
                    return;
                }

                try {
                    const headers: Record<string, string> = {};
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const response = await fetch(`${API_URL}/${id}`, {
                        headers
                    });

                    if (!response.ok) {
                        throw new Error('Project not found or access denied');
                    }

                    const p = await response.json();
                    const newProject: Project = {
                        ...p,
                        id: p._id,
                        members: p.members?.map((m: any) => ({
                            id: m.userId?._id || m.userId,
                            name: m.userId?.name || 'Unknown',
                            email: m.userId?.email || '',
                            picture: m.userId?.picture,
                            role: m.role || 'MEMBER'
                        })),
                        data: p.data || (p.currentSnapshot?.entities ? p.currentSnapshot : { entities: [], relationships: [] })
                    };

                    set((state) => ({
                        projects: [newProject, ...state.projects],
                        currentProjectId: id,
                    }));
                } catch (error) {
                    console.error('Add remote project error:', error);
                    alert('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
                }
            },

            deleteProject: async (id) => {
                const token = localStorage.getItem('auth-token');

                // If token exists, try to delete from server
                if (token) {
                    try {
                        const response = await fetch(`${API_URL}/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        // If not successful and not 404, stop here
                        if (!response.ok && response.status !== 404) {
                            return;
                        }
                    } catch (error) {
                        console.error('Delete project error:', error);
                        // Optional: stop on network error? 
                        // For better UX on "clearing local list", we might want to proceed even on error,
                        // but skipping for safety.
                        return;
                    }
                }

                // Remove from local state (runs if no token OR if server delete was successful/404)
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                    currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
                }));
            },

            setCurrentProject: (id) => set({ currentProjectId: id }),

            updateProjectData: async (id, data) => {
                const token = localStorage.getItem('auth-token');
                if (!token) return;

                // Update local state immediately for responsiveness
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id ? { ...p, data, updatedAt: new Date().toISOString() } : p
                    ),
                }));

                try {
                    const response = await fetch(`${API_URL}/${id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ data }),
                    });

                    if (!response.ok) {
                        console.error('Failed to sync project data to server');
                    }
                } catch (error) {
                    console.error('Update project data error:', error);
                }
            },

            updateProjectMembers: (id, members) =>
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id ? { ...p, members, updatedAt: new Date().toISOString() } : p
                    ),
                })),

            inviteMember: async (projectId, email) => {
                const token = localStorage.getItem('auth-token');
                if (!token) throw new Error('Authentication required');

                const response = await fetch(`${API_URL}/invite`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ projectId, email }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to send invitation');
                }
            },

            joinWithCode: async (code) => {
                const token = localStorage.getItem('auth-token');
                if (!token) throw new Error('Authentication required');

                const response = await fetch(`${API_URL}/join-with-code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ code }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to join project');
                }

                return data.projectId;
            },
        }),
        {
            name: 'project-storage',
            // Only persist essential state, not the full project list if fetched from API
            partialize: (state) => ({
                currentProjectId: state.currentProjectId,
                projects: state.projects
            }),
        }
    )
);
