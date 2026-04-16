"use client";

import React, { useState } from "react";
import { useTheme } from "./ThemeContext";

/**
 * Dynamic Premium Button
 * Automatically handles theme colors and hover states.
 */
export const Button = ({ children, onClick, type = "button", variant = "primary", className = "", icon, ...props }) => {
  const { theme } = useTheme();

  const getStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: theme.primary_color || "#000",
          color: "#fff",
        };
      case "secondary":
        return {
          backgroundColor: theme.secondary_color || "#f4f4f5ff",
          color: "#000",
        };
      case "outline":
        return {
          border: `1.5px solid ${theme.primary_color || "#000"}`,
          color: theme.primary_color || "#000",
          backgroundColor: "transparent",
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          color: "#71717a",
        };
      default:
        return {};
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      style={getStyles()}
      className={`
        inline-flex items-center justify-center gap-2 px-6 py-3.5 
        rounded-xl text-xs font-semibold uppercase tracking-[0.15em]
        transition-all duration-300 active:scale-[0.97]
        shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-50
        ${className}
      `}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

/**
 * Dynamic Flexible Table with Search and Pagination
 * Pass 'columns' and 'data' to render any list.
 */
export const DataTable = ({ columns, data, className = "", emptyMessage = "No records found.", itemsPerPage = 10 }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { theme } = useTheme();

  // Filter logic
  const filteredData = data.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className={`w-full bg-white rounded-2xl border border-gray-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.02)] overflow-hidden ${className}`}>
      {/* Search Bar Header */}
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white">
        <div className="relative w-full max-w-sm group">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-950 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-6 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-950 outline-none transition-all focus:bg-white focus:border-gray-200"
          />
        </div>
        <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
          Showing {currentItems.length} of {filteredData.length} records
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/10 border-b border-gray-50">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50/50">
            {currentItems.length > 0 ? (
              currentItems.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50/30 transition-colors duration-200 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${rowIdx * 50}ms` }}>
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-6 py-1.5 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}`}
                    >
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-8 py-20 text-center text-gray-400 text-sm italic">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-8 py-4 border-t border-gray-50 flex items-center justify-between bg-white text-sm">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => paginate(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-100 rounded-lg text-gray-400 flex items-center space-x-2 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              <span className="font-semibold text-xs uppercase tracking-widest">Back</span>
            </button>

            <div className="flex items-center gap-1 px-4">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => paginate(i + 1)}
                  className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1
                    ? "text-white shadow-lg"
                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-950"
                    }`}
                  style={currentPage === i + 1 ? { backgroundColor: theme.primary_color } : {}}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-100 rounded-lg text-gray-400 flex items-center space-x-2 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="font-semibold text-xs uppercase tracking-widest">Next</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Dynamic Input with Optional Prefix Support
 */
export const Input = ({ label, type = "text", placeholder, value, onChange, className = "", prefix, ...props }) => {
  const { theme } = useTheme();

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {label && <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{label}</label>}
      <div className="relative group">
        {prefix && (
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-base select-none">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`
            w-full bg-gray-50 border border-gray-100 rounded-xl
            text-sm font-medium text-gray-950 outline-none
            transition-all duration-300 focus:bg-white focus:ring-2 
            focus:ring-gray-950/5 focus:border-gray-950
            [&:-webkit-autofill]:bg-gray-50
            [&:-webkit-autofill]:shadow-[0_0_0_1000px_#f9fafb_inset]
            [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s]
            ${prefix ? "pl-16 py-4" : "px-5 py-4"}
          `}
          {...props}
        />
      </div>
    </div>
  );
};
