import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, DBType, ProjectMember } from '../types/erd';

interface ProjectStore {
    projects: Project[];
    currentProjectId: string | null;
    addProject: (name: string, dbType: DBType, members: ProjectMember[], description?: string) => Project;
    deleteProject: (id: string) => void;
    setCurrentProject: (id: string | null) => void;
    updateProjectData: (id: string, data: any) => void;
    updateProjectMembers: (id: string, members: ProjectMember[]) => void;
}

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set) => ({
            projects: [],
            currentProjectId: null,

            addProject: (name, dbType, members, description) => {
                const newProject: Project = {
                    id: `proj_${Date.now()}`,
                    name,
                    dbType,
                    description,
                    members,
                    updatedAt: new Date().toISOString(),
                    data: { entities: [], relationships: [] },
                };
                set((state) => ({
                    projects: [newProject, ...state.projects],
                }));
                return newProject;
            },

            deleteProject: (id) =>
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                    currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
                })),

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
        }
    )
);
