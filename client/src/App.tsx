import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import '@xyflow/react/dist/style.css';
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
import { ManageVariables } from './components/ManageVariables/ManageVariables';
import { PersonaLensDrawer } from './components/Drawer/PersonaLensDrawer';
import { BoardSettingsProvider } from './context/BoardSettingsContext';
import { usePersonas } from './hooks/usePersonas';
import { useLens } from './context/LensContext';
import { api } from './api/client';
import { ProjectSettings } from './components/ProjectSettings/ProjectSettings';
import { PreviewChat } from './components/PreviewChat/PreviewChat';
import { GoalDetailDrawer } from './components/Drawer/GoalDetailDrawer';
import { useGoals } from './hooks/useGoals';
import { useVariables } from './hooks/useVariables';
import { useCollectionGroups } from './hooks/useCollectionGroups';
import { ShareChat } from './pages/ShareChat/ShareChat';
import { TestRunner } from './components/TestRunner/TestRunner';
import { SessionExplorer } from './components/SessionExplorer/SessionExplorer';
import { UserProfile } from './components/UserProfile/UserProfile';
import { SharePanel } from './components/SharePanel/SharePanel';

/** Callback type for centering on a node from outside CanvasEngine */
export type CenterOnNordFn = (nordId: string) => void;

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
  const { personas, updateCategoryWeight, refetch: refetchPersonas } = usePersonas(projectId || '');

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
          refetchPersonas={refetchPersonas}
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
  refetchPersonas: () => Promise<void>;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

