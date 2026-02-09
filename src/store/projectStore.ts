import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, DBType } from '../types/erd';

interface ProjectStore {
    projects: Project[];
    currentProjectId: string | null;
    addProject: (name: string, dbType: DBType, description?: string) => Project;
    deleteProject: (id: string) => void;
    setCurrentProject: (id: string | null) => void;
    updateProjectData: (id: string, data: any) => void;
}

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set) => ({
            projects: [],
            currentProjectId: null,

            addProject: (name, dbType, description) => {
                const newProject: Project = {
                    id: `proj_${Date.now()}`,
                    name,
                    dbType,
                    description,
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
        }),
        {
            name: 'project-storage',
        }
    )
);
