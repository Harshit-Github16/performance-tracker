"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import secureStorage from "@/lib/secureStorage";

const ROLE_OPTIONS = ["PLAYER", "OFFICIAL", "COACH", "MANAGER"];

// Helper to resolve cell values regardless of casing and spacing/underscores
function getCellValue(row, fieldVariations) {
  const keys = Object.keys(row);
  for (const field of fieldVariations) {
    const cleanField = field.toLowerCase().replace(/[\s_-]/g, "");
    for (const key of keys) {
      const cleanKey = key.toLowerCase().replace(/[\s_-]/g, "");
      if (cleanKey === cleanField) {
        return row[key];
      }
    }
  }
  return undefined;
}

export default function ExcelImportForm({
  type,
  editionId,
  teams = [],
  roles = [],
  onSuccess,
  onClose,
  theme,
}) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importLogs, setImportLogs] = useState([]);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setImporting(false);
    setProgress(0);
    setImportLogs([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };



  // Handles reading the Excel / CSV file
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) {
          toast.error("The selected file is empty.");
          resetState();
          return;
        }

        processAndValidateRows(rows);
      } catch (err) {
        console.error("Error reading file:", err);
        toast.error("Failed to parse file. Please ensure it's a valid Excel or CSV.");
        resetState();
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  // Normalizes and validates rows parsed from Excel
  const processAndValidateRows = (rows) => {
    const validated = rows.map((row, index) => {
      const rowNum = index + 1;
      const status = { valid: true, errors: [], warnings: [] };
      let mapped = {};

      if (type === "matches") {
        const rawMatchNo = getCellValue(row, ["Match No", "match_no", "match number", "matchno"]);
        const matchNo = rawMatchNo !== undefined ? Number(rawMatchNo) : NaN;
        const round = getCellValue(row, ["Round", "round", "stage", "match_round"]);
        const t1Val = String(getCellValue(row, ["Team 1", "team1", "team_1", "first_team"]) || "").trim();
        const t2Val = String(getCellValue(row, ["Team 2", "team2", "team_2", "second_team"]) || "").trim();
        const schedAt = getCellValue(row, ["Scheduled At", "scheduled_at", "schedule", "date", "datetime"]);
        const venue = String(getCellValue(row, ["Venue", "venue", "stadium", "location"]) || "").trim();
        const actStart = getCellValue(row, ["Actual Start Time", "actual_start_time", "actual start", "start_time"]);
        const actEnd = getCellValue(row, ["Actual End Time", "actual_end_time", "actual end", "end_time"]);

        if (!rawMatchNo || isNaN(matchNo)) {
          status.valid = false;
          status.errors.push("Missing or invalid Match No");
        }
        if (!round) {
          status.valid = false;
          status.errors.push("Missing Round stage description");
        }
        if (!t1Val) {
          status.valid = false;
          status.errors.push("Missing Team 1 name");
        }
        if (!t2Val) {
          status.valid = false;
          status.errors.push("Missing Team 2 name");
        }

        // Map Team 1
        const team1 = teams.find(
          (t) =>
            t.name?.toLowerCase() === t1Val.toLowerCase() ||
            t.short_name?.toLowerCase() === t1Val.toLowerCase()
        );
        if (t1Val && !team1) {
          status.valid = false;
          status.errors.push(`Team 1 '${t1Val}' not found in team list`);
        }

        // Map Team 2
        const team2 = teams.find(
          (t) =>
            t.name?.toLowerCase() === t2Val.toLowerCase() ||
            t.short_name?.toLowerCase() === t2Val.toLowerCase()
        );
        if (t2Val && !team2) {
          status.valid = false;
          status.errors.push(`Team 2 '${t2Val}' not found in team list`);
        }

        if (team1 && team2 && team1.id === team2.id) {
          status.valid = false;
          status.errors.push("Team 1 and Team 2 cannot be the same team");
        }

        mapped = {
          rowNum,
          match_no: matchNo,
          round,
          team1_name: team1 ? team1.name : t1Val,
          team2_name: team2 ? team2.name : t2Val,
          team1_id: team1?.id,
          team2_id: team2?.id,
          scheduled_at: schedAt ? new Date(schedAt).toISOString() : null,
          venue,
          actual_start_time: actStart ? new Date(actStart).toISOString() : null,
          actual_end_time: actEnd ? new Date(actEnd).toISOString() : null,
        };
      } else if (type === "teams") {
        const name = String(getCellValue(row, ["Team Name", "name", "team_name"]) || "").trim();
        const shortName = String(getCellValue(row, ["Short Name", "short_name", "shortname", "code"]) || "").trim();
        const logoUrl = String(getCellValue(row, ["Logo URL", "logo_url", "logo"]) || "").trim();

        if (!name) {
          status.valid = false;
          status.errors.push("Missing Team Name");
        }
        if (!shortName) {
          status.valid = false;
          status.errors.push("Missing Short Name");
        }

        mapped = {
          rowNum,
          name,
          short_name: shortName,
          logo_url: logoUrl,
        };
      } else if (type === "players") {
        const fullName = String(getCellValue(row, ["Full Name", "fullname", "name", "player name"]) || "").trim();
        let role = String(getCellValue(row, ["Role", "role", "type"]) || "").trim().toUpperCase();
        const teamVal = String(getCellValue(row, ["Team", "team name", "team_name"]) || "").trim();
        const externalId = String(getCellValue(row, ["External ID", "external_id", "id"]) || "").trim();
        const source = String(getCellValue(row, ["Source", "source"]) || "manual").trim();
        const image = String(getCellValue(row, ["Image URL", "image", "photo"]) || "").trim();

        if (!fullName) {
          status.valid = false;
          status.errors.push("Missing Person's Full Name");
        }

        if (!role) {
          role = "PLAYER";
          status.warnings.push("Role unspecified, defaulting to PLAYER");
        } else if (!ROLE_OPTIONS.includes(role)) {
          status.warnings.push(`Invalid role '${role}', defaulting to PLAYER`);
          role = "PLAYER";
        }

        let teamId = null;
        if (role !== "OFFICIAL" && teamVal) {
          const matchedTeam = teams.find(
            (t) =>
              t.name?.toLowerCase() === teamVal.toLowerCase() ||
              t.short_name?.toLowerCase() === teamVal.toLowerCase()
          );
          if (matchedTeam) {
            teamId = matchedTeam.id;
          } else {
            status.valid = false;
            status.errors.push(`Team '${teamVal}' not found in team list`);
          }
        } else if (role !== "OFFICIAL" && !teamVal) {
          status.warnings.push("No team specified for non-official member");
        }

        mapped = {
          rowNum,
          full_name: fullName,
          role,
          team_name: teamVal,
          team_id: teamId,
          external_id: externalId,
          source,
          image,
        };
      } else if (type === "users") {
        const fullName = String(getCellValue(row, ["Full Name", "fullname", "name", "user name", "user_name"]) || "").trim();
        const email = String(getCellValue(row, ["Email Address", "email", "email_address"]) || "").trim();
        const roleVal = String(getCellValue(row, ["Role", "role", "role name", "role_name"]) || "").trim();
        const statusVal = String(getCellValue(row, ["Status", "status", "active", "is_active"]) || "Active").trim();

        if (!fullName) {
          status.valid = false;
          status.errors.push("Missing Full Name");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
          status.valid = false;
          status.errors.push("Missing Email Address");
        } else if (!emailRegex.test(email)) {
          status.valid = false;
          status.errors.push("Invalid Email format");
        }

        let roleId = null;
        if (!roleVal) {
          status.valid = false;
          status.errors.push("Missing Role name");
        } else {
          const matchedRole = roles.find(
            (r) => r.name?.toLowerCase() === roleVal.toLowerCase()
          );
          if (matchedRole) {
            roleId = matchedRole.id;
          } else {
            status.valid = false;
            status.errors.push(`Role '${roleVal}' not found in roles list`);
          }
        }

        const isActive = !["inactive", "false", "0", "no"].includes(statusVal.toLowerCase());

        mapped = {
          rowNum,
          full_name: fullName,
          email,
          role_name: roleVal,
          role_id: roleId,
          is_active: isActive,
        };
      }

      return { mapped, status };
    });

    setParsedData(validated);
  };

  // Perform bulk import by sending sequential POST requests to API
  const handleImport = async () => {
    const validRows = parsedData.filter((item) => item.status.valid);
    if (validRows.length === 0) {
      toast.error("No valid rows available to import.");
      return;
    }

    setImporting(true);
    setProgress(0);
    setImportLogs([]);
    const activeIp = secureStorage.getItem("active_ip");

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const { mapped } = validRows[i];
      const logPrefix = `Row ${mapped.rowNum}: `;
      setImportLogs((prev) => [...prev, `${logPrefix}Uploading...`]);

      let result;
      if (type === "matches") {
        const payload = {
          property_id: activeIp?.id,
          edition_id: Number(editionId),
          match_no: mapped.match_no,
          round: mapped.round,
          team1_id: mapped.team1_id,
          team2_id: mapped.team2_id,
          scheduled_at: mapped.scheduled_at || undefined,
          actual_start_time: mapped.actual_start_time || undefined,
          actual_end_time: mapped.actual_end_time || undefined,
          venue: mapped.venue || "",
        };
        result = await apiClient.post(process.env.NEXT_PUBLIC_MATCHES_ENDPOINT, payload);
      } else if (type === "teams") {
        const payload = {
          property_id: activeIp?.id,
          name: mapped.name,
          short_name: mapped.short_name,
          logo_url: mapped.logo_url || "",
        };
        result = await apiClient.post(
          `${process.env.NEXT_PUBLIC_TEAMS_ENDPOINT}?property_id=${activeIp?.id}`,
          payload
        );
      } else if (type === "players") {
        const payload = {
          property_id: activeIp?.id,
          full_name: mapped.full_name,
          role: mapped.role,
          external_id: mapped.external_id || undefined,
          source: mapped.source || "manual",
          edition_id: Number(editionId),
          team_id: mapped.team_id || undefined,
          image: mapped.image || "",
        };
        result = await apiClient.post(process.env.NEXT_PUBLIC_PERSONS_ENDPOINT, payload);
      } else if (type === "users") {
        const payload = {
          full_name: mapped.full_name,
          email: mapped.email,
          role_id: Number(mapped.role_id),
          property_id: activeIp?.id,
          is_active: mapped.is_active,
        };
        result = await apiClient.post(process.env.NEXT_PUBLIC_USERS_ENDPOINT, payload);
      }

      if (result.success) {
        successCount++;
        setImportLogs((prev) => [
          ...prev.slice(0, -1),
          `${logPrefix}✅ Success`,
        ]);
      } else {
        failCount++;
        setImportLogs((prev) => [
          ...prev.slice(0, -1),
          `${logPrefix}❌ Failed - ${result.error || "Unknown API Error"}`,
        ]);
      }

      const percentage = Math.round(((i + 1) / validRows.length) * 100);
      setProgress(percentage);
    }

    setImporting(false);

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} record(s)!`);
      if (onSuccess) onSuccess();
    }
    if (failCount > 0) {
      toast.error(`Failed to import ${failCount} record(s). Check logs.`);
    }

    if (failCount === 0) {
      // Auto close on full success after a short delay
      setTimeout(() => {
        resetState();
        if (onClose) onClose();
      }, 1000);
    }
  };

  const validRowsCount = parsedData.filter((item) => item.status.valid).length;
  const invalidRowsCount = parsedData.length - validRowsCount;

  return (
    <div className="space-y-6">
      {!file && (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30 hover:bg-white hover:border-gray-200 transition-all duration-300">
          <svg
            className="w-12 h-12 text-gray-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p className="text-sm font-semibold text-gray-700 mb-1 text-center">
            Upload your document spreadsheet
          </p>
          <p className="text-xs text-gray-400 mb-6 text-center">
            Supports Excel (.xlsx, .xls) and CSV files
          </p>

          <div className="flex gap-4">

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-md animate-pulse"
              style={{ backgroundColor: theme.primary_color }}
            >
              Select File
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
        </div>
      )}

      {file && (
        <div className="space-y-6">
          {/* File details card */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm"
                style={{ backgroundColor: theme.primary_color }}
              >
                XLS
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-950 truncate max-w-[200px] md:max-w-md">
                  {file.name}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB • {parsedData.length} row(s) found
                </p>
              </div>
            </div>

            {!importing && (
              <button
                type="button"
                onClick={resetState}
                className="h-8 px-3 rounded-lg border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest bg-white hover:bg-red-50 transition-all"
              >
                Remove File
              </button>
            )}
          </div>

          {/* Status summary */}
          {!importing && (
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-emerald-600 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {validRowsCount} Valid
              </span>
              {invalidRowsCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-600 px-3 py-1 bg-red-50 rounded-lg border border-red-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  {invalidRowsCount} Error(s) (skipped)
                </span>
              )}
            </div>
          )}

          {/* Preview Table */}
          {!importing && (
            <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[250px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest w-12 text-center">
                      #
                    </th>
                    {type === "matches" && (
                      <>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          No.
                        </th>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          Round
                        </th>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          Team 1
                        </th>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          Team 2
                        </th>
                      </>
                    )}
                    {type === "teams" && (
                      <>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          Team Name
                        </th>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          Short Name
                        </th>
                      </>
                    )}
                    {type === "players" && (
                      <>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          Name
                        </th>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          Role
                        </th>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          Team
                        </th>
                      </>
                    )}
                    {type === "users" && (
                      <>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          Name
                        </th>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          Email
                        </th>
                        <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                          Role
                        </th>
                      </>
                    )}
                    <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {parsedData.map(({ mapped, status }, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2 text-center text-gray-400 font-semibold">
                        {mapped.rowNum}
                      </td>
                      {type === "matches" && (
                        <>
                          <td className="px-4 py-2 font-bold text-gray-900">
                            {mapped.match_no || "—"}
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-700">
                            {mapped.round || "—"}
                          </td>
                          <td className="px-4 py-2 font-semibold text-gray-900">
                            {mapped.team1_name || "—"}{" "}
                            {mapped.team1_id && (
                              <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wide">
                                (OK)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 font-semibold text-gray-900">
                            {mapped.team2_name || "—"}{" "}
                            {mapped.team2_id && (
                              <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wide">
                                (OK)
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      {type === "teams" && (
                        <>
                          <td className="px-4 py-2 font-semibold text-gray-900">
                            {mapped.name || "—"}
                          </td>
                          <td className="px-4 py-2 font-bold text-gray-900 uppercase">
                            {mapped.short_name || "—"}
                          </td>
                        </>
                      )}
                      {type === "players" && (
                        <>
                          <td className="px-4 py-2 font-semibold text-gray-900">
                            {mapped.full_name || "—"}
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 font-bold uppercase text-[8px] text-gray-600">
                              {mapped.role}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-semibold text-gray-900">
                            {mapped.team_name || "—"}{" "}
                            {mapped.team_id && (
                              <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wide">
                                (OK)
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      {type === "users" && (
                        <>
                          <td className="px-4 py-2 font-semibold text-gray-900">
                            {mapped.full_name || "—"}
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {mapped.email || "—"}
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 font-bold uppercase text-[8px] text-gray-600">
                              {mapped.role_name}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-2">
                        <div className="space-y-1">
                          {status.valid && status.warnings.length === 0 && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold uppercase tracking-wider text-[8px]">
                              Ready
                            </span>
                          )}
                          {status.warnings.map((w, wIdx) => (
                            <div key={wIdx} className="text-amber-600 font-semibold text-[9px]">
                              ⚠️ {w}
                            </div>
                          ))}
                          {status.errors.map((e, eIdx) => (
                            <div key={eIdx} className="text-red-500 font-bold text-[9px]">
                              ❌ {e}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Progress and Logs (during import) */}
          {importing && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
                <span>Uploading Records...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: theme.primary_color,
                  }}
                />
              </div>

              {/* Realtime console logs */}
              <div className="bg-gray-950 text-emerald-400 font-mono text-[9px] p-4 rounded-xl h-36 overflow-y-auto space-y-1.5 scrollbar-thin">
                {importLogs.map((log, lIdx) => (
                  <div key={lIdx} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {file && !importing && (
        <div className="pt-4 flex justify-end gap-3 border-t border-gray-50">
          <button
            type="button"
            onClick={resetState}
            className="px-5 py-3 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={validRowsCount === 0}
            className="px-6 py-3 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            style={{ backgroundColor: theme.primary_color }}
          >
            Import {validRowsCount} Record(s)
          </button>
        </div>
      )}
    </div>
  );
}
