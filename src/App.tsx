import ERDCanvas from './components/ERDCanvas';
import LoginPage from './components/LoginPage';
import ProjectListPage from './components/ProjectListPage';
import { useAuthStore } from './store/authStore';
import { useProjectStore } from './store/projectStore';
import { useSyncStore } from './store/syncStore';
import { useEffect } from 'react';

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const { currentProjectId } = useProjectStore();
  const { connect, disconnect, authenticate, joinProject, leaveProject } = useSyncStore();

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated, connect, disconnect]);

  useEffect(() => {
    if (isAuthenticated && user) {
      authenticate({ id: user.id || 'anonymous', name: user.name || 'Anonymous', picture: user.picture });
    }
  }, [isAuthenticated, user, authenticate]);

  useEffect(() => {
    if (currentProjectId) {
      joinProject(currentProjectId);
    } else {
      leaveProject();
    }
  }, [currentProjectId, joinProject, leaveProject]);

  if (!isAuthenticated) return <LoginPage />;
  if (!currentProjectId) return <ProjectListPage />;

  return (
    <div className="w-full h-screen">
      <ERDCanvas />
    </div>
  );
}

export default App;
