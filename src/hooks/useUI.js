import { useState, useCallback } from "react";

export default function useUI() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [problemsInitialSort, setProblemsInitialSort] = useState("dateAdded");
  const [problemsInitialPatternFilter, setProblemsInitialPatternFilter] = useState("all");
  const [clearDataConfirm, setClearDataConfirm] = useState(false);

  const showToast = useCallback(
    (msg) => setToast({ visible: true, message: msg }),
    []
  );

  const hideToast = useCallback(
    () => setToast({ visible: false, message: "" }),
    []
  );

  const handleEdit = useCallback((problem) => {
    setEditingProblem(problem);
    setModalOpen(true);
  }, []);

  const handleDeleteRequest = useCallback(
    (problem) => setDeleteTarget(problem),
    []
  );

  const handleViewAllDue = useCallback(() => {
    setProblemsInitialSort("nextReview");
    setProblemsInitialPatternFilter("all");
    setActiveTab("problems");
  }, []);

  const handlePatternClick = useCallback((pattern) => {
    setProblemsInitialPatternFilter(pattern);
    setProblemsInitialSort("dateAdded");
    setActiveTab("problems");
  }, []);

  const handleTabChange = useCallback((tab) => {
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
    setEditingProblem(null);
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
