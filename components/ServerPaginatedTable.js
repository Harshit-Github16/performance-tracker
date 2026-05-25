"use client";

import React from "react";
import { useTheme } from "./ThemeContext";

export const ServerPaginatedTable = ({
    columns,
    data,
    emptyMessage = "No records found.",
    currentPage = 1,
    totalPages = 1,
    totalRecords = 0,
    onPageChange,
    searchValue = "",
    onSearchChange,
    className = "",
}) => {
    const { theme } = useTheme();

    return (
        <div className={`w-full bg-white rounded-2xl border border-gray-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.02)] overflow-hidden ${className}`}>
            {}
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white">
                <div className="relative w-full max-w-sm group">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-950 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search records..."
                        value={searchValue}
                        onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                        className="w-full pl-12 pr-6 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-950 outline-none transition-all focus:bg-white focus:border-gray-200"
                    />
                </div>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                    Showing {data.length} of {totalRecords} records
                </div>
            </div>

            {}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/10 border-b border-gray-50">
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={`px-6 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
                                        }`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50/50">
                        {data.length > 0 ? (
                            data.map((row, rowIdx) => (
                                <tr
                                    key={rowIdx}
                                    className="hover:bg-gray-50/30 transition-colors duration-200 animate-in fade-in slide-in-from-bottom-2 duration-300"
                                    style={{ animationDelay: `${rowIdx * 50}ms` }}
                                >
                                    {columns.map((col, colIdx) => (
                                        <td
                                            key={colIdx}
                                            className={`px-6 py-1.5 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
                                                }`}
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

            {}
            {totalPages > 1 && (
                <div className="px-8 py-4 border-t border-gray-50 flex items-center justify-between bg-white text-sm">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-100 rounded-lg text-gray-400 flex items-center space-x-2
                            hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-semibold text-xs uppercase tracking-widest">Back</span>
                        </button>

                        <div className="flex items-center gap-1 px-4">
                            {[...Array(totalPages)].map((_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => onPageChange(pageNum)}
                                        className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                                            ? "text-white shadow-lg"
                                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-950"
                                            }`}
                                        style={currentPage === pageNum ? { backgroundColor: theme.primary_color } : {}}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-100 rounded-lg text-gray-400 flex items-center space-x-2 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <span className="font-semibold text-xs uppercase tracking-widest">Next</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                            </svg>
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
