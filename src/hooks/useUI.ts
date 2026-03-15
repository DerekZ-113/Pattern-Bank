import { useState, useCallback } from "react";
import type { ActiveTab, Problem, ToastState } from "../types";

interface UseUIReturn {
  activeTab: ActiveTab;
  modalOpen: boolean;
  editingProblem: Problem | null;
  toast: ToastState;
  deleteTarget: Problem | null;
  settingsOpen: boolean;
  problemsInitialSort: string;
  problemsInitialPatternFilter: string;
  clearDataConfirm: boolean;
  setSettingsOpen: (open: boolean) => void;
  setDeleteTarget: (problem: Problem | null) => void;
  setClearDataConfirm: (confirm: boolean) => void;
  showToast: (msg: string) => void;
  hideToast: () => void;
  handleEdit: (problem: Problem) => void;
  handleDeleteRequest: (problem: Problem) => void;
  handleViewAllDue: () => void;
  handlePatternClick: (pattern: string) => void;
  handleTabChange: (tab: ActiveTab) => void;
  openAddModal: () => void;
  closeModal: () => void;
  requestClearData: () => void;
}

export default function useUI(): UseUIReturn {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "" });
  const [deleteTarget, setDeleteTarget] = useState<Problem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [problemsInitialSort, setProblemsInitialSort] = useState("dateAdded");
  const [problemsInitialPatternFilter, setProblemsInitialPatternFilter] = useState("all");
  const [clearDataConfirm, setClearDataConfirm] = useState(false);

  const showToast = useCallback(
    (msg: string) => setToast({ visible: true, message: msg }),
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

  const handleViewAllDue = useCallback(() => {
    setProblemsInitialSort("nextReview");
    setProblemsInitialPatternFilter("all");
    setActiveTab("problems");
  }, []);

  const handlePatternClick = useCallback((pattern: string) => {
    setProblemsInitialPatternFilter(pattern);
    setProblemsInitialSort("dateAdded");
    setActiveTab("problems");
  }, []);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setProblemsInitialSort("dateAdded");
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

  return {
    activeTab,
    modalOpen,
    editingProblem,
    toast,
    deleteTarget,
    settingsOpen,
    problemsInitialSort,
    problemsInitialPatternFilter,
    clearDataConfirm,
    setSettingsOpen,
    setDeleteTarget,
    setClearDataConfirm,
    showToast,
    hideToast,
    handleEdit,
    handleDeleteRequest,
    handleViewAllDue,
    handlePatternClick,
    handleTabChange,
    openAddModal,
    closeModal,
    requestClearData,
  };
}
