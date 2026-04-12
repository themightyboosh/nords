import { useState, useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import { AuthProvider } from './context/AuthContext';
import { LensProvider } from './context/LensContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import ViewportHeader from './components/Layout/ViewportHeader';
import GlobalDock from './components/Layout/GlobalDock';
import ZoomControls from './components/Canvas/ZoomControls';
import DetailDrawer from './components/Drawer/DetailDrawer';
import CanvasEngine from './components/Canvas/CanvasEngine';
import ProjectDashboard from './components/ProjectDashboard/ProjectDashboard';
import AdminScreen from './components/Admin/AdminScreen';
import LoginScreen from './components/Auth/LoginScreen';
import SignupScreen from './components/Auth/SignupScreen';
import VerifyEmailScreen from './components/Auth/VerifyEmailScreen';
import ForgotPasswordScreen from './components/Auth/ForgotPasswordScreen';

/**
 * WorkspaceShell — wraps Header + Dock + Canvas for a single project.
 * This is the main spatial workspace layout.
 */
function WorkspaceShell({ currentTheme, onThemeChange }: { currentTheme: string, onThemeChange: (theme: string) => void }) {
  const { id: projectId } = useParams<{ id: string }>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNord, setSelectedNord] = useState<string | null>(null);

  const handleNordClick = (id: string) => {
    setSelectedNord(id);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedNord(null);
  };

  return (
    <ReactFlowProvider>
      <LensProvider>
        <div className="nords-app-container">
          <ViewportHeader
            currentTheme={currentTheme}
            onThemeChange={onThemeChange}
          />
          <GlobalDock />
          <ZoomControls />
          <CanvasEngine onNordClick={handleNordClick} selectedNord={selectedNord} projectId={projectId} />
          <DetailDrawer isOpen={isDrawerOpen} onClose={closeDrawer} nordId={selectedNord} />
        </div>
      </LensProvider>
    </ReactFlowProvider>
  );
}

// ...

function App() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('nords-theme') || 'obsidian';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('nords-theme', currentTheme);
  }, [currentTheme]);

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/verify-email" element={<VerifyEmailScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ProjectDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <WorkspaceShell currentTheme={currentTheme} onThemeChange={setCurrentTheme} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
