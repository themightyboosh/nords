import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import '@xyflow/react/dist/style.css';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
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
import AuthScreen from './components/Auth/AuthScreen';
import VerifyEmailScreen from './components/Auth/VerifyEmailScreen';
import ForgotPasswordScreen from './components/Auth/ForgotPasswordScreen';
import { ManageTypes } from './components/ManageTypes/ManageTypes';
import { ManagePersonas } from './components/ManagePersonas/ManagePersonas';
import { ManageGoals } from './components/ManageGoals/ManageGoals';
import { PersonaLensDrawer } from './components/Drawer/PersonaLensDrawer';
import { BoardSettingsProvider } from './context/BoardSettingsContext';
import { usePersonas } from './hooks/usePersonas';
import { useLens } from './context/LensContext';
import { api } from './api/client';
import { ProjectSettings } from './components/ProjectSettings/ProjectSettings';
import { PreviewChat } from './components/PreviewChat/PreviewChat';
import { GoalDetailDrawer } from './components/Drawer/GoalDetailDrawer';
import { useGoals } from './hooks/useGoals';
import { TestRunner } from './components/TestRunner/TestRunner';

/**
 * Safe ReactFlow access — returns null when ReactFlow isn't mounted (e.g. board view).
 */
function useOptionalReactFlow() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useReactFlow();
  } catch {
    return null;
  }
}

/**
 * WorkspaceShell — wraps Header + Dock + Canvas for a single project.
 * This is the main spatial workspace layout. 
 * TypeRegistryProvider lives here so both GlobalDock and CanvasEngine
 * share the same live type data from the database.
 */
function WorkspaceShell({ currentTheme, onThemeChange }: { currentTheme: string, onThemeChange: (theme: string) => void }) {
  const { id: projectId } = useParams<{ id: string }>();

  // Load graph at the shell level so TypeRegistryProvider wraps everything
  const { graph, refetch } = useProjectGraph(projectId || '');
  const { personas, updateCategoryWeight } = usePersonas(projectId || '');

  return (
    <LensProvider projectId={projectId || ''}>
      <TypeRegistryProvider
        rawNordTypes={graph?.nord_types || []}
        rawConnectionTypes={graph?.connection_types || []}
        rawNords={graph?.nords || []}
        rawConnections={graph?.connections || []}
      >
       <BoardSettingsProvider projectId={projectId || null}>
        <WorkspaceContent
          projectId={projectId}
          graph={graph}
          refetch={refetch}
          personas={personas}
          updateCategoryWeight={updateCategoryWeight}
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
        />
       </BoardSettingsProvider>
      </TypeRegistryProvider>
    </LensProvider>
  );
}

/**
 * WorkspaceContent — Inner component that lives INSIDE LensProvider
 * so it can safely call useLens() and access persona/lens state.
 */
