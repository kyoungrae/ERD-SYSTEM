import React, { useState } from 'react';
import { Plus, FolderOpen, Trash2, Clock, ChevronRight, LogOut, Database } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore } from '../store/authStore';

const ProjectListPage: React.FC = () => {
    const { projects, addProject, deleteProject, setCurrentProject } = useProjectStore();
    const { user, logout } = useAuthStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        const project = addProject(newProjectName, newProjectDesc);
        setNewProjectName('');
        setNewProjectDesc('');
        setIsCreateModalOpen(false);
        setCurrentProject(project.id);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                            <Database size={24} />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">ERD System</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                            <img src={user?.picture} alt={user?.name} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                            <span className="text-sm font-bold text-gray-700 hidden sm:block">{user?.name}</span>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm('로그아웃 하시겠습니까?')) {
                                    setCurrentProject(null);
                                    logout();
                                }
                            }}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-95"
                            title="로그아웃"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
                {/* Dashboard Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">내 프로젝트</h2>
                        <p className="text-gray-500 font-medium">관리 중인 모든 ERD 다이어그램 리스트입니다.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={20} />
                        새 프로젝트 생성
                    </button>
                </div>

                {/* Project Grid */}
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border-2 border-dashed border-gray-200 shadow-sm">
                        <div className="p-6 bg-blue-50 rounded-full text-blue-400 mb-6">
                            <FolderOpen size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">진행 중인 프로젝트가 없습니다.</h3>
                        <p className="text-gray-500 mb-8 max-w-xs text-center font-medium">우측 상단의 버튼을 눌러 첫 번째 ERD 프로젝트를 시작해보세요!</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="text-blue-600 font-bold hover:underline py-2 px-4 rounded-lg"
                        >
                            프로젝트 생성하기 →
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => setCurrentProject(project.id)}
                                className="group bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all cursor-pointer flex flex-col h-full ring-0 hover:ring-2 ring-blue-500/20"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="p-3 bg-gray-50 text-blue-500 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                        <Database size={24} />
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`'${project.name}' 프로젝트를 삭제하시겠습니까?`)) {
                                                deleteProject(project.id);
                                            }
                                        }}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                                    <p className="text-gray-500 text-sm line-clamp-2 font-medium">
                                        {project.description || '상세 설명이 없습니다.'}
                                    </p>
                                </div>

                                <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
                                        <Clock size={12} />
                                        {new Date(project.updatedAt).toLocaleString('ko-KR', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        })}
                                    </div>
                                    <div className="p-2 bg-gray-50 text-gray-400 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Project Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden scale-in">
                        <div className="p-8 border-b border-gray-100">
                            <h3 className="text-2xl font-black text-gray-900 mb-2">새 프로젝트 생성</h3>
                            <p className="text-gray-500 font-medium text-sm">새로운 데이터베이스 설계 프로젝트를 시작합니다.</p>
                        </div>
                        <form onSubmit={handleCreateProject} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">프로젝트 명</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="예: 쇼핑몰 서비스 설계"
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">설명 (선택사항)</label>
                                <textarea
                                    value={newProjectDesc}
                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                    placeholder="프로젝트에 대한 간단한 설명을 입력하세요."
                                    rows={3}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-4 px-6 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 px-6 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                                >
                                    생성하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <footer className="py-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                © 2026 이경태. 모든 권리 보유.
            </footer>
        </div>
    );
};

export default ProjectListPage;
