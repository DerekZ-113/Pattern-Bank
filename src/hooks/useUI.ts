import { useState, useCallback } from "react";
import type { ActiveTab, Problem, ToastState } from "../types";
import {
  DEFAULT_ALL_PROBLEMS_SORT,
  loadAllProblemsSort,
  loadWhatsNewDismissedId,
  saveAllProblemsSort,
  saveWhatsNewDismissedId,
} from "../utils/uiState";
import { WHATS_NEW } from "../utils/whatsNew";
import type { AllProblemsSort } from "../utils/uiState";

interface UseUIReturn {
  activeTab: ActiveTab;
  modalOpen: boolean;
  editingProblem: Problem | null;
  toast: ToastState;
  deleteTarget: Problem | null;
  settingsOpen: boolean;
  helpOpen: boolean;
  problemsInitialSort: AllProblemsSort;
  problemsInitialPatternFilter: string;
  clearDataConfirm: boolean;
  respreadConfirm: boolean;
  whatsNewDismissed: boolean;
  setSettingsOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setDeleteTarget: (problem: Problem | null) => void;
  setClearDataConfirm: (confirm: boolean) => void;
  setRespreadConfirm: (confirm: boolean) => void;
  showToast: (msg: string, action?: ToastState["action"], variant?: ToastState["variant"]) => void;
  hideToast: () => void;
  handleEdit: (problem: Problem) => void;
  handleDeleteRequest: (problem: Problem) => void;
  handleViewAllDue: () => void;
  handlePatternClick: (pattern: string) => void;
  handleProblemsSortChange: (sort: AllProblemsSort) => void;
  handleTabChange: (tab: ActiveTab) => void;
  openAddModal: () => void;
  closeModal: () => void;
  requestClearData: () => void;
  dismissWhatsNew: () => void;
}

export default function useUI(): UseUIReturn {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "" });
  const [deleteTarget, setDeleteTarget] = useState<Problem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [problemsInitialSort, setProblemsInitialSort] = useState<AllProblemsSort>(() => loadAllProblemsSort());
  const [problemsInitialPatternFilter, setProblemsInitialPatternFilter] = useState("all");
  const [clearDataConfirm, setClearDataConfirm] = useState(false);
  const [respreadConfirm, setRespreadConfirm] = useState(false);
  const [whatsNewDismissedId, setWhatsNewDismissedId] = useState<string | null>(() => loadWhatsNewDismissedId());

  const showToast = useCallback(
    (msg: string, action?: ToastState["action"], variant: ToastState["variant"] = "success") =>
      setToast({ visible: true, message: msg, action, variant }),
    []
  );

  const hideToast = useCallback(
    () => setToast({ visible: false, message: "" }),
    []
  );

  const handleEdit = useCallback((problem: Problem) => {
    setEditingProblem(problem);
    setModalOpen(true);
  }, []);

  const handleDeleteRequest = useCallback(
    (problem: Problem) => setDeleteTarget(problem),
    []
  );

  const setPersistedProblemsSort = useCallback((sort: AllProblemsSort) => {
    setProblemsInitialSort(sort);
    saveAllProblemsSort(sort);
  }, []);

  const handleProblemsSortChange = useCallback((sort: AllProblemsSort) => {
    setPersistedProblemsSort(sort);
  }, [setPersistedProblemsSort]);

  const handleViewAllDue = useCallback(() => {
    setPersistedProblemsSort("nextReview");
    setProblemsInitialPatternFilter("all");
    setActiveTab("problems");
  }, [setPersistedProblemsSort]);

  const handlePatternClick = useCallback((pattern: string) => {
    setProblemsInitialPatternFilter(pattern);
    setPersistedProblemsSort(DEFAULT_ALL_PROBLEMS_SORT);
    setActiveTab("problems");
  }, [setPersistedProblemsSort]);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setProblemsInitialPatternFilter("all");
    setActiveTab(tab);
  }, []);

  const openAddModal = useCallback(() => {
    setEditingProblem(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const requestClearData = useCallback(() => {
    setSettingsOpen(false);
    setClearDataConfirm(true);
  }, []);

  const dismissWhatsNew = useCallback(() => {
    setWhatsNewDismissedId(WHATS_NEW.id);
    saveWhatsNewDismissedId(WHATS_NEW.id);
  }, []);

  return {
    activeTab,
    modalOpen,
    editingProblem,
    toast,
    deleteTarget,
    settingsOpen,
    helpOpen,
    problemsInitialSort,
    problemsInitialPatternFilter,
    clearDataConfirm,
    respreadConfirm,
    whatsNewDismissed: whatsNewDismissedId === WHATS_NEW.id,
    setSettingsOpen,
    setHelpOpen,
    setDeleteTarget,
    setClearDataConfirm,
    setRespreadConfirm,
    showToast,
    hideToast,
    handleEdit,
    handleDeleteRequest,
    handleViewAllDue,
    handlePatternClick,
    handleProblemsSortChange,
    handleTabChange,
    openAddModal,
    closeModal,
    requestClearData,
    dismissWhatsNew,
  };
}
