import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, DBType, ProjectMember } from '../types/erd';

const API_URL = 'http://localhost:3001/api/projects';

interface ProjectStore {
    projects: Project[];
    currentProjectId: string | null;
    fetchProjects: () => Promise<void>;
    addProject: (name: string, dbType: DBType, members: ProjectMember[], description?: string) => Promise<Project>;
    addRemoteProject: (id: string) => void;
    deleteProject: (id: string) => Promise<void>;
    setCurrentProject: (id: string | null) => void;
    updateProjectData: (id: string, data: any) => void;
    updateProjectMembers: (id: string, members: ProjectMember[]) => void;
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
                    const response = await fetch(API_URL, {
                        headers: { 'Authorization': `Bearer ${token}` }
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

            addRemoteProject: (id) => {
                set((state) => {
                    if (state.projects.find((p) => p.id === id)) {
                        return { currentProjectId: id };
                    }
                    const newProject: Project = {
                        id,
                        name: `Remote Project (${id.slice(0, 6)}...)`,
                        dbType: 'MySQL',
                        description: 'Joined remotely via ID',
                        members: [],
                        updatedAt: new Date().toISOString(),
                        data: { entities: [], relationships: [] },
                    };
                    return {
                        projects: [newProject, ...state.projects],
                        currentProjectId: id,
                    };
                });
            },

            deleteProject: async (id) => {
                const token = localStorage.getItem('auth-token');
                if (!token) return;

                try {
                    const response = await fetch(`${API_URL}/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        set((state) => ({
                            projects: state.projects.filter((p) => p.id !== id),
                            currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
                        }));
                    }
                } catch (error) {
                    console.error('Delete project error:', error);
                }
            },

            setCurrentProject: (id) => set({ currentProjectId: id }),

            updateProjectData: (id, data) =>
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id ? { ...p, data, updatedAt: new Date().toISOString() } : p
                    ),
                })),

            updateProjectMembers: (id, members) =>
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id ? { ...p, members, updatedAt: new Date().toISOString() } : p
                    ),
                })),
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
