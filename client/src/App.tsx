import { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import { AuthProvider } from './context/AuthContext';
import { LensProvider } from './context/LensContext';
import { TypeRegistryProvider } from './context/TypeRegistryContext';
import { useProjectGraph } from './hooks/useProjectGraph';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import ViewportHeader from './components/Layout/ViewportHeader';
import GlobalDock from './components/Layout/GlobalDock';
import DetailDrawer from './components/Drawer/DetailDrawer';
import CanvasEngine from './components/Canvas/CanvasEngine';
import ProjectDashboard from './components/ProjectDashboard/ProjectDashboard';
import AdminScreen from './components/Admin/AdminScreen';
import LoginScreen from './components/Auth/LoginScreen';
import SignupScreen from './components/Auth/SignupScreen';
import VerifyEmailScreen from './components/Auth/VerifyEmailScreen';
import ForgotPasswordScreen from './components/Auth/ForgotPasswordScreen';
import { ManageTypes } from './components/ManageTypes/ManageTypes';

/**
 * WorkspaceShell — wraps Header + Dock + Canvas for a single project.
 * This is the main spatial workspace layout. 
 * TypeRegistryProvider lives here so both GlobalDock and CanvasEngine
 * share the same live type data from the database.
 */
function WorkspaceShell({ currentTheme, onThemeChange }: { currentTheme: string, onThemeChange: (theme: string) => void }) {
  const { id: projectId } = useParams<{ id: string }>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; type: 'nord' | 'connection' } | null>(null);
  const [manageTypesTab, setManageTypesTab] = useState<'nord' | 'connection' | null>(null);
  
  // Load graph at the shell level so TypeRegistryProvider wraps everything
  const { graph, refetch } = useProjectGraph(projectId || '');

  // Build typeSchemas map for DetailDrawer: typeId → PropertySchema[]
  const typeSchemas = useMemo(() => {
    const map = new Map<string, Array<{
      name: string;
      type: string;
      options?: string[];
      card_row?: number;
    }>>();
    if (graph) {
      for (const t of graph.nord_types) {
        map.set(t.id, (t.properties_schema || []).map((s: any) => ({
          name: s.name,
          type: s.type || 'string',
          options: s.options,
          card_row: s.card_row,
        })));
      }
      for (const t of graph.connection_types) {
        map.set(t.id, (t.properties_schema || []).map((s: any) => ({
          name: s.name,
          type: s.type || 'string',
          options: s.options,
          card_row: s.card_row,
        })));
      }
    }
    return map;
  }, [graph]);

  const handleNordClick = (id: string) => {
    setSelectedEntity({ id, type: 'nord' });
    setIsDrawerOpen(true);
  };

  const handleEdgeDoubleClick = (id: string) => {
    setSelectedEntity({ id, type: 'connection' });
    setIsDrawerOpen(true);
  };

  // Connections tab: click a connection row → switch to Line Mode
  const handleSelectConnection = useCallback((connectionId: string) => {
    setSelectedEntity({ id: connectionId, type: 'connection' });
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedEntity(null);
  };

  return (
    <ReactFlowProvider>
      <LensProvider projectId={projectId || ''}>
        <TypeRegistryProvider
          rawNordTypes={graph?.nord_types || []}
          rawConnectionTypes={graph?.connection_types || []}
          rawNords={graph?.nords || []}
          rawConnections={graph?.connections || []}
        >
          <div className="nords-app-container">
            <ViewportHeader
              currentTheme={currentTheme}
              onThemeChange={onThemeChange}
              onOpenNordTypes={() => setManageTypesTab('nord')}
              onOpenCategoryTypes={() => setManageTypesTab('connection')}
              onOpenPersonas={() => { /* placeholder */ }}
              onOpenSettings={() => { /* placeholder */ }}
            />
            <GlobalDock projectId={projectId} refetchGraph={refetch} />
            <CanvasEngine
              onNordClick={handleNordClick}
              onEdgeDoubleClick={handleEdgeDoubleClick}
              selectedNord={selectedEntity?.type === 'nord' ? selectedEntity.id : null}
              projectId={projectId}
              graph={graph}
              refetchGraph={refetch}
            />
            <DetailDrawer
              isOpen={isDrawerOpen}
              onClose={closeDrawer}
              entityId={selectedEntity?.id || null}
              entityType={selectedEntity?.type || 'nord'}
              typeSchemas={typeSchemas}
              onSelectConnection={handleSelectConnection}
              graph={graph}
              refetchGraph={refetch}
            />
            {manageTypesTab !== null && (
              <ManageTypes
                projectId={projectId || ''}
                open={true}
                onClose={() => setManageTypesTab(null)}
                onTypesChanged={refetch}
                lockedTab={manageTypesTab}
              />
            )}
          </div>
        </TypeRegistryProvider>
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

  const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true';

  return (
    <AuthProvider>
      <Routes>
        {/* Auth screens: only render when auth is enabled */}
        {!skipAuth && (
          <>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="/verify-email" element={<VerifyEmailScreen />} />
            <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminScreen />
                </ProtectedRoute>
              }
            />
          </>
        )}

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
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectDashboard />
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
