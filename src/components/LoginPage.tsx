import React from 'react';
import { LogIn, Database, ShieldCheck, Zap, Share2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';

const LoginPage: React.FC = () => {
    const { login } = useAuthStore();
    const { setCurrentProject } = useProjectStore();

    const handleGoogleLogin = () => {
        // Mock Google Login for now
        // In a real app, this would redirect to Google OAuth or use a library like @react-oauth/google
        const mockUser = {
            id: 'google_123',
            email: 'user@example.com',
            name: '데모 사용자',
            picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        };
        setCurrentProject(null);
        login(mockUser);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100/50 rounded-full blur-[120px]" />

            <div className="max-w-[1000px] w-full grid md:grid-cols-2 bg-white rounded-[32px] shadow-2xl shadow-blue-900/10 overflow-hidden border border-gray-100">
                {/* Left Side: Branding & Features */}
                <div className="p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-12">
                            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
                                <Database size={28} />
                            </div>
                            <span className="text-2xl font-black tracking-tight uppercase">ERD System</span>
                        </div>

                        <h1 className="text-4xl font-bold leading-tight mb-6">
                            데이터베이스 설계의<br />
                            새로운 기준
                        </h1>
                        <p className="text-blue-100 text-lg mb-12 leading-relaxed">
                            직관적인 인터페이스와 강력한 협업 도구로 쉽고 빠르게 데이터베이스 구조를 설계하세요.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 group">
                                <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                                    <Zap size={20} className="text-blue-200" />
                                </div>
                                <span className="font-medium text-blue-50">실시간 다이어그램 시각화</span>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                                    <ShieldCheck size={20} className="text-blue-200" />
                                </div>
                                <span className="font-medium text-blue-50">안전한 데이터 관리 및 보안</span>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                                    <Share2 size={20} className="text-blue-200" />
                                </div>
                                <span className="font-medium text-blue-50">손쉬운 협업 및 공유 기능</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-sm text-blue-200/60 relative z-10">
                        © 2026 2QuadrillionTae. All rights reserved.
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="p-12 flex flex-col justify-center bg-white">
                    <div className="max-w-[360px] mx-auto w-full">
                        <div className="mb-10 text-center md:text-left">
                            <h2 className="text-3xl font-bold text-gray-900 mb-3">환영합니다!</h2>
                            <p className="text-gray-500">서비스 이용을 위해 로그인을 진행해주세요.</p>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 hover:border-gray-200 transition-all duration-200 group active:scale-[0.98]"
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                                <span className="font-semibold text-gray-700">Google 계정으로 로그인</span>
                            </button>

                            <button
                                onClick={() => {
                                    const guestUser = {
                                        id: `guest_${Math.floor(Math.random() * 10000)}`,
                                        email: 'guest@test.com',
                                        name: `게스트 ${Math.floor(Math.random() * 100)}`,
                                        picture: undefined,
                                    };
                                    setCurrentProject(null);
                                    login(guestUser);
                                }}
                                className="w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 hover:border-gray-200 transition-all duration-200 group active:scale-[0.98]"
                            >
                                <span className="font-semibold text-gray-700">게스트로 로그인 (테스트용)</span>
                            </button>

                            <div className="relative py-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-400 font-medium">또는</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">이메일</label>
                                    <input
                                        type="email"
                                        placeholder="example@email.com"
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">비밀번호</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300"
                                    />
                                </div>
                                <button className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-900/20 active:scale-[0.98] flex items-center justify-center gap-2">
                                    <LogIn size={20} />
                                    로그인
                                </button>
                            </div>
                        </div>

                        <p className="mt-10 text-center text-sm text-gray-500">
                            계정이 없으신가요? <a href="#" className="text-blue-600 font-bold hover:underline">회원가입</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