function WorkspaceContent({ projectId, graph, refetch, personas, updateCategoryWeight, refetchPersonas, currentTheme, onThemeChange }: WorkspaceContentProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; type: 'nord' | 'connection' } | null>(null);
  const [manageTypesTab, setManageTypesTab] = useState<'nord' | 'connection' | null>(null);
  const [personasOpen, setPersonasOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testRunnerOpen, setTestRunnerOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [personaDrawerOpen, setPersonaDrawerOpen] = useState(false);
  const [projectName, setProjectName] = useState<string>('Loading…');
  const [projectIcon, setProjectIcon] = useState<string | null>(null);
  const [projectColor, setProjectColor] = useState<string | null>(null);
  const [projectMode, setProjectMode] = useState<'explore' | 'collect' | 'guided'>('explore');
  const [graphOnly, setGraphOnly] = useState(false);

  // Replay state — shared between TestRunner and PreviewChat
  const [replayTranscript, setReplayTranscript] = useState<any[] | null>(null);
  const [replayLabel, setReplayLabel] = useState<string | null>(null);

  // Goals data for the Goals lens canvas
  const goalsData = useGoals(projectId || null);
  const variablesData = useVariables(projectId || null);
  const collectionGroupsData = useCollectionGroups(projectId || null);

  // Center-on-nord callback — set by CanvasEngine when InteractiveCanvas is mounted
  const centerOnNordRef = useRef<CenterOnNordFn | null>(null);
  const { lens, activePersonaId } = useLens();

  // Fetch project name + mode
  useEffect(() => {
    if (!projectId) return;
    api.get<{ name: string; icon?: string | null; accent_color?: string | null; project_mode?: 'explore' | 'collect' | 'guided'; graph_only?: boolean }>(`/api/projects/${projectId}`)
      .then(p => {
        setProjectName(p.name);
        setProjectIcon(p.icon || null);
        setProjectColor(p.accent_color || null);
        setProjectMode(p.project_mode || 'explore');
        setGraphOnly(p.graph_only ?? false);
      })
      .catch(() => setProjectName('Project'));
  }, [projectId]);

  // Active persona for the Persona Lens
  const activePersona = useMemo(() => {
    return personas.find(p => p.id === activePersonaId) || null;
  }, [personas, activePersonaId]);




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
    centerOnNordRef.current?.(nordId);
  }, []);

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
        onOpenVariables={() => setVariablesOpen(true)}
        onOpenGoals={() => setGoalsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenPreview={() => setPreviewOpen(p => !p)}
        onOpenTestRunner={() => setTestRunnerOpen(true)}
        onOpenSessions={() => setSessionsOpen(true)}
        onOpenShare={() => setShareOpen(true)}
        projectName={projectName}
        projectIcon={projectIcon}
        projectColor={projectColor}
        graphOnly={graphOnly}
      />
      <UserProfile isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      {projectId && (
        <ProjectSettings
          isOpen={settingsOpen}
          onClose={() => {
            setSettingsOpen(false);
            setPreviewOpen(false);
            // Re-fetch project to pick up mode changes
            if (projectId) {
              api.get<{ name: string; icon?: string | null; accent_color?: string | null; project_mode?: 'explore' | 'collect' | 'guided'; graph_only?: boolean }>(`/api/projects/${projectId}`)
                .then(p => {
                  setProjectName(p.name);
                  setProjectIcon(p.icon || null);
                  setProjectColor(p.accent_color || null);
                  setProjectMode(p.project_mode || 'explore');
                  setGraphOnly(p.graph_only ?? false);
                })
                .catch(() => {});
            }
          }}
          projectId={projectId}
          onProjectNameChange={setProjectName}
        />
      )}
      <GlobalDock projectId={projectId} refetchGraph={refetch} graph={graph} personas={personas} graphOnly={graphOnly} />
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
        variables={variablesData.variables}
        selectedGoalId={selectedGoalId}
        onGoalClick={(id) => setSelectedGoalId(id)}
        onGoalEdgeCreate={goalsData.createEdge}
        onGoalEdgeDelete={goalsData.deleteEdge}
        onPersonaCenterClick={() => setPersonaDrawerOpen(prev => !prev)}
        onCenterOnNordReady={(fn) => { centerOnNordRef.current = fn; }}
      />
      {/* Goal Canvas state */}
      {lens === 'goals' && (
        <GoalDetailDrawer
          isOpen={!!selectedGoalId}
          onClose={() => setSelectedGoalId(null)}
          goal={goalsData.goals.find(g => g.id === selectedGoalId) || null}
          goals={goalsData.goals}
          edges={goalsData.edges}
          nords={(graph?.nords || []).map(n => ({
            id: n.id,
            title: n.title,
            type_name: graph?.nord_types.find((t: any) => t.id === n.type_id)?.name || '',
          }))}
          variables={variablesData.variables}
          collectionGroups={collectionGroupsData.groups}
          onUpdate={goalsData.updateGoal}
          onAddVariableBinding={goalsData.addVariableBinding}
          onUpdateVariableBinding={goalsData.updateVariableBinding}
          onRemoveVariableBinding={goalsData.removeVariableBinding}
          onAddRelevantNord={goalsData.addRelevantNord}
          onRemoveRelevantNord={goalsData.removeRelevantNord}
          onEdgeCreate={goalsData.createEdge}
          onEdgeDelete={goalsData.deleteEdge}
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
        goals={goalsData.goals}
        onAddGoalNord={goalsData.addRelevantNord}
        onRemoveGoalNord={goalsData.removeRelevantNord}
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
        onPersonaChanged={refetchPersonas}
      />
      <ManageGoals
        projectId={projectId || ''}
        open={goalsOpen}
        onClose={() => setGoalsOpen(false)}
      />
      <ManageVariables
        projectId={projectId || ''}
        open={variablesOpen}
        onClose={() => setVariablesOpen(false)}
      />
      {projectId && (
        <SharePanel
          projectId={projectId}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
      {projectId && (
        <PreviewChat
          projectId={projectId}
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          onDataChanged={() => {
            refetch();
            goalsData.refetch();
          }}
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
          goalsEnabled={!graphOnly}
          open={testRunnerOpen}
          onClose={() => setTestRunnerOpen(false)}
        />
      )}
      {projectId && (
        <SessionExplorer
          projectId={projectId}
          open={sessionsOpen}
          onClose={() => setSessionsOpen(false)}
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
    <Routes>
      {/* Public share link — outside auth entirely */}
      <Route path="/share/:token" element={<ShareChat />} />

      {/* Everything else wrapped in AuthProvider */}
      <Route path="*" element={
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
              <WorkspaceShell currentTheme={currentTheme} onThemeChange={setCurrentTheme} />
            </ProtectedRoute>
          }
        />
          </Routes>
        </AuthProvider>
      } />
    </Routes>
  );
}

export default App;
