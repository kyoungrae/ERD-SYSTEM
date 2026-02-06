import ERDCanvas from './components/ERDCanvas';
import LoginPage from './components/LoginPage';
import ProjectListPage from './components/ProjectListPage';
import { useAuthStore } from './store/authStore';
import { useProjectStore } from './store/projectStore';

function App() {
  const { isAuthenticated } = useAuthStore();
  const { currentProjectId } = useProjectStore();

  if (!isAuthenticated) return <LoginPage />;
  if (!currentProjectId) return <ProjectListPage />;

  return (
    <div className="w-full h-screen">
      <ERDCanvas />
    </div>
  );
}

export default App;
