import { useState, useCallback } from "react";
import type { ActiveTab, Problem, ToastState } from "../types";
import {
  DEFAULT_ALL_PROBLEMS_SORT,
  loadAllProblemsSort,
  loadV2LeetCodeIntroDismissed,
  saveAllProblemsSort,
  saveV2LeetCodeIntroDismissed,
} from "../utils/uiState";
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
  v2LeetCodeIntroDismissed: boolean;
  setSettingsOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setDeleteTarget: (problem: Problem | null) => void;
  setClearDataConfirm: (confirm: boolean) => void;
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
  dismissV2LeetCodeIntro: () => void;
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
  const [v2LeetCodeIntroDismissed, setV2LeetCodeIntroDismissed] = useState(() => loadV2LeetCodeIntroDismissed());

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

  const dismissV2LeetCodeIntro = useCallback(() => {
    setV2LeetCodeIntroDismissed(true);
    saveV2LeetCodeIntroDismissed(true);
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
    v2LeetCodeIntroDismissed,
    setSettingsOpen,
    setHelpOpen,
    setDeleteTarget,
    setClearDataConfirm,
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
    dismissV2LeetCodeIntro,
  };
}
