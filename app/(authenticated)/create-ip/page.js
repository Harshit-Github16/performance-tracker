"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { DataTable, Button, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import apiClient from "@/lib/apiClient";
import { initialTheme } from "@/config/theme";

const SkeletonRow = () => (
  <tr className="border-b border-gray-50">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-gray-100 rounded-lg animate-pulse" style={{ width: `${[60, 40, 50, 30, 35, 30][i - 1]}%` }}></div>
      </td>
    ))}
  </tr>
);

export default function CreateIPPage() {
  const { theme, updateTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [tableLoading, setTableLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "", sport_id: 1, code: "",
    primary_color: theme.primary_color || "#000000",
    secondary_color: theme.secondary_color || "#f4f4f5",
    logo: null, logoPreview: null, adminName: "", adminemail: "",
  });

  const [ips, setIps] = useState([]);
  const [sports, setSports] = useState([]);
  const [ipOwners, setIpOwners] = useState([]); // owners of the IP being edited
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name } of IP to delete
  const deleteModalRef = useRef(null);

  const pageRef = useRef(null);
  const headerRef = useRef(null);
  const tableRef = useRef(null);
  const fileInputRef = useRef(null);

  // Role-based access control
  useEffect(() => {
    if (user && user.role !== "super_admin") router.push("/dashboard");
  }, [user, router]);

  // GSAP entrance + fetch IPs from API
  useEffect(() => {
    gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
    gsap.fromTo(tableRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.15 });

    fetchIPs();
    fetchSports();
  }, []);

  const fetchSports = async () => {
    const result = await apiClient.get(process.env.NEXT_PUBLIC_SPORTS_ENDPOINT);
    if (result.success) {
      const arr = Array.isArray(result.data?.data?.data)
        ? result.data.data?.data
        : Array.isArray(result.data)
          ? result.data
          : [];
      setSports(arr);

    }
  };

  const fetchIPs = async () => {
    setTableLoading(true);
    const endpoint = process.env.NEXT_PUBLIC_PROPERTIES_ENDPOINT;
    const result = await apiClient.get(endpoint);
    if (result.success) {
      const list = result.data?.data?.properties || [];
      setIps(list);
    } else {
      toast.error(result.error || "Failed to load properties.");
    }
    setTableLoading(false);
  };

  const handleEnterIP = (ip) => {
    localStorage.setItem("active_ip", JSON.stringify(ip));
    localStorage.setItem("entered_as_manager", "true");
    // Apply IP theme
    updateTheme({
      primary_color: ip.primary_color || initialTheme.primary_color,
      secondary_color: ip.secondary_color || initialTheme.secondary_color,
      tournamentName: ip.name,
    });
    toast.success(`Switched to ${ip.name}`, {
      style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' }
    });
    router.push("/dashboard");
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) setFormData({ ...formData, logo: file, logoPreview: URL.createObjectURL(file) });
  };

  const handleNextStep = (e) => { e.preventDefault(); setCurrentStep(2); };
  const handlePrevStep = () => setCurrentStep(1);

  const handleSaveIP = async (e) => {
    e.preventDefault();

    // Same endpoint for both create & update
    // Update me sirf id extra field jaati hai payload mein
    const payload = {
      ...(editingId && { id: editingId }),
      name: formData.name,
      sport_id: formData.sport_id,
      code: formData.code,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      logo: formData.logoPreview || formData.logo || "",
      full_name: formData.adminName,
      email: formData.adminemail,
      ...(editingId && ipOwners.length > 0 && { user_id: ipOwners[0].id }),
    };

    const endpoint = process.env.NEXT_PUBLIC_PROPERTIES_ENDPOINT;
    const result = await apiClient.post(endpoint, payload);

    if (result.success) {
      toast.success(`${formData.name} ${editingId ? "updated" : "created"} successfully!`, {
        style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' }
      });
      await fetchIPs();
      setIsModalOpen(false);
      resetForm();
    } else {
      toast.error(result.error || `Failed to ${editingId ? "update" : "create"} property.`);
    }
  };

  const handleEditIP = (ip) => {
    setEditingId(ip.id);
    const owners = ip.ipOwners || [];
    setIpOwners(owners);
    // Pre-fill with first owner if only one, else leave blank for user to pick
    const firstOwner = owners.length === 1 ? owners[0] : null;
    setFormData({
      name: ip.name,
      sport_id: ip.sport_id || 1,
      code: ip.code,
      primary_color: ip.primary_color || "#000000",
      secondary_color: ip.secondary_color || "#f4f4f5",
      logo: null,
      logoPreview: ip.logo || null,
      adminName: firstOwner?.full_name || "",
      adminemail: firstOwner?.email || "",
    });
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  const handleDeleteIP = (id, name) => {
    setDeleteConfirm({ id, name });
    requestAnimationFrame(() => {
      if (deleteModalRef.current)
        gsap.fromTo(deleteModalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: "power3.out" });
    });
  };

  const confirmDelete = async () => {
    const { id, name } = deleteConfirm;
    const endpoint = process.env.NEXT_PUBLIC_PROPERTIES_ENDPOINT;
    const result = await apiClient.delete(`${endpoint}/${id}`);
    if (result.success) {
      setIps(ips.filter(ip => ip.id !== id));
      toast.success(`${name} deleted!`, {
        style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' }
      });
    } else {
      toast.error(result.error || "Failed to delete property.");
    }
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setIpOwners([]);
    setFormData({
      name: "", sport_id: 1, code: "",
      primary_color: theme.primary_color || "#000000",
      secondary_color: theme.secondary_color || "#f4f4f5",
      logo: null, logoPreview: null, adminName: "", adminemail: "",
    });
    setCurrentStep(1);
  };

  const columns = [
    {
      header: "IP Name",
      render: (ip) => (
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-gray-50 flex items-center justify-center p-2 border border-gray-100/50 overflow-hidden">
            {ip.logo
              ? <img src={ip.logo} alt="Logo" className="w-full h-full object-contain" />
              : <span className="text-[10px] font-semibold text-gray-300 italic uppercase">Logo</span>}
          </div>
          <span className="text-sm font-semibold text-gray-950 tracking-tight">{ip.name}</span>
        </div>
      )
    },
    {
      header: "Sport Type",
      render: (ip) => (
        <span className="inline-flex items-center bg-gray-50 text-gray-500 px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-widest leading-none border border-gray-100/30">
          {ip.sport?.name || "—"}
        </span>
      )
    },
    {
      header: "Identifier",
      render: (ip) => (
        <code className="text-xs font-semibold text-gray-400 tracking-widest uppercase">{ip.code}</code>
      )
    },
    {
      header: "Brand Colors",
      render: (ip) => (
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 rounded-md border border-gray-100 shadow-sm"
            style={{ backgroundColor: ip.primary_color || "#e5e7eb" }}
            title={ip.primary_color || "N/A"}
          />
          <div
            className="h-6 w-6 rounded-md border border-gray-100 shadow-sm"
            style={{ backgroundColor: ip.secondary_color || "#e5e7eb" }}
            title={ip.secondary_color || "N/A"}
          />
        </div>
      )
    },
    {
      header: "Status",
      align: "center",
      render: () => (
        <span className="inline-flex items-center gap-1.5 bg-[#f0fdf4] text-[#166534] px-2.5 py-1 rounded-lg border border-[#bbf7d0]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ animationDuration: '3s' }}></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] leading-none mt-[1px]">Active</span>
        </span>
      )
    },
    {
      header: "Actions",
      align: "right",
      render: (ip) => (
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => handleEnterIP(ip)}
            className="h-9 w-9 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-950 hover:text-white transition-all shadow-sm"
            title="Enter as Manager"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <button
            onClick={() => handleEditIP(ip)}
            className="h-9 w-9 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-200 hover:text-gray-950 transition-all shadow-sm"
            title="Edit IP"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button
            onClick={() => handleDeleteIP(ip.id, ip.name)}
            className="h-9 w-9 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
            title="Delete IP"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      )
    }
  ];

  return (
    <div ref={pageRef} className="space-y-6">
      {/* Header */}
      <div ref={headerRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primary_color }}></div>
            <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">Management</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">Tournament IPs</h1>
          <p className="text-[14px] text-gray-400 font-normal tracking-wide">Manage and deploy sports property instances across the platform.</p>
        </div>
        <Button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
        >
          Create IP
        </Button>
      </div>

      {/* Table with skeleton loader */}
      <div ref={tableRef}>
        {tableLoading ? (
          <div className="w-full bg-white rounded-2xl border border-gray-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.02)] overflow-hidden">
            {/* Fake search bar */}
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="h-10 w-64 bg-gray-100 rounded-xl animate-pulse"></div>
              <div className="h-4 w-40 bg-gray-100 rounded-lg animate-pulse"></div>
            </div>
            {/* Fake header */}
            <div className="border-b border-gray-50 px-6 py-2 flex gap-6">
              {["IP Name", "Sport Type", "Identifier", "Brand Colors", "Status", "Actions"].map((h) => (
                <div key={h} className="h-3 bg-gray-100 rounded animate-pulse flex-1"></div>
              ))}
            </div>
            {/* Skeleton rows - same count as itemsPerPage */}
            <table className="w-full">
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={ips}
            emptyMessage="No tournament IPs available. Click 'Create IP' to start."
          />
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100/50">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
              <div>
                <h3 className="text-xl font-semibold text-gray-950 uppercase tracking-tight">
                  {editingId ? "Edit IP Details" : (currentStep === 1 ? "Create IP" : "Administrator Setup")}
                </h3>
                <p className="text-xs text-gray-400 font-bold mt-1.5 tracking-widest uppercase">
                  {editingId ? `Modifying ${formData.name}` : (currentStep === 1 ? "Property Setup Initialization" : "Assigned Manager Credentials")}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 hover:border-gray-200 transition-all active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="relative">
              {currentStep === 1 ? (
                <form onSubmit={handleNextStep} className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-8">
                    <Input label="IP Name" placeholder="e.g. PKL" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    <div className="flex flex-col space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Sport Type</label>
                      <select value={formData.sport_id} onChange={(e) => setFormData({ ...formData, sport_id: Number(e.target.value) })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950">
                        {sports.length > 0
                          ? sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                          : <option disabled>Loading...</option>
                        }
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <Input label="IP Identifier" placeholder="CODE_01" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Primary</label>
                        <input type="color" value={formData.primary_color} onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })} className="h-12 w-full rounded-xl cursor-pointer border-none bg-gray-50 focus:ring-0" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Secondary</label>
                        <input type="color" value={formData.secondary_color} onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })} className="h-12 w-full rounded-xl cursor-pointer border-none bg-gray-50 focus:ring-0" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Brand Logo Asset</label>
                    <div onClick={() => fileInputRef.current.click()} className="w-full h-36 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center bg-gray-50/30 hover:bg-white hover:border-gray-200 transition-all cursor-pointer group relative overflow-hidden">
                      <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                      {formData.logoPreview
                        ? <img src={formData.logoPreview} alt="Preview" className="w-full h-full object-contain p-4" />
                        : <>
                          <div className="h-12 w-12 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-300 mb-3 group-hover:text-gray-950 group-hover:scale-110 transition-all duration-300 shadow-sm">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          </div>
                          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Upload Brand Identity</span>
                        </>}
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Continue to Admin Setup</Button>
                </form>
              ) : (
                <form onSubmit={handleSaveIP} className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* If editing and multiple owners exist, show owner selector */}
                  {editingId && ipOwners.length > 1 && (
                    <div className="flex flex-col space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Select Manager</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {ipOwners.map((owner) => (
                          <button
                            key={owner.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, adminName: owner.full_name, adminemail: owner.email }))}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${formData.adminemail === owner.email
                              ? "border-gray-950 bg-gray-950 text-white"
                              : "border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300"
                              }`}
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${formData.adminemail === owner.email ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                              }`}>
                              {owner.full_name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{owner.full_name}</p>
                              <p className={`text-[11px] truncate ${formData.adminemail === owner.email ? "text-white/60" : "text-gray-400"}`}>{owner.email}</p>
                            </div>
                            {formData.adminemail === owner.email && (
                              <svg className="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 px-1">Select a manager to edit their details below</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-8">
                    <Input label="Administrator Name" placeholder="e.g. John Doe" required={!editingId} value={formData.adminName} onChange={(e) => setFormData({ ...formData, adminName: e.target.value })} />
                    <Input label="Manager Email" type="email" placeholder="manager@example.com" required={!editingId} value={formData.adminemail} onChange={(e) => setFormData({ ...formData, adminemail: e.target.value })} />
                  </div>
                  <div className="pt-6 flex gap-4">
                    <Button variant="" onClick={handlePrevStep} className="flex-1 bg-gray-100 !text-gray-950">Back</Button>
                    <Button type="submit" className="flex-[2]">{editingId ? "Save Changes" : "Finalize & Create IP"}</Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
          <div ref={deleteModalRef} className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
            <div className="p-6 flex flex-col items-center text-center">
              {/* Warning icon */}
              <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-950 uppercase tracking-tight mb-1">Delete Property?</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{deleteConfirm.name}</p>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                This action is permanent. All data associated with this property — including editions, teams, players, matches, and sponsorships — will be lost and cannot be recovered.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 h-11 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-widest hover:bg-gray-100 hover:text-gray-950 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 h-11 rounded-xl bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