interface WorkspaceContentProps {
  projectId?: string;
  graph: ReturnType<typeof useProjectGraph>['graph'];
  refetch: () => Promise<void>;
  personas: ReturnType<typeof usePersonas>['personas'];
  updateCategoryWeight: ReturnType<typeof usePersonas>['updateCategoryWeight'];
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

function WorkspaceContent({ projectId, graph, refetch, personas, updateCategoryWeight, currentTheme, onThemeChange }: WorkspaceContentProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; type: 'nord' | 'connection' } | null>(null);
  const [manageTypesTab, setManageTypesTab] = useState<'nord' | 'connection' | null>(null);
  const [personasOpen, setPersonasOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testRunnerOpen, setTestRunnerOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [personaDrawerOpen, setPersonaDrawerOpen] = useState(true);
  const [projectName, setProjectName] = useState<string>('Loading…');
  const [projectMode, setProjectMode] = useState<'explore' | 'collect' | 'guided'>('explore');

  // Replay state — shared between TestRunner and PreviewChat
  const [replayTranscript, setReplayTranscript] = useState<any[] | null>(null);
  const [replayLabel, setReplayLabel] = useState<string | null>(null);

  // Goals data for the Goals lens canvas
  const goalsData = useGoals(projectId || null);

  // Safe ReactFlow access — returns null in board view where ReactFlow isn't mounted
  const reactFlow = useOptionalReactFlow();
  const { lens, activePersonaId } = useLens();

  // Fetch project name + mode
  useEffect(() => {
    if (!projectId) return;
    api.get<{ name: string; project_mode?: 'explore' | 'collect' | 'guided' }>(`/api/projects/${projectId}`)
      .then(p => {
        setProjectName(p.name);
        setProjectMode(p.project_mode || 'explore');
      })
      .catch(() => setProjectName('Project'));
  }, [projectId]);

  // Active persona for the Persona Lens
  const activePersona = useMemo(() => {
    return personas.find(p => p.id === activePersonaId) || null;
  }, [personas, activePersonaId]);

  // Auto-open persona drawer when persona changes
  const prevPersonaIdRef = useRef(activePersonaId);
  useEffect(() => {
    if (activePersonaId && activePersonaId !== prevPersonaIdRef.current) {
      setPersonaDrawerOpen(true);
    }
    prevPersonaIdRef.current = activePersonaId;
  }, [activePersonaId]);

  // Persona weights map for the layout engine
  const personaWeights = useMemo(() => {
    if (lens !== 'persona' || !activePersona) return null;
    const weights = new Map<string, number>();
    for (const cw of activePersona.category_weights) {
      weights.set(cw.connection_type_id, cw.weight);
    }
    return weights;
  }, [lens, activePersona]);

  // Live slider state (local, pre-commit)
  const [liveWeights, setLiveWeights] = useState<Map<string, number> | null>(null);
  const effectiveWeights = liveWeights || personaWeights;

  const handleWeightChange = useCallback((connectionTypeId: string, weight: number) => {
    setLiveWeights(prev => {
      const base = prev || personaWeights || new Map<string, number>();
      const next = new Map(base);
      next.set(connectionTypeId, weight);
      return next;
    });
  }, [personaWeights]);

  const handleWeightCommit = useCallback(async (connectionTypeId: string, weight: number) => {
    if (!activePersonaId) return;
    await updateCategoryWeight(activePersonaId, connectionTypeId, weight);
    setLiveWeights(null); // Sync back to persona data
  }, [activePersonaId, updateCategoryWeight]);

  // Build typeSchemas map for DetailDrawer: typeId → PropertySchema[]
  const typeSchemas = useMemo(() => {
    const map = new Map<string, Array<{
      name: string;
      type: string;
      options?: string[];
      card_row?: number;
      required?: boolean;
    }>>();
    if (graph) {
      for (const t of graph.nord_types) {
        map.set(t.id, (t.properties_schema || []).map((s: any) => ({
          name: s.name,
          type: s.type || 'string',
          options: s.options,
          card_row: s.card_row,
          required: s.required,
        })));
      }
      for (const t of graph.connection_types) {
        map.set(t.id, (t.properties_schema || []).map((s: any) => ({
          name: s.name,
          type: s.type || 'string',
          options: s.options,
          card_row: s.card_row,
          required: s.required,
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

  // Nords tab in connection detail: click a nord row → switch to Nord Mode + center graph
  const handleSelectNord = useCallback((nordId: string) => {
    setSelectedEntity({ id: nordId, type: 'nord' });
    setIsDrawerOpen(true);

    // Center the graph view on the selected nord (graph view only)
    if (!reactFlow) return;
    requestAnimationFrame(() => {
      try {
        const node = reactFlow!.getNode(nordId);
        if (node) {
          const x = node.position.x + (node.measured?.width ?? 200) / 2;
          const y = node.position.y + (node.measured?.height ?? 60) / 2;
          reactFlow!.setCenter(x, y, { duration: 400, zoom: reactFlow!.getZoom() });
        }
      } catch {
        // ReactFlow not mounted — ignore
      }
    });
  }, [reactFlow]);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedEntity(null);
  };

  return (
    <div className="nords-app-container">
      <ViewportHeader
        currentTheme={currentTheme}
        onThemeChange={onThemeChange}
        onOpenNordTypes={() => setManageTypesTab('nord')}
        onOpenCategoryTypes={() => setManageTypesTab('connection')}
        onOpenPersonas={() => setPersonasOpen(true)}
        onOpenGoals={projectMode === 'guided' ? () => setGoalsOpen(true) : undefined}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPreview={() => setPreviewOpen(p => !p)}
        onOpenTestRunner={() => setTestRunnerOpen(true)}
        projectName={projectName}
      />
      {projectId && (
        <ProjectSettings
          isOpen={settingsOpen}
          onClose={() => {
            setSettingsOpen(false);
            setPreviewOpen(false);
            // Re-fetch project to pick up mode changes
            if (projectId) {
              api.get<{ name: string; project_mode?: 'explore' | 'collect' | 'guided' }>(`/api/projects/${projectId}`)
                .then(p => {
                  setProjectName(p.name);
                  setProjectMode(p.project_mode || 'explore');
                })
                .catch(() => {});
            }
          }}
          projectId={projectId}
          onProjectNameChange={setProjectName}
        />
      )}
      <GlobalDock projectId={projectId} refetchGraph={refetch} graph={graph} personas={personas} projectMode={projectMode} />
      <CanvasEngine
        onNordClick={lens === 'persona' ? () => {} : handleNordClick}
        onEdgeDoubleClick={lens === 'persona' ? () => {} : handleEdgeDoubleClick}
        selectedNord={lens === 'persona' ? null : (selectedEntity?.type === 'nord' ? selectedEntity.id : null)}
        projectId={projectId}
        graph={graph}
        refetchGraph={refetch}
        personaWeights={effectiveWeights}
        activePersona={activePersona ? {
          id: activePersona.id,
          name: activePersona.name,
          avatar_seed: activePersona.avatar_seed,
          accent_color: activePersona.accent_color,
        } : null}
        goals={goalsData.goals}
        goalEdges={goalsData.edges}
        selectedGoalId={selectedGoalId}
        onGoalClick={(id) => setSelectedGoalId(id)}
        onGoalEdgeCreate={goalsData.createEdge}
        onGoalEdgeDelete={goalsData.deleteEdge}
        onPersonaCenterClick={() => setPersonaDrawerOpen(prev => !prev)}
      />
      {/* Goal Canvas state */}
      {lens === 'goals' && (
        <GoalDetailDrawer
          isOpen={!!selectedGoalId}
          onClose={() => setSelectedGoalId(null)}
          goal={goalsData.goals.find(g => g.id === selectedGoalId) || null}
          nords={(graph?.nords || []).map(n => ({
            id: n.id,
            title: n.title,
            type_name: graph?.nord_types.find((t: any) => t.id === n.type_id)?.name || '',
            properties_schema: graph?.nord_types.find((t: any) => t.id === n.type_id)?.properties_schema || [],
          }))}
          onUpdate={goalsData.updateGoal}
          onAddProperty={goalsData.addProperty}
          onRemoveProperty={goalsData.removeProperty}
        />
      )}
      {/* Persona Lens Drawer — shown when viewing through a persona */}
      {lens === 'persona' && (
        <PersonaLensDrawer
          isOpen={lens === 'persona' && !!activePersona && personaDrawerOpen}
          onClose={() => setPersonaDrawerOpen(false)}
          persona={activePersona}
          connectionTypes={(graph?.connection_types || []).filter(ct => !ct.is_system)}
          liveWeights={liveWeights}
          onWeightChange={handleWeightChange}
          onWeightCommit={handleWeightCommit}
        />
      )}
      <DetailDrawer
        isOpen={isDrawerOpen && lens !== 'persona'}
        onClose={closeDrawer}
        entityId={selectedEntity?.id || null}
        entityType={selectedEntity?.type || 'nord'}
        typeSchemas={typeSchemas}
        onSelectConnection={handleSelectConnection}
        onSelectNord={handleSelectNord}
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
      <ManagePersonas
        projectId={projectId || ''}
        open={personasOpen}
        onClose={() => setPersonasOpen(false)}
        connectionTypes={graph?.connection_types || []}
      />
      <ManageGoals
        projectId={projectId || ''}
        open={goalsOpen}
        onClose={() => setGoalsOpen(false)}
      />
      {projectId && (
        <PreviewChat
          projectId={projectId}
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          replayTranscript={replayTranscript}
          replayLabel={replayLabel}
          onClearReplay={() => {
            setReplayTranscript(null);
            setReplayLabel(null);
          }}
        />
      )}
      {projectId && (
        <TestRunner
          projectId={projectId}
          projectMode={projectMode}
          goalsEnabled={projectMode === 'guided'}
          open={testRunnerOpen}
          onClose={() => setTestRunnerOpen(false)}
          onReplay={(transcript, label) => {
            setReplayTranscript(transcript);
            setReplayLabel(label);
            setPreviewOpen(true);
          }}
        />
      )}
    </div>
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
            <Route path="/login" element={<AuthScreen initialMode="login" />} />
            <Route path="/signup" element={<AuthScreen initialMode="signup" />} />
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
              <ReactFlowProvider>
                <WorkspaceShell currentTheme={currentTheme} onThemeChange={setCurrentTheme} />
              </ReactFlowProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
