"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import gsap from "gsap";
import { Button, DataTable, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { ServerPaginatedTable } from "@/components/ServerPaginatedTable";
import apiClient from "@/lib/apiClient";
import secureStorage from "@/lib/secureStorage";
import { uploadImageToGCP } from "@/lib/uploadToGCP";

const TABS = ["Matches", "Teams", "Person", "Sponsorships", "Metrics", "Stats", "Requests", "Edit Details"];

const ROLE_OPTIONS = ["PLAYER", "OFFICIAL", "COACH", "MANAGER"];

const ROLE_COLORS = {
    PLAYER: "#1e3a5f",
    OFFICIAL: "#3a1e5f",
    COACH: "#1e5f3a",
    MANAGER: "#5f3a1e",
};

const STATUS_OPTIONS = ["upcoming", "active", "completed", "cancelled"];

const matchStatusStyle = {
    completed: "bg-gray-500 text-white",
    upcoming: "bg-blue-500 text-white",
    live: "bg-emerald-500 text-white",
};

const PLAYER_COLORS = ["#1e3a5f", "#3a1e5f", "#1e5f3a", "#5f3a1e", "#1e4a5f", "#4a1e5f"];

export default function EditionDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { theme } = useTheme();
    const { user } = useAuth();

    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState("Matches");
    const [edition, setEdition] = useState(null);
    const [matches, setMatches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [teamsLoading, setTeamsLoading] = useState(false);

    const [canAddMatch, setCanAddMatch] = useState(false);
    const [canEditMatch, setCanEditMatch] = useState(false);
    const [canDeleteMatch, setCanDeleteMatch] = useState(false);
    const [canAddTeam, setCanAddTeam] = useState(false);
    const [canEditTeam, setCanEditTeam] = useState(false);
    const [canDeleteTeam, setCanDeleteTeam] = useState(false);
    const [canAddPlayer, setCanAddPlayer] = useState(false);
    const [canEditPlayer, setCanEditPlayer] = useState(false);
    const [canDeletePlayer, setCanDeletePlayer] = useState(false);
    const [canAddDataEntry, setCanAddDataEntry] = useState(false);
    const [canEditDataEntry, setCanEditDataEntry] = useState(false);
    const [canDeleteDataEntry, setCanDeleteDataEntry] = useState(false);

    const hasPermission = (permission) => {
        if (typeof window === "undefined") return false;
        if (user?.role === "super_admin") return true;
        const isIpOwner = secureStorage.getItem("is_ip_owner") || false;
        if (isIpOwner) return true;
        const perms = secureStorage.getItem("user_permissions") || [];
        return perms.includes(permission);
    };

    useEffect(() => {
        if (typeof window !== "undefined") {
            setCanAddMatch(hasPermission("matches:add"));
            setCanEditMatch(hasPermission("matches:edit"));
            setCanDeleteMatch(hasPermission("matches:del"));
            setCanAddTeam(hasPermission("teams:add"));
            setCanEditTeam(hasPermission("teams:edit"));
            setCanDeleteTeam(hasPermission("teams:del"));
            setCanAddPlayer(hasPermission("players:add"));
            setCanEditPlayer(hasPermission("players:edit"));
            setCanDeletePlayer(hasPermission("players:del"));
            setCanAddDataEntry(hasPermission("data_entry:add"));
            setCanEditDataEntry(hasPermission("data_entry:edit"));
            setCanDeleteDataEntry(hasPermission("data_entry:del"));
        }
    }, [user]);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [isSavingTeam, setIsSavingTeam] = useState(false);
    const [teamForm, setTeamForm] = useState({ name: "", short_name: "", logo: null, logoPreview: "" });
    const teamModalRef = useRef(null);
    const teamLogoRef = useRef(null);
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [editingMatchId, setEditingMatchId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [matchForm, setMatchForm] = useState({
        match_no: "", round: "", team1_id: "", team2_id: "",
        scheduled_at: "", actual_start_time: "", actual_end_time: "", venue: "",
    });

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const contentRef = useRef(null);
    const modalRef = useRef(null);

    const [players, setPlayers] = useState([]);
    const [playersLoading, setPlayersLoading] = useState(false);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [editingPlayerId, setEditingPlayerId] = useState(null);
    const [isSavingPlayer, setIsSavingPlayer] = useState(false);
    const [playerForm, setPlayerForm] = useState({ full_name: "", role: "PLAYER", external_id: "", source: "KADAMBA", team_id: "", image: null, imagePreview: "" });
    const playerModalRef = useRef(null);
    const playerImageRef = useRef(null);

    const [sponsorships, setSponsorships] = useState([]);
    const [sponsorshipsLoading, setSponsorshipsLoading] = useState(false);
    const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
    const [editingSponsorId, setEditingSponsorId] = useState(null);
    const [isSavingSponsor, setIsSavingSponsor] = useState(false);
    const [sponsorForm, setSponsorForm] = useState({ brand_name: "", sponsor_type: "TITLE", contract_value: "" });
    const sponsorModalRef = useRef(null);

    const [metricTree, setMetricTree] = useState(null);
    const [metricsFormData, setMetricsFormData] = useState({});
    const [isSavingMetrics, setIsSavingMetrics] = useState(false);
    const [userPermissions, setUserPermissions] = useState([]);
    const [isIpOwner, setIsIpOwner] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [selectedMatchId, setSelectedMatchId] = useState("");
    const [selectedPersonId, setSelectedPersonId] = useState("");
    const [activeMetricCategory, setActiveMetricCategory] = useState(0);
    const [metricRowData, setMetricRowData] = useState({});

    const [metricValues, setMetricValues] = useState([]);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsPage, setStatsPage] = useState(1);
    const [statsTotalPages, setStatsTotalPages] = useState(1);
    const [statsFilters, setStatsFilters] = useState({
        match_id: "",
        metric_definition_id: "",
        is_approved: ""
    });
    const [isEditingMetricValue, setIsEditingMetricValue] = useState(false);
    const [editingMetricValueId, setEditingMetricValueId] = useState(null);
    const [editMetricValueForm, setEditMetricValueForm] = useState({ value_text: "" });
    const editMetricValueModalRef = useRef(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingMetricValueId, setDeletingMetricValueId] = useState(null);
    const deleteModalRef = useRef(null);

    const [userRequests, setUserRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [requestsStatusFilter, setRequestsStatusFilter] = useState("approved,rejected");

    useEffect(() => {
        setMounted(true);
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(contentRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.1 });

        const perms = secureStorage.getItem("user_permissions") || [];
        setUserPermissions(perms);

        const ipOwner = secureStorage.getItem("is_ip_owner") || false;
        setIsIpOwner(ipOwner);

        fetchEdition();
        fetchMatches();
        fetchTeams();
        fetchPlayers();
        fetchSponsorships();
        fetchMetricTree();
    }, [id]);

    useEffect(() => {
        if (activeTab === "Stats") {
            fetchMetricValues();
        }
    }, [activeTab, statsPage, statsFilters]);

    useEffect(() => {
        if (activeTab === "Requests") {
            fetchUserRequests();
        }
    }, [activeTab, requestsStatusFilter]);

    const fetchEdition = async () => {
        const activeIp = secureStorage.getItem("active_ip");
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT}/${id}?property_id=${activeIp?.id}`
        );
        if (result.success) setEdition(result.data?.data || result.data);
    };

    const fetchMatches = async () => {
        const activeIp = secureStorage.getItem("active_ip");
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_MATCHES_ENDPOINT}?property_id=${activeIp?.id}&edition_id=${id}`
        );
        if (result.success) {
            const arr = result.data?.data?.matches || result.data?.matches || result.data?.data || [];
            setMatches(Array.isArray(arr) ? arr : []);
        }
    };

    const fetchTeams = async () => {
        setTeamsLoading(true);
        const activeIp = secureStorage.getItem("active_ip");
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_TEAMS_ENDPOINT}?property_id=${activeIp?.id}`
        );
        if (result.success) {
            const arr = result.data?.data?.teams || result.data?.teams || result.data?.data || [];
            setTeams(Array.isArray(arr) ? arr : []);
        }
        setTeamsLoading(false);
    };

    const fetchPlayers = async () => {
        const activeIp = secureStorage.getItem("active_ip");
        if (!activeIp) return;
        setPlayersLoading(true);
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_PERSONS_ENDPOINT}?edition_id=${id}&property_id=${activeIp?.id}`
        );
        if (result.success) {
            const arr = result.data?.data?.persons
                || result.data?.persons
                || (Array.isArray(result.data?.data) ? result.data.data : null)
                || (Array.isArray(result.data) ? result.data : []);
            setPlayers(Array.isArray(arr) ? arr : []);
        }
        setPlayersLoading(false);
    };

    const fetchSponsorships = async () => {
        setSponsorshipsLoading(true);
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_SPONSORSHIPS_ENDPOINT}?edition_id=${id}`
        );
        if (result.success) {
            const arr = result.data?.data?.sponsorships
                || result.data?.sponsorships
                || (Array.isArray(result.data?.data) ? result.data.data : null)
                || (Array.isArray(result.data) ? result.data : []);
            setSponsorships(Array.isArray(arr) ? arr : []);
        }
        setSponsorshipsLoading(false);
    };

    const fetchMetricTree = async () => {
        const activeIp = secureStorage.getItem("active_ip");
        if (!activeIp) return;

        const metricTrees = secureStorage.getItem("metric_trees");
        if (metricTrees) {
            const trees = JSON.parse(metricTrees);
            const tree = trees[activeIp.id];
            if (tree) {
                const treeData = tree.tree || tree;
                setMetricTree(treeData);
                initializeMetricsFormData(treeData);
                return;
            }
        }

        const sportId = activeIp.sport_id || activeIp.sport?.id;
        if (!sportId) return;

        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_METRIC_CATEGORIES_ENDPOINT}/get-tree/${sportId}`
        );
        if (result.success) {
            const treeData = result.data?.data || result.data;
            if (Array.isArray(treeData)) {
                setMetricTree(treeData);
                initializeMetricsFormData(treeData);
            }
        }
    };

    const initializeMetricsFormData = (tree) => {
        const initialData = {};
        if (Array.isArray(tree)) {
            tree.forEach(category => {
                if (Array.isArray(category.metric_definitions)) {
                    category.metric_definitions.forEach(def => {
                        initialData[def.key_name] = getDefaultMetricValue(def.data_type);
                    });
                }
            });
        }
        setMetricsFormData(initialData);
    };

    const getDefaultMetricValue = (dataType) => {
        switch (dataType) {
            case "integer":
            case "float":
                return "";
            case "boolean":
                return false;
            case "string":
            default:
                return "";
        }
    };

    const canEditMetricField = () => {
        if (user?.role === "super_admin") return true;

        if (isIpOwner) return true;
        return hasPermission("data_entry:add") || hasPermission("data_entry:edit");
    };

    const handleMetricInputChange = (keyName, value, dataType) => {
        let processedValue = value;
        if (dataType === "integer") {
            processedValue = value === "" ? "" : parseInt(value) || 0;
        } else if (dataType === "float") {
            processedValue = value === "" ? "" : parseFloat(value) || 0;
        } else if (dataType === "boolean") {
            processedValue = value;
        }
        setMetricsFormData(prev => ({ ...prev, [keyName]: processedValue }));
        if (fieldErrors[keyName]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[keyName];
                return newErrors;
            });
        }
    };

    const handleSubmitMetricRow = async (definitionId) => {
        const rowData = metricRowData[definitionId];

        if (!rowData) {
            toast.error("Please fill all fields");
            return;
        }

        if (!rowData.match_id) {
            toast.error("Please select a match");
            return;
        }

        if (!rowData.person_id) {
            toast.error("Please select a player");
            return;
        }

        if (!rowData.value && rowData.value !== 0 && rowData.value !== false) {
            toast.error("Please enter a value");
            return;
        }

        const activeIp = secureStorage.getItem("active_ip");
        const currentDate = new Date().toISOString().split('T')[0];
        const payload = {
            metric_definition_id: definitionId,
            edition_id: Number(id),
            match_id: Number(rowData.match_id),
            person_id: Number(rowData.person_id),
            recorded_date: currentDate,
            value_text: String(rowData.value)
        };

        const result = await apiClient.post(
            `${process.env.NEXT_PUBLIC_METRIC_VALUES_ENDPOINT}?property_id=${activeIp?.id}`,
            payload
        );

        if (result.success) {
            const isSuperAdmin = user?.role === "super_admin";
            const message = isSuperAdmin
                ? "Changes applied"
                : (result.data?.message || result.message || "Metric saved successfully!");

            toast.success(message, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });

            setMetricRowData(prev => {
                const newData = { ...prev };
                delete newData[definitionId];
                return newData;
            });
        } else {
            toast.error(result.error || "Failed to save metric.");
        }
    };

    const updateMetricRowData = (definitionId, field, value) => {
        setMetricRowData(prev => ({
            ...prev,
            [definitionId]: {
                ...prev[definitionId],
                [field]: value
            }
        }));
    };

    const handleMetricsSubmit = async (e) => {
        e.preventDefault();
        const errors = {};
        let hasError = false;

        if (!selectedMatchId) {
            toast.error("Please select a match");
            return;
        }

        if (!selectedPersonId) {
            toast.error("Please select a player");
            return;
        }

        if (metricTree && Array.isArray(metricTree)) {
            metricTree.forEach(category => {
                if (Array.isArray(category.metric_definitions)) {
                    category.metric_definitions.forEach(def => {
                        if (def.is_required && (metricsFormData[def.key_name] === "" || metricsFormData[def.key_name] === null || metricsFormData[def.key_name] === undefined)) {
                            errors[def.key_name] = `${def.label} is required`;
                            hasError = true;
                        }
                    });
                }
            });
        }

        if (hasError) {
            setFieldErrors(errors);
            toast.error("Please fill all required fields");
            return;
        }

        setIsSavingMetrics(true);

        const promises = [];
        const currentDate = new Date().toISOString().split('T')[0];
        const activeIp = secureStorage.getItem("active_ip");

        if (metricTree && Array.isArray(metricTree)) {
            metricTree.forEach(category => {
                if (Array.isArray(category.metric_definitions)) {
                    category.metric_definitions.forEach(def => {
                        const value = metricsFormData[def.key_name];

                        if (value !== "" && value !== null && value !== undefined) {
                            const payload = {
                                metric_definition_id: def.id,
                                edition_id: Number(id),
                                match_id: Number(selectedMatchId),
                                person_id: Number(selectedPersonId),
                                recorded_date: currentDate,
                                value_text: String(value)
                            };

                            promises.push(
                                apiClient.post(
                                    `${process.env.NEXT_PUBLIC_METRIC_VALUES_ENDPOINT}?property_id=${activeIp?.id}`,
                                    payload
                                )
                            );
                        }
                    });
                }
            });
        }

        try {
            const results = await Promise.all(promises);
            const allSuccess = results.every(result => result.success);

            if (allSuccess) {
                const isSuperAdmin = user?.role === "super_admin";
                const message = isSuperAdmin
                    ? "Changes applied"
                    : (results[0]?.data?.message || results[0]?.message || "Metrics saved successfully!");

                toast.success(message, {
                    style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
                });

                setMetricsFormData({});
                setSelectedMatchId("");
                setSelectedPersonId("");
                initializeMetricsFormData(metricTree);
            } else {
                toast.error("Some metrics failed to save. Please try again.");
            }
        } catch (error) {
            console.error("Error saving metrics:", error);
            toast.error("Failed to save metrics. Please try again.");
        }

        setIsSavingMetrics(false);
    };

    const fetchMetricValues = async () => {
        setStatsLoading(true);
        const activeIp = secureStorage.getItem("active_ip");
        const params = new URLSearchParams({
            page: statsPage,
            limit: 10,
            edition_id: id,
            property_id: activeIp?.id
        });

        if (statsFilters.match_id) params.set("match_id", statsFilters.match_id);
        if (statsFilters.metric_definition_id) params.set("metric_definition_id", statsFilters.metric_definition_id);
        if (statsFilters.is_approved) params.set("is_approved", statsFilters.is_approved);

        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_METRIC_VALUES_ENDPOINT}?${params.toString()}`
        );

        if (result.success) {
            const data = result.data?.data;
            const arr = Array.isArray(data?.metric_values) ? data.metric_values
                : Array.isArray(data) ? data : [];
            setMetricValues(arr);

            const total = data?.total || arr.length;
            setStatsTotalPages(Math.ceil(total / 10));
        } else {
            toast.error(result.error || "Failed to load metric values.");
        }
        setStatsLoading(false);
    };

    const fetchUserRequests = async () => {
        setRequestsLoading(true);
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_CHANGE_REQUESTS_ENDPOINT}/all?submitted_by=${user?.id}&status=${requestsStatusFilter}&edition_id=${id}`
        );
        if (result.success) {
            const arr = result.data?.data || (Array.isArray(result.data) ? result.data : []);
            setUserRequests(Array.isArray(arr) ? arr : []);
        } else {
            toast.error(result.error || "Failed to load requests.");
        }
        setRequestsLoading(false);
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            pending: "bg-amber-500",
            approved: "bg-emerald-500",
            rejected: "bg-red-500"
        };
        const statusLabels = {
            pending: "Pending",
            approved: "Approved",
            rejected: "Rejected"
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${statusColors[status] || "bg-gray-500"}`}>
                {statusLabels[status] || status}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const openEditMetricValueModal = (metricValue) => {
        setEditingMetricValueId(metricValue.id);
        setEditMetricValueForm({ value_text: metricValue.value_text || "" });
        setIsEditingMetricValue(true);
        requestAnimationFrame(() => {
            if (editMetricValueModalRef.current)
                gsap.fromTo(editMetricValueModalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        });
    };

    const closeEditMetricValueModal = () => {
        gsap.to(editMetricValueModalRef.current, {
            scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => setIsEditingMetricValue(false),
        });
    };

    const handleUpdateMetricValue = async (e) => {
        e.preventDefault();
        const activeIp = secureStorage.getItem("active_ip");
        const result = await apiClient.put(
            `${process.env.NEXT_PUBLIC_METRIC_VALUES_ENDPOINT}/${editingMetricValueId}?property_id=${activeIp?.id}`,
            { value_text: editMetricValueForm.value_text }
        );

        if (result.success) {
            const isSuperAdmin = user?.role === "super_admin";
            const message = isSuperAdmin
                ? "Changes done"
                : (result.data?.message || result.message || "Metric value updated successfully!");

            toast.success(message, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchMetricValues();
            closeEditMetricValueModal();
        } else {
            toast.error(result.error || "Failed to update metric value.");
        }
    };

    const handleDeleteMetricValue = async (metricValueId) => {
        const activeIp = secureStorage.getItem("active_ip");
        const result = await apiClient.delete(
            `${process.env.NEXT_PUBLIC_METRIC_VALUES_ENDPOINT}/${metricValueId}?property_id=${activeIp?.id}`
        );

        if (result.success) {
            const isSuperAdmin = user?.role === "super_admin";
            const message = isSuperAdmin
                ? "Changes done"
                : (result.data?.message || result.message || "Metric value deleted!");

            toast.success(message, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchMetricValues();
            closeDeleteModal();
        } else {
            toast.error(result.error || "Failed to delete metric value.");
        }
    };

    const openDeleteModal = (metricValueId) => {
        setDeletingMetricValueId(metricValueId);
        setIsDeleteModalOpen(true);
        requestAnimationFrame(() => {
            if (deleteModalRef.current)
                gsap.fromTo(deleteModalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        });
    };

    const closeDeleteModal = () => {
        gsap.to(deleteModalRef.current, {
            scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => {
                setIsDeleteModalOpen(false);
                setDeletingMetricValueId(null);
            },
        });
    };

    const openSponsorModal = (sponsor = null) => {
        if (sponsor) {
            setEditingSponsorId(sponsor.id);
            setSponsorForm({
                brand_name: sponsor.brand_name || "",
                sponsor_type: sponsor.sponsor_type || "TITLE",
                contract_value: sponsor.contract_value || "",
            });
        } else {
            setEditingSponsorId(null);
            setSponsorForm({ brand_name: "", sponsor_type: "TITLE", contract_value: "" });
        }
        setIsSponsorModalOpen(true);
        requestAnimationFrame(() => {
            if (sponsorModalRef.current)
                gsap.fromTo(sponsorModalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        });
    };

    const closeSponsorModal = () => {
        gsap.to(sponsorModalRef.current, {
            scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => setIsSponsorModalOpen(false),
        });
    };

    const handleSaveSponsor = async (e) => {
        e.preventDefault();
        setIsSavingSponsor(true);
        const payload = {
            edition_id: Number(id),
            sponsor_type: sponsorForm.sponsor_type,
            brand_name: sponsorForm.brand_name,
            contract_value: parseFloat(sponsorForm.contract_value),
        };
        const result = editingSponsorId
            ? await apiClient.put(`${process.env.NEXT_PUBLIC_SPONSORSHIPS_ENDPOINT}/${editingSponsorId}`, payload)
            : await apiClient.post(process.env.NEXT_PUBLIC_SPONSORSHIPS_ENDPOINT, payload);
        if (result.success) {
            toast.success(`${sponsorForm.brand_name} ${editingSponsorId ? "updated" : "added"} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchSponsorships();
            closeSponsorModal();
        } else {
            toast.error(result.error || "Failed to save sponsorship.");
        }
        setIsSavingSponsor(false);
    };

    const handleDeleteSponsor = async (sponsorId, brandName) => {
        const result = await apiClient.delete(`${process.env.NEXT_PUBLIC_SPONSORSHIPS_ENDPOINT}/${sponsorId}`);
        if (result.success) {
            setSponsorships(prev => prev.filter(s => s.id !== sponsorId));
            toast.success(`${brandName} removed!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
        } else {
            toast.error(result.error || "Failed to delete sponsorship.");
        }
    };

    const openPlayerModal = (player = null) => {
        if (player) {
            setEditingPlayerId(player.id);
            setPlayerForm({
                full_name: player.full_name || "",
                role: player.role || "PLAYER",
                external_id: player.external_id || "",
                source: player.source || "manual",
                team_id: player.team_id ? String(player.team_id) : (player.team?.id ? String(player.team.id) : (player.edition_participants?.[0]?.team_id ? String(player.edition_participants[0].team_id) : "")),
                image: null,
                imagePreview: player.image || "",
            });
        } else {
            setEditingPlayerId(null);
            setPlayerForm({ full_name: "", role: "PLAYER", external_id: "", source: "KADAMBA", team_id: "", image: null, imagePreview: "" });
        }
        setIsPlayerModalOpen(true);
        requestAnimationFrame(() => {
            if (playerModalRef.current)
                gsap.fromTo(playerModalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        });
    };

    const closePlayerModal = () => {
        gsap.to(playerModalRef.current, {
            scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => setIsPlayerModalOpen(false),
        });
    };

    const handlePlayerImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log("📸 Player Image Upload Started:", {
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(2)} KB`,
            fileType: file.type
        });

        const preview = URL.createObjectURL(file);
        setPlayerForm(prev => ({ ...prev, image: file, imagePreview: preview }));

        toast.loading("Uploading image to GCP...", { id: "player-image-upload" });
        const uploadResult = await uploadImageToGCP(file, "players");

        if (uploadResult.success) {
            console.log("✅ Player image uploaded! GCP URL:", uploadResult.url);
            toast.success("Image uploaded successfully!", { id: "player-image-upload" });

            setPlayerForm(prev => ({ ...prev, imagePreview: uploadResult.url }));
        } else {
            console.error("❌ Player image upload failed:", uploadResult.error);
            toast.error(uploadResult.error || "Failed to upload image", { id: "player-image-upload" });
        }
    };

    const handleSavePlayer = async (e) => {
        e.preventDefault();
        setIsSavingPlayer(true);
        console.log("playerFormplayerFormplayerForm", playerForm)
        const activeIp = secureStorage.getItem("active_ip");
        const payload = {
            property_id: activeIp?.id,
            full_name: playerForm.full_name,
            role: playerForm.role,
            external_id: playerForm.external_id || undefined,
            source: playerForm.source || "manual",
            edition_id: Number(id),
            team_id: playerForm.role == "OFFICIAL" ? null : (playerForm.team_id ? Number(playerForm.team_id) : undefined),
            image: playerForm.imagePreview || "",
        };
        const result = editingPlayerId
            ? await apiClient.put(`${process.env.NEXT_PUBLIC_PERSONS_ENDPOINT}/${editingPlayerId}`, payload)
            : await apiClient.post(`${process.env.NEXT_PUBLIC_PERSONS_ENDPOINT}`, payload);
        if (result.success) {
            toast.success(`${playerForm.full_name} ${editingPlayerId ? "updated" : "registered"} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchPlayers();
            closePlayerModal();
        } else {
            toast.error(result.error || "Failed to save player.");
        }
        setIsSavingPlayer(false);
    };

    const handleDeletePlayer = async (playerId, playerName) => {
        const activeIp = secureStorage.getItem("active_ip");
        const result = await apiClient.delete(
            `${process.env.NEXT_PUBLIC_PERSONS_ENDPOINT}/${playerId}`,
            { property_id: activeIp?.id }
        );
        if (result.success) {
            setPlayers(prev => prev.filter(p => p.id !== playerId));
            toast.success(`${playerName} removed!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
        } else {
            toast.error(result.error || "Failed to delete player.");
        }
    };

    const openTeamModal = (team = null) => {
        if (team) {
            setEditingTeamId(team.id);
            setTeamForm({ name: team.name || "", short_name: team.short_name || "", logo: null, logoPreview: team.logo_url || "" });
        } else {
            setEditingTeamId(null);
            setTeamForm({ name: "", short_name: "", logo: null, logoPreview: "" });
        }
        setIsTeamModalOpen(true);
        requestAnimationFrame(() => {
            if (teamModalRef.current)
                gsap.fromTo(teamModalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        });
    };

    const closeTeamModal = () => {
        gsap.to(teamModalRef.current, {
            scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => setIsTeamModalOpen(false),
        });
    };

    const handleSaveTeam = async (e) => {
        e.preventDefault();
        setIsSavingTeam(true);
        const activeIp = secureStorage.getItem("active_ip");
        const payload = {
            property_id: activeIp?.id,
            name: teamForm.name,
            short_name: teamForm.short_name,
            logo_url: teamForm.logoPreview || "",
        };
        const result = editingTeamId
            ? await apiClient.post(`${process.env.NEXT_PUBLIC_TEAMS_ENDPOINT}/${editingTeamId}?property_id=${activeIp?.id}`, payload)
            : await apiClient.post(`${process.env.NEXT_PUBLIC_TEAMS_ENDPOINT}?property_id=${activeIp?.id}`, payload);
        if (result.success) {
            toast.success(`${teamForm.name} ${editingTeamId ? "updated" : "created"} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchTeams();
            closeTeamModal();
        } else {
            toast.error(result.error || "Failed to save team.");
        }
        setIsSavingTeam(false);
    };

    const handleTeamLogoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log("📸 Team Logo Upload Started:", {
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(2)} KB`,
            fileType: file.type
        });

        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
        if (!validTypes.includes(file.type)) {
            console.error("❌ Invalid file type:", file.type);
            toast.error("Invalid file type. Only images are allowed.");
            return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            console.error("❌ File too large:", `${(file.size / 1024 / 1024).toFixed(2)} MB`);
            toast.error("File size exceeds 5MB limit.");
            return;
        }

        const preview = URL.createObjectURL(file);
        setTeamForm(prev => ({ ...prev, logo: file, logoPreview: preview }));
        console.log("✅ Preview created:", preview);

        console.log("🚀 Starting GCP upload...");
        toast.loading("Uploading logo to GCP...", { id: "team-logo-upload" });

        const uploadResult = await uploadImageToGCP(file, "teams");

        console.log("📦 Upload Result:", uploadResult);

        if (uploadResult.success) {
            console.log("✅ Upload successful! GCP URL:", uploadResult.url);
            toast.success("Logo uploaded successfully!", { id: "team-logo-upload" });
            setTeamForm(prev => ({ ...prev, logoPreview: uploadResult.url }));
        } else {
            console.error("❌ Upload failed:", uploadResult.error);
            toast.error(uploadResult.error || "Failed to upload logo", { id: "team-logo-upload" });
        }
    };

    const handleDeleteTeam = async (teamId, teamName) => {
        const result = await apiClient.delete(`${process.env.NEXT_PUBLIC_TEAMS_ENDPOINT}/${teamId}`);
        if (result.success) {
            setTeams(prev => prev.filter(t => t.id !== teamId));
            toast.success(`${teamName} deleted!`, { style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' } });
        } else {
            toast.error(result.error || "Failed to delete team.");
        }
    };

    const switchTab = (tab) => {
        gsap.to(contentRef.current, {
            y: -8, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => {
                setActiveTab(tab);
                gsap.fromTo(contentRef.current, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" });
            }
        });
    };

    const openMatchModal = (match = null) => {
        if (match) {
            setEditingMatchId(match.id);
            setMatchForm({
                match_no: match.match_no || "",
                round: match.round || "",
                team1_id: match.team1_id || "",
                team2_id: match.team2_id || "",
                scheduled_at: match.scheduled_at?.slice(0, 16) || "",
                actual_start_time: match.actual_start_time?.slice(0, 16) || "",
                actual_end_time: match.actual_end_time?.slice(0, 16) || "",
                venue: match.venue || "",
            });
        } else {
            setEditingMatchId(null);
            setMatchForm({ match_no: "", round: "", team1_id: "", team2_id: "", scheduled_at: "", actual_start_time: "", actual_end_time: "", venue: "" });
        }
        setIsMatchModalOpen(true);
        requestAnimationFrame(() => {
            if (modalRef.current)
                gsap.fromTo(modalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        });
    };

    const closeMatchModal = () => {
        gsap.to(modalRef.current, {
            scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => setIsMatchModalOpen(false),
        });
    };

    const handleSaveMatch = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const activeIp = secureStorage.getItem("active_ip");
        const payload = {
            property_id: activeIp?.id,
            edition_id: Number(id),
            match_no: Number(matchForm.match_no),
            round: matchForm.round,
            team1_id: Number(matchForm.team1_id),
            team2_id: Number(matchForm.team2_id),
            scheduled_at: matchForm.scheduled_at ? new Date(matchForm.scheduled_at).toISOString() : undefined,
            actual_start_time: matchForm.actual_start_time ? new Date(matchForm.actual_start_time).toISOString() : undefined,
            actual_end_time: matchForm.actual_end_time ? new Date(matchForm.actual_end_time).toISOString() : undefined,
            venue: matchForm.venue,
        };
        const result = editingMatchId
            ? await apiClient.put(`${process.env.NEXT_PUBLIC_MATCHES_ENDPOINT}/${editingMatchId}`, payload)
            : await apiClient.post(process.env.NEXT_PUBLIC_MATCHES_ENDPOINT, payload);
        if (result.success) {
            toast.success(`Match ${editingMatchId ? "updated" : "created"} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchMatches();
            closeMatchModal();
        } else {
            toast.error(result.error || "Failed to save match.");
        }
        setIsSaving(false);
    };

    const handleDeleteMatch = async (matchId) => {
        const activeIp = secureStorage.getItem("active_ip");
        const result = await apiClient.delete(
            `${process.env.NEXT_PUBLIC_MATCHES_ENDPOINT}/${matchId}`,
            { property_id: activeIp?.id }
        );
        if (result.success) {
            setMatches(prev => prev.filter(m => m.id !== matchId));
            toast.success("Match deleted!", { style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' } });
        } else {
            toast.error(result.error || "Failed to delete match.");
        }
    };

    const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    const fmtTime = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

    const getMatchStatus = (match) => {
        const now = new Date();

        if (match.actual_end_time) {
            const endTime = new Date(match.actual_end_time);
            if (endTime <= now) {
                return "completed";
            }
        }

        if (match.actual_start_time && !match.actual_end_time) {
            const startTime = new Date(match.actual_start_time);
            if (startTime <= now) {
                return "live";
            }
        }

        if (match.scheduled_at) {
            const scheduledTime = new Date(match.scheduled_at);
            if (scheduledTime > now) {
                return "upcoming";
            }
        }

        return "upcoming";
    };

    return (
        <div ref={pageRef} className="space-y-6 opacity-0">
            {}
            <div ref={headerRef} className="px-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <button onClick={() => router.push("/editions")} className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-950 transition-colors mb-3">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        Back to Editions
                    </button>
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">Edition</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">{edition?.name || "Loading..."}</h1>
                    {edition && <p className="text-[14px] text-gray-400">{fmt(edition.start_date)} → {fmt(edition.end_date)}</p>}
                </div>
                <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm self-end overflow-x-auto scrollbar-hide max-w-full">
                    {TABS.map((tab) => (
                        <button key={tab} onClick={() => switchTab(tab)}
                            className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all duration-200 whitespace-nowrap ${activeTab === tab ? "text-white shadow-md" : "text-gray-400 hover:text-gray-950"}`}
                            style={activeTab === tab ? { backgroundColor: theme.primary_color } : {}}
                        >{tab}</button>
                    ))}
                </div>
            </div>

            {}
            <div ref={contentRef} className="px-4">

                {}
                {activeTab === "Matches" && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button
                                onClick={canAddMatch ? () => openMatchModal() : undefined}
                                disabled={!canAddMatch || teams.length < 2}
                                title={!canAddMatch ? "You don't have permission to add matches" : teams.length < 2 ? "Need at least 2 teams" : undefined}
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                            >
                                Add Match
                            </Button>
                        </div>
                        {teams.length < 2 && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-3">
                                <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-xs font-semibold text-amber-700">
                                    You need at least 2 teams to create a match. Please add teams first.
                                </p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {matches.length === 0 ? (
                                <div className="col-span-3 flex flex-col items-center justify-center py-24 text-gray-300">
                                    <svg className="w-14 h-14 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p className="text-sm font-semibold text-gray-400">No matches yet</p>
                                    <p className="text-xs text-gray-300 mt-1">Click &apos;Add Match&apos; to schedule one</p>
                                </div>
                            ) : matches.map((match) => {
                                const team1 = teams.find(t => t.id === match.team1_id);
                                const team2 = teams.find(t => t.id === match.team2_id);

                                const t1Name = team1?.name || match.team1?.name || `Team ${match.team1_id}`;
                                const t2Name = team2?.name || match.team2?.name || `Team ${match.team2_id}`;
                                const t1Short = team1?.short_name || match.team1?.short_name || String(t1Name).slice(0, 2).toUpperCase();
                                const t2Short = team2?.short_name || match.team2?.short_name || String(t2Name).slice(0, 2).toUpperCase();

                                const t1Logo = team1?.logo_url || match.team1?.logo_url || null;
                                const t2Logo = team2?.logo_url || match.team2?.logo_url || null;

                                console.log("Match Render Debug:", {
                                    match_id: match.id,
                                    match_no: match.match_no,
                                    team1_id: match.team1_id,
                                    team2_id: match.team2_id,
                                    teams_array_length: teams.length,
                                    team1_found: !!team1,
                                    team2_found: !!team2,
                                    team1_data: team1 ? { id: team1.id, name: team1.name, logo_url: team1.logo_url } : null,
                                    team2_data: team2 ? { id: team2.id, name: team2.name, logo_url: team2.logo_url } : null,
                                    t1Logo,
                                    t2Logo
                                });

                                const matchStatus = getMatchStatus(match);

                                return (
                                    <div key={match.id} className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-200">
                                        {}
                                        <div className="px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${theme.primary_color}12 0%, ${theme.secondary_color}12 100%)` }}>
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">{match.round}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-gray-400">#{match.match_no}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${matchStatusStyle[matchStatus] || matchStatusStyle.upcoming}`}>
                                                        {matchStatus === "live" && <span className="relative flex h-1.5 w-1.5 mr-0.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" /></span>}
                                                        {matchStatus}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 flex flex-col items-center gap-2">
                                                    {t1Logo ? (
                                                        <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-gray-100 p-2">
                                                            <img src={t1Logo} alt={t1Name} className="w-full h-full object-contain" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-sm" style={{ backgroundColor: theme.primary_color }}>
                                                            {t1Short}
                                                        </div>
                                                    )}
                                                    <p className="text-sm font-bold text-gray-800 text-center line-clamp-2 w-full">{t1Name}</p>
                                                </div>
                                                <div className="h-8 w-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm shrink-0">
                                                    <span className="text-[9px] font-black text-gray-300">VS</span>
                                                </div>
                                                <div className="flex-1 flex flex-col items-center gap-2">
                                                    {t2Logo ? (
                                                        <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-gray-100 p-2">
                                                            <img src={t2Logo} alt={t2Name} className="w-full h-full object-contain" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-sm" style={{ backgroundColor: theme.secondary_color }}>
                                                            {t2Short}
                                                        </div>
                                                    )}
                                                    <p className="text-sm font-bold text-gray-800 text-center line-clamp-2 w-full">{t2Name}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {}
                                        <div className="px-5 py-4 border-t border-gray-50 space-y-2.5">
                                            {match.venue && (
                                                <div className="flex items-center gap-2.5 text-gray-500">
                                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                                    <span className="text-sm font-medium truncate">{match.venue}</span>
                                                </div>
                                            )}
                                            {match.scheduled_at && (
                                                <div className="flex items-center gap-2.5 text-gray-500">
                                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    <span className="text-sm font-medium">{fmtTime(match.scheduled_at)}</span>
                                                </div>
                                            )}
                                            <div className="flex gap-2 pt-1">
                                                {canEditMatch && (
                                                    <button onClick={() => openMatchModal(match)} className="flex-1 h-9 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-widest hover:bg-gray-100 hover:text-gray-950 transition-all">Edit</button>
                                                )}
                                                {canDeleteMatch && (
                                                    <button onClick={() => handleDeleteMatch(match.id)} className="h-9 w-9 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {}
                {activeTab === "Teams" && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button
                                onClick={canAddTeam ? () => openTeamModal() : undefined}
                                disabled={!canAddTeam}
                                title={!canAddTeam ? "You don't have permission to add teams" : undefined}
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                            >
                                Add Team
                            </Button>
                        </div>
                        {teamsLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                                        <div className="h-36 bg-gray-100" />
                                        <div className="px-4 py-3 space-y-2">
                                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                                            <div className="h-2 bg-gray-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : teams.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <p className="text-sm font-semibold">No teams yet. Click &apos;Add Team&apos; to create one.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {teams.map((team) => (
                                    <div key={team.id} className="group bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-200">
                                        <div className="relative h-36 flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.primary_color} 0%, ${theme.secondary_color} 100%)` }}>
                                            {team.logo_url ? (
                                                <div className="absolute inset-0 w-full h-full bg-white/10 backdrop-blur-sm flex items-center justify-center p-4">
                                                    <img
                                                        src={team.logo_url}
                                                        alt={team.name}
                                                        className="max-w-full max-h-full object-contain drop-shadow-lg"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            const fallback = document.createElement('span');
                                                            fallback.className = 'text-white font-black text-3xl tracking-tight select-none opacity-90';
                                                            fallback.textContent = team.short_name || team.name?.slice(0, 2).toUpperCase();
                                                            e.target.parentElement.appendChild(fallback);
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-white font-black text-3xl tracking-tight select-none opacity-90">
                                                    {team.short_name || team.name?.slice(0, 2).toUpperCase()}
                                                </span>
                                            )}
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                {canEditTeam && (
                                                    <button onClick={(e) => { e.stopPropagation(); openTeamModal(team); }} className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all">
                                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                )}
                                                {canDeleteTeam && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id, team.name); }} className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/60 transition-all">
                                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="text-sm font-bold text-gray-950 truncate">{team.name}</p>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] mt-0.5">{team.short_name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {}
                {activeTab === "Person" && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button
                                onClick={canAddPlayer ? () => openPlayerModal() : undefined}
                                disabled={!canAddPlayer}
                                title={!canAddPlayer ? "You don't have permission to add players" : undefined}
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                            >
                                Add Player
                            </Button>
                        </div>
                        {playersLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                                        <div className="h-40 bg-gray-100" />
                                        <div className="px-4 py-3 space-y-2">
                                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                                            <div className="h-2 bg-gray-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : players.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                <p className="text-sm font-semibold">No players yet. Click &apos;Add Player&apos; to register one.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {players.map((player) => {
                                    const initials = player.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";
                                    const bgColor = ROLE_COLORS[player.role] || "#1e3a5f";
                                    return (
                                        <div key={player.id} className="group bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-200">
                                            <div className="relative h-40 flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}99 100%)` }}>
                                                {player.image ? (
                                                    <div className="absolute inset-0 w-full h-full">
                                                        <img
                                                            src={player.image}
                                                            alt={player.full_name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                const fallback = document.createElement('div');
                                                                fallback.className = 'h-16 w-16 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center';
                                                                fallback.innerHTML = `<span class="text-white font-black text-xl">${initials}</span>`;
                                                                e.target.parentElement.appendChild(fallback);
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-16 w-16 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center">
                                                        <span className="text-white font-black text-xl">{initials}</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    {canEditPlayer && (
                                                        <button onClick={(e) => { e.stopPropagation(); openPlayerModal(player); }} className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all">
                                                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </button>
                                                    )}
                                                    {canDeletePlayer && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeletePlayer(player.id, player.full_name); }} className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/60 transition-all">
                                                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="px-4 py-3">
                                                <p className="text-sm font-bold text-gray-950 truncate">{player.full_name}</p>
                                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] mt-0.5">{player.role}</p>
                                                {player.external_id && <p className="text-[10px] text-gray-300 mt-1 font-medium">ID: {player.external_id}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                        }
                    </div >
                )
                }

                {}
                {
                    activeTab === "Sponsorships" && (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <Button onClick={() => openSponsorModal()} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}>Add Sponsor</Button>
                            </div>

                            {sponsorshipsLoading ? (
                                <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 space-y-3">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <DataTable
                                        columns={[
                                            {
                                                header: "#",
                                                accessor: "index",
                                                render: (row) => <span className="text-xs font-black text-gray-300">{row.index}</span>
                                            },
                                            {
                                                header: "Brand",
                                                accessor: "brand_name",
                                                render: (row) => (
                                                    <div className="flex items-center gap-3">

                                                        <span className="text-sm font-bold text-gray-950">{row.brand_name}</span>
                                                    </div>
                                                )
                                            },
                                            {
                                                header: "Type",
                                                accessor: "sponsor_type",
                                                render: (row) => <SponsorTypeBadge type={row.sponsor_type} theme={theme} />
                                            },
                                            {
                                                header: "Contract Value",
                                                accessor: "contract_value",
                                                align: "right",
                                                render: (row) => (
                                                    <span className="text-sm font-bold text-gray-950">
                                                        ₹{Number(row.contract_value).toLocaleString("en-IN")}
                                                    </span>
                                                )
                                            },
                                            {
                                                header: "Actions",
                                                accessor: "actions",
                                                align: "center",
                                                render: (row) => (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => openSponsorModal(row.original)} className="h-8 px-3 rounded-xl bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-widest hover:bg-gray-100 hover:text-gray-950 transition-all">Edit</button>
                                                        <button onClick={() => handleDeleteSponsor(row.original.id, row.original.brand_name)} className="h-8 w-8 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                )
                                            }
                                        ]}
                                        data={sponsorships.map((s, idx) => ({ ...s, index: idx + 1, original: s }))}
                                        emptyMessage="No sponsors yet. Click 'Add Sponsor' to add one."
                                        itemsPerPage={10}
                                    />

                                    {}
                                    {sponsorships.length > 0 && (
                                        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-6 py-3 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Contract Value</span>
                                            <span className="text-sm font-black text-gray-950">
                                                ₹{sponsorships.reduce((sum, s) => sum + Number(s.contract_value || 0), 0).toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )
                }

                {}
                {
                    activeTab === "Metrics" && (
                        <div className="space-y-6">
                            {!metricTree ? (
                                <div className="flex items-center justify-center py-24">
                                    <div className="flex flex-col items-center gap-3 text-gray-300">
                                        <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <span className="text-xs font-bold uppercase tracking-widest">Loading Metrics...</span>
                                    </div>
                                </div>
                            ) : !Array.isArray(metricTree) || metricTree.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                    <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                    <p className="text-sm font-semibold text-gray-950 mb-1">No Metrics Available</p>
                                    <p className="text-xs text-gray-400">No metric definitions have been configured for this sport yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {}
                                    <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm overflow-x-auto">
                                        {metricTree.map((category, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveMetricCategory(idx)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 whitespace-nowrap ${activeMetricCategory === idx ? "text-white shadow-md" : "text-gray-400 hover:text-gray-950"
                                                    }`}
                                                style={activeMetricCategory === idx ? { backgroundColor: theme.primary_color } : {}}
                                            >
                                                {category.name}
                                            </button>
                                        ))}
                                    </div>

                                    {}
                                    <div className="bg-white rounded-2xl border border-gray-100/50 shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-gray-100">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Metric</th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Match</th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Player</th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Value</th>
                                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {metricTree[activeMetricCategory]?.metric_definitions?.map((definition) => {
                                                        const rowData = metricRowData[definition.id] || {};
                                                        return (
                                                            <tr key={definition.id} className="hover:bg-gray-50/50 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <span className="text-sm font-semibold text-gray-950">{definition.label}</span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <select
                                                                        value={rowData.match_id || ""}
                                                                        onChange={(e) => updateMetricRowData(definition.id, "match_id", e.target.value)}
                                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all"
                                                                    >
                                                                        <option value="">Select match</option>
                                                                        {matches.map(match => {
                                                                            const t1 = match.team1 || teams.find(t => t.id === match.team1_id);
                                                                            const t2 = match.team2 || teams.find(t => t.id === match.team2_id);
                                                                            const t1Name = (typeof t1 === "object" ? t1?.name : t1) || `Team ${match.team1_id}`;
                                                                            const t2Name = (typeof t2 === "object" ? t2?.name : t2) || `Team ${match.team2_id}`;
                                                                            return (
                                                                                <option key={match.id} value={match.id}>
                                                                                    #{match.match_no} - {t1Name} vs {t2Name}
                                                                                </option>
                                                                            );
                                                                        })}
                                                                    </select>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <select
                                                                        value={rowData.person_id || ""}
                                                                        onChange={(e) => updateMetricRowData(definition.id, "person_id", e.target.value)}
                                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all"
                                                                    >
                                                                        <option value="">Select player</option>
                                                                        {players.map(player => (
                                                                            <option key={player.id} value={player.id}>
                                                                                {player.full_name} {player.role && player.role !== "PLAYER" ? `(${player.role})` : ""}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {definition.data_type === "boolean" ? (
                                                                        <select
                                                                            value={rowData.value || ""}
                                                                            onChange={(e) => updateMetricRowData(definition.id, "value", e.target.value)}
                                                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all"
                                                                        >
                                                                            <option value="">Select</option>
                                                                            <option value="true">Yes</option>
                                                                            <option value="false">No</option>
                                                                        </select>
                                                                    ) : (
                                                                        <input
                                                                            type={definition.data_type === "integer" || definition.data_type === "float" ? "number" : "text"}
                                                                            step={definition.data_type === "float" ? "0.01" : definition.data_type === "integer" ? "1" : undefined}
                                                                            placeholder="Enter value"
                                                                            value={rowData.value || ""}
                                                                            onChange={(e) => updateMetricRowData(definition.id, "value", e.target.value)}
                                                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all"
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button
                                                                        onClick={() => handleSubmitMetricRow(definition.id)}
                                                                        disabled={!canEditMetricField()}
                                                                        className="px-4 py-2 rounded-lg text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
                                                                        style={{ backgroundColor: theme.primary_color }}
                                                                    >
                                                                        Submit
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }

                {}
                {
                    activeTab === "Edit Details" && edition && (
                        <EditDetailsForm edition={edition} id={id} theme={theme} onSaved={fetchEdition} />
                    )
                }

                {}
                {
                    activeTab === "Stats" && (
                        <div className="space-y-4">

                            {statsLoading ? (
                                <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 space-y-3">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <ServerPaginatedTable
                                    columns={[
                                        {
                                            header: "#",
                                            accessor: "index",
                                            render: (row) => <span className="text-xs font-black text-gray-300">{row.index}</span>
                                        },
                                        {
                                            header: "Match",
                                            accessor: "match",
                                            render: (row) => {
                                                const match = matches.find(m => m.id === row.match_id);
                                                if (!match) return <span className="text-sm text-gray-500">—</span>;
                                                const t1 = match.team1 || teams.find(t => t.id === match.team1_id);
                                                const t2 = match.team2 || teams.find(t => t.id === match.team2_id);
                                                const t1Name = (typeof t1 === "object" ? t1?.name : t1) || `Team ${match.team1_id}`;
                                                const t2Name = (typeof t2 === "object" ? t2?.name : t2) || `Team ${match.team2_id}`;
                                                return (
                                                    <span className="text-sm font-semibold text-gray-950">
                                                        #{match.match_no} - {t1Name} vs {t2Name}
                                                    </span>
                                                );
                                            }
                                        },
                                        {
                                            header: "Player",
                                            accessor: "person",
                                            render: (row) => {
                                                const player = players.find(p => p.id === row.person_id);
                                                return (
                                                    <span className="text-sm font-semibold text-gray-950">
                                                        {player?.full_name || `Player ${row.person_id}`}
                                                    </span>
                                                );
                                            }
                                        },
                                        {
                                            header: "Metric",
                                            accessor: "metric_definition",
                                            render: (row) => {
                                                let metricName = "—";
                                                if (metricTree && Array.isArray(metricTree)) {
                                                    metricTree.forEach(category => {
                                                        if (Array.isArray(category.metric_definitions)) {
                                                            const def = category.metric_definitions.find(d => d.id === row.metric_definition_id);
                                                            if (def) metricName = def.label;
                                                        }
                                                    });
                                                }
                                                return <span className="text-sm text-gray-700">{metricName}</span>;
                                            }
                                        },
                                        {
                                            header: "Value",
                                            accessor: "value_text",
                                            render: (row) => (
                                                <span className="text-sm font-bold text-gray-950">{row.value_text}</span>
                                            )
                                        },
                                        {
                                            header: "Date",
                                            accessor: "recorded_date",
                                            render: (row) => (
                                                <span className="text-xs text-gray-500">
                                                    {row.recorded_date ? new Date(row.recorded_date).toLocaleDateString("en-IN") : "—"}
                                                </span>
                                            )
                                        },
                                        {
                                            header: "Status",
                                            accessor: "is_approved",
                                            align: "center",
                                            render: (row) => (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${row.is_approved ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                                                    {row.is_approved ? "Approved" : "Pending"}
                                                </span>
                                            )
                                        },
                                        {
                                            header: "Actions",
                                            accessor: "actions",
                                            align: "center",
                                            render: (row) => (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditMetricValueModal(row)}
                                                        className="h-8 px-3 rounded-xl bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-widest hover:bg-gray-100 hover:text-gray-950 transition-all"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(row.id)}
                                                        className="h-8 w-8 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )
                                        }
                                    ]}
                                    data={metricValues.map((mv, idx) => ({ ...mv, index: (statsPage - 1) * 10 + idx + 1 }))}
                                    currentPage={statsPage}
                                    totalPages={statsTotalPages}
                                    onPageChange={setStatsPage}
                                    emptyMessage="No metric values found."
                                />
                            )}
                        </div>
                    )
                }

                {}
                {
                    activeTab === "Requests" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Change Requests</p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setRequestsStatusFilter("approved,rejected")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${requestsStatusFilter === "approved,rejected" ? "text-white" : "text-gray-400 bg-white border border-gray-100 hover:text-gray-950"}`}
                                        style={requestsStatusFilter === "approved,rejected" ? { backgroundColor: theme.primary_color } : {}}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setRequestsStatusFilter("approved")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${requestsStatusFilter === "approved" ? "text-white bg-emerald-500" : "text-gray-400 bg-white border border-gray-100 hover:text-gray-950"}`}
                                    >
                                        Approved
                                    </button>
                                    <button
                                        onClick={() => setRequestsStatusFilter("rejected")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${requestsStatusFilter === "rejected" ? "text-white bg-red-500" : "text-gray-400 bg-white border border-gray-100 hover:text-gray-950"}`}
                                    >
                                        Rejected
                                    </button>
                                </div>
                            </div>

                            {requestsLoading ? (
                                <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 space-y-3">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <DataTable
                                    columns={[
                                        {
                                            header: "#",
                                            accessor: "index",
                                            render: (row) => <span className="text-xs font-black text-gray-300">{row.index}</span>
                                        },
                                        {
                                            header: "Type",
                                            accessor: "type",
                                            render: (row) => (
                                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${row.type === "new_entry"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-purple-100 text-purple-700"
                                                    }`}>
                                                    {row.type === "new_entry" ? "New Entry" : "Correction"}
                                                </span>
                                            )
                                        },
                                        {
                                            header: "Metric",
                                            accessor: "metric",
                                            render: (row) => (
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-700">
                                                        {row.metric_value?.metric_definition?.label || "—"}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        Edition: {row.metric_value?.edition?.name || "—"}
                                                    </span>
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Value",
                                            accessor: "value",
                                            render: (row) => (
                                                <div className="flex items-center gap-2">
                                                    {row.original_value && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Original</span>
                                                            <div className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg">
                                                                <span className="text-sm font-bold text-red-600">{row.original_value}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {row.original_value && (
                                                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                        </svg>
                                                    )}
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                            {row.original_value ? "Changed" : "New"}
                                                        </span>
                                                        <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                            <span className="text-sm font-bold text-emerald-600">{row.proposed_value}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Match",
                                            accessor: "match",
                                            render: (row) => {
                                                const match = row.metric_value?.match;
                                                if (!match) return <span className="text-xs text-gray-400">—</span>;
                                                return (
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-700">
                                                            Match #{match.match_no || "—"}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">
                                                            Round: {match.round || "—"}
                                                        </span>
                                                        <span className="text-[10px] text-gray-600 font-medium">
                                                            {match.team1?.name || "Team 1"} vs {match.team2?.name || "Team 2"}
                                                        </span>
                                                    </div>
                                                );
                                            }
                                        },
                                        {
                                            header: "Player",
                                            accessor: "player",
                                            render: (row) => (
                                                <span className="text-xs font-medium text-gray-600">
                                                    {row.metric_value?.person?.full_name || "—"}
                                                </span>
                                            )
                                        },
                                        {
                                            header: "Submitted",
                                            accessor: "submitted_at",
                                            render: (row) => (
                                                <span className="text-xs text-gray-500 font-medium">
                                                    {formatDate(row.submitted_at)}
                                                </span>
                                            )
                                        },
                                        {
                                            header: "Status",
                                            accessor: "status",
                                            align: "center",
                                            render: (row) => getStatusBadge(row.status)
                                        }
                                    ]}
                                    data={userRequests.map((request, idx) => ({ ...request, index: idx + 1 }))}
                                    emptyMessage={`No ${requestsStatusFilter.replace(",", " or ")} requests found.`}
                                    itemsPerPage={10}
                                />
                            )}
                        </div>
                    )
                }
            </div >

            {}
            {
                mounted && isEditingMetricValue && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 z-[9999] md:z-30 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                        <div ref={editMetricValueModalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-950 uppercase tracking-tight">Edit Metric Value</h3>
                                    <p className="text-xs text-gray-400 font-bold mt-1 tracking-widest uppercase">Update Value</p>
                                </div>
                                <button onClick={closeEditMetricValueModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleUpdateMetricValue} className="p-6 space-y-4">
                                <Input
                                    label="Value"
                                    placeholder="Enter value"
                                    required
                                    value={editMetricValueForm.value_text}
                                    onChange={(e) => setEditMetricValueForm({ value_text: e.target.value })}
                                />
                                <Button type="submit" className="w-full">
                                    UPDATE VALUE
                                </Button>
                            </form>
                        </div>
                    </div>, document.body
                )
            }

            {}
            {
                mounted && isDeleteModalOpen && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 z-[9999] md:z-30 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                        <div ref={deleteModalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-red-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-950 uppercase tracking-tight">Delete Metric Value</h3>
                                        <p className="text-xs text-gray-400 font-bold mt-1 tracking-widest uppercase">Confirm Deletion</p>
                                    </div>
                                </div>
                                <button onClick={closeDeleteModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Are you sure you want to delete this metric value? This action cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={closeDeleteModal}
                                        className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold uppercase tracking-widest hover:bg-gray-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleDeleteMetricValue(deletingMetricValueId)}
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg hover:shadow-xl"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>, document.body
                )
            }
            {
                mounted && isMatchModalOpen && typeof window !== "undefined" && document?.body && createPortal(
                    <div className="fixed inset-0 z-[9999] md:z-30 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                        <div ref={modalRef} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20 sticky top-0 bg-white">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-950 uppercase tracking-tight">{editingMatchId ? "Edit Match" : "Add Match"}</h3>
                                    <p className="text-xs text-gray-400 font-bold mt-1 tracking-widest uppercase">Match Details</p>
                                </div>
                                <button onClick={closeMatchModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleSaveMatch} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Match No" type="number" placeholder="1" required value={matchForm.match_no} onChange={(e) => setMatchForm({ ...matchForm, match_no: e.target.value })} />
                                    <Input label="Round" placeholder="Group Stage" required value={matchForm.round} onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Team 1</label>
                                        <select required value={matchForm.team1_id} onChange={(e) => setMatchForm({ ...matchForm, team1_id: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all">
                                            <option value="">Select team</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Team 2</label>
                                        <select required value={matchForm.team2_id} onChange={(e) => setMatchForm({ ...matchForm, team2_id: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all">
                                            <option value="">Select team</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <Input label="Venue" placeholder="Stadium A" value={matchForm.venue} onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })} />
                                <Input label="Scheduled At" type="datetime-local" value={matchForm.scheduled_at} onChange={(e) => setMatchForm({ ...matchForm, scheduled_at: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Actual Start" type="datetime-local" value={matchForm.actual_start_time} onChange={(e) => setMatchForm({ ...matchForm, actual_start_time: e.target.value })} />
                                    <Input label="Actual End" type="datetime-local" value={matchForm.actual_end_time} onChange={(e) => setMatchForm({ ...matchForm, actual_end_time: e.target.value })} />
                                </div>
                                <Button type="submit" disabled={isSaving} className="w-full">
                                    {isSaving ? "SAVING..." : editingMatchId ? "SAVE CHANGES" : "CREATE MATCH"}
                                </Button>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            }

            {}
            {
                mounted && isPlayerModalOpen && typeof window !== "undefined" && createPortal(
                    <div className="fixed inset-0 z-[9999] md:z-30 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                        <div ref={playerModalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-950 uppercase tracking-tight">{editingPlayerId ? "Edit Person" : "Add Person"}</h3>
                                    <p className="text-xs text-gray-400 font-bold mt-1 tracking-widest uppercase">Person Details</p>
                                </div>
                                <button onClick={closePlayerModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleSavePlayer} className="p-6 space-y-4">
                                <Input label="Full Name" placeholder="e.g. Virat Kohli" required value={playerForm.full_name} onChange={(e) => setPlayerForm({ ...playerForm, full_name: e.target.value })} />

                                {}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Player Image</label>
                                    <div
                                        onClick={() => playerImageRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center bg-gray-50/30 hover:bg-white hover:border-gray-200 transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <input
                                            type="file"
                                            ref={playerImageRef}
                                            onChange={handlePlayerImageChange}
                                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/gif,image/webp"
                                            className="hidden"
                                        />
                                        {playerForm.imagePreview ? (
                                            <img src={playerForm.imagePreview} alt="Player Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <div className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-300 mb-2 group-hover:text-gray-950 group-hover:scale-110 transition-all shadow-sm">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Upload Image</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Role</label>
                                        <select required value={playerForm.role} onChange={(e) => setPlayerForm({ ...playerForm, role: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all">
                                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Team</label>
                                        <select value={playerForm.team_id} onChange={(e) => setPlayerForm({ ...playerForm, team_id: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all">
                                            <option value="">No Team</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <Input label="External ID" placeholder="e.g. P001 (optional)" value={playerForm.external_id} onChange={(e) => setPlayerForm({ ...playerForm, external_id: e.target.value })} />
                                <div className="flex flex-col space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Source</label>
                                    <select value={playerForm.source} onChange={(e) => setPlayerForm({ ...playerForm, source: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all">
                                        <option value="KADAMBA">KADAMBA</option>
                                        <option value="SISPORT">SISPORT</option>
                                        <option value="VOTKBD">VOTKBD</option>
                                        <option value="STARSELEV8">STARSELEV8</option>
                                        <option value="YKS">YKS</option>
                                    </select>
                                </div>
                                <Button type="submit" disabled={isSavingPlayer} className="w-full">
                                    {isSavingPlayer ? "SAVING..." : editingPlayerId ? "SAVE CHANGES" : "REGISTER PLAYER"}
                                </Button>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            }

            {}
            {
                mounted && isSponsorModalOpen && typeof window !== "undefined" && createPortal(
                    <div className="fixed inset-0 z-[9999] md:z-30 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                        <div ref={sponsorModalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-950 uppercase tracking-tight">{editingSponsorId ? "Edit Sponsor" : "Add Sponsor"}</h3>
                                    <p className="text-xs text-gray-400 font-bold mt-1 tracking-widest uppercase">Sponsorship Details</p>
                                </div>
                                <button onClick={closeSponsorModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleSaveSponsor} className="p-6 space-y-4">
                                <Input label="Brand Name" placeholder="e.g. Nike" required value={sponsorForm.brand_name} onChange={(e) => setSponsorForm({ ...sponsorForm, brand_name: e.target.value })} />
                                <div className="flex flex-col space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Sponsor Type</label>
                                    <select required value={sponsorForm.sponsor_type} onChange={(e) => setSponsorForm({ ...sponsorForm, sponsor_type: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all">
                                        <option value="TITLE">TITLE</option>
                                        <option value="CO-SPONSOR">CO-SPONSOR</option>
                                        <option value="ASSOCIATE">ASSOCIATE</option>
                                        <option value="POWERED BY">POWERED BY</option>
                                        <option value="OFFICIAL PARTNER">OFFICIAL PARTNER</option>
                                    </select>
                                </div>
                                <Input label="Contract Value (₹)" type="number" placeholder="e.g. 50000" required value={sponsorForm.contract_value} onChange={(e) => setSponsorForm({ ...sponsorForm, contract_value: e.target.value })} />
                                <Button type="submit" disabled={isSavingSponsor} className="w-full">
                                    {isSavingSponsor ? "SAVING..." : editingSponsorId ? "SAVE CHANGES" : "ADD SPONSOR"}
                                </Button>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            }

            {}
            {
                mounted && isTeamModalOpen && typeof window !== "undefined" && document?.body && createPortal(
                    <div className="fixed inset-0 z-[9999] md:z-30 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                        <div ref={teamModalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-950 uppercase tracking-tight">{editingTeamId ? "Edit Team" : "Add Team"}</h3>
                                    <p className="text-xs text-gray-400 font-bold mt-1 tracking-widest uppercase">Team Details</p>
                                </div>
                                <button onClick={closeTeamModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleSaveTeam} className="p-6 space-y-4">
                                <Input label="Team Name" placeholder="e.g. Mumbai Indians" required value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} />
                                <Input label="Short Name" placeholder="e.g. MI" required value={teamForm.short_name} onChange={(e) => setTeamForm({ ...teamForm, short_name: e.target.value })} />

                                {}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Team Logo</label>
                                    <div
                                        onClick={() => teamLogoRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center bg-gray-50/30 hover:bg-white hover:border-gray-200 transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <input
                                            type="file"
                                            ref={teamLogoRef}
                                            onChange={handleTeamLogoChange}
                                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/gif,image/webp"
                                            className="hidden"
                                        />
                                        {teamForm.logoPreview ? (
                                            <img src={teamForm.logoPreview} alt="Team Logo Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <div className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-300 mb-2 group-hover:text-gray-950 group-hover:scale-110 transition-all shadow-sm">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Upload Logo</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <Button type="submit" disabled={isSavingTeam} className="w-full">
                                    {isSavingTeam ? "SAVING..." : editingTeamId ? "SAVE CHANGES" : "CREATE TEAM"}
                                </Button>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            }
        </div >
    );
}

function SponsorTypeBadge({ type, theme }) {
    const styles = {
        "TITLE": { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-400" },
        "CO-SPONSOR": { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400" },
        "ASSOCIATE": { bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-400" },
        "POWERED BY": { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
        "OFFICIAL PARTNER": { bg: "bg-rose-50", text: "text-rose-600", dot: "bg-rose-400" },
    };
    const s = styles[type] || { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-300" };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${s.bg} ${s.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {type}
        </span>
    );
}

function EditDetailsForm({ edition, id, theme, onSaved }) {
    const fileRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: edition.name || "",
        start_date: edition.start_date?.slice(0, 10) || "",
        end_date: edition.end_date?.slice(0, 10) || "",
        status: edition.status || "upcoming",
        logo: null,
        logoPreview: edition.logo || null,
    });

    const handleLogoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log("📸 Edition Logo Upload Started:", {
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(2)} KB`,
            fileType: file.type
        });

        const preview = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, logo: file, logoPreview: preview }));

        toast.loading("Uploading logo to GCP...", { id: "edition-logo-upload" });
        const uploadResult = await uploadImageToGCP(file, "editions");

        if (uploadResult.success) {
            console.log("✅ Edition logo uploaded! GCP URL:", uploadResult.url);
            toast.success("Logo uploaded successfully!", { id: "edition-logo-upload" });

            setFormData(prev => ({ ...prev, logoPreview: uploadResult.url }));
        } else {
            console.error("❌ Edition logo upload failed:", uploadResult.error);
            toast.error(uploadResult.error || "Failed to upload logo", { id: "edition-logo-upload" });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const activeIp = secureStorage.getItem("active_ip");
        const payload = {
            id,
            property_id: activeIp?.id,
            name: formData.name,
            status: formData.status,
            start_date: formData.start_date,
            end_date: formData.end_date,
            logo: formData.logoPreview || "",
        };
        const result = await apiClient.post(process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT, payload);
        if (result.success) {
            toast.success("Edition updated successfully!", {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            onSaved?.();
        } else {
            toast.error(result.error || "Failed to update edition.");
        }
        setIsSaving(false);
    };

    return (
        <div className="w-full max-w-3xl">
            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100/50 shadow-sm p-8 space-y-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Edit Edition</p>
                <div className="grid grid-cols-2 gap-6">
                    <Input label="Edition Name" placeholder="e.g. Edition 1" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    <div className="flex flex-col space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Status</label>
                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all capitalize">
                            {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                    </div>
                    <Input label="Start Date" type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                    <Input label="End Date" type="date" required value={formData.end_date} min={formData.start_date || undefined} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Edition Logo</label>
                    <div onClick={() => fileRef.current.click()} className="w-full h-32 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center bg-gray-50/30 hover:bg-white hover:border-gray-200 transition-all cursor-pointer group relative overflow-hidden">
                        <input type="file" ref={fileRef} onChange={handleLogoChange} accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/gif,image/webp" className="hidden" />
                        {formData.logoPreview
                            ? <img src={formData.logoPreview} alt="Preview" className="w-full h-full object-cover" />
                            : <>
                                <div className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-300 mb-2 group-hover:text-gray-950 group-hover:scale-110 transition-all shadow-sm">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                </div>
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Upload Logo</span>
                            </>
                        }
                    </div>
                </div>
                <Button type="submit" disabled={isSaving} className="w-full">
                    {isSaving ? "SAVING..." : "SAVE CHANGES"}
                </Button>
            </form>
        </div>
    );
}
``
