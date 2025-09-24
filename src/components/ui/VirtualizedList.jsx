"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";

const VirtualizedList = ({
  items = [],
  renderItem,
  itemHeight = 80,
  pageSize = 10,
  searchable = false,
  searchPlaceholder = "Buscar...",
  searchKeys = [],
  filterable = false,
  filters = [],
  className = "",
  emptyState = null,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const containerRef = useRef(null);

  // Filtrar y buscar items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Aplicar filtros
    Object.entries(activeFilters).forEach(([filterKey, filterValue]) => {
      if (filterValue && filterValue !== "all") {
        result = result.filter((item) => {
          // Handle special filter cases
          if (filterKey === "progressPercentage") {
            if (filterValue === "completed")
              return item.progressPercentage >= 100;
            if (filterValue === "inProgress")
              return (
                item.progressPercentage > 0 && item.progressPercentage < 100
              );
            if (filterValue === "notStarted")
              return item.progressPercentage === 0;
          }
          if (filterKey === "hasLocation") {
            if (filterValue === "withLocation") return item.lat && item.lng;
            if (filterValue === "withoutLocation")
              return !item.lat || !item.lng;
          }

          // Default exact match
          const itemValue = item[filterKey];
          return itemValue === filterValue;
        });
      }
    });

    // Aplicar búsqueda
    if (searchQuery.trim() && searchKeys.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) =>
        searchKeys.some((key) => {
          const value = item[key];
          return value && value.toString().toLowerCase().includes(query);
        })
      );
    }

    return result;
  }, [items, searchQuery, activeFilters, searchKeys]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredItems.length);
  const currentItems = filteredItems.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters]);

  const handleFilterChange = (filterKey, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of container
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  };

  const renderPaginationButton = (page, isCurrent = false) => (
    <button
      key={page}
      onClick={() => goToPage(page)}
      className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
        isCurrent
          ? "bg-[var(--primary)] text-white shadow-md"
          : "hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
      }`}
    >
      {page}
    </button>
  );

  const renderPaginationEllipsis = (key) => (
    <span key={key} className="px-2 text-[var(--text-secondary)]">
      ...
    </span>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Mostrar todas las páginas si son pocas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(renderPaginationButton(i, i === currentPage));
      }
    } else {
      // Lógica para mostrar páginas con ellipsis
      pages.push(renderPaginationButton(1, currentPage === 1));

      if (currentPage > 3) {
        pages.push(renderPaginationEllipsis("start-ellipsis"));
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(renderPaginationButton(i, i === currentPage));
      }

      if (currentPage < totalPages - 2) {
        pages.push(renderPaginationEllipsis("end-ellipsis"));
      }

      if (totalPages > 1) {
        pages.push(
          renderPaginationButton(totalPages, currentPage === totalPages)
        );
      }
    }

    return (
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--card-border)]">
        <div className="text-sm text-[var(--text-secondary)]">
          Mostrando {startIndex + 1}-{endIndex} de {filteredItems.length}{" "}
          elementos
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-[var(--hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">{pages}</div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-[var(--hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filters */}
      {(searchable || filterable) && (
        <div className="flex flex-col md:flex-row gap-4 p-4 bg-[var(--input-background)] rounded-lg">
          {/* Search */}
          {searchable && (
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>
          )}

          {/* Filters */}
          {filterable && filters.length > 0 && (
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
              {filters.map((filter) => (
                <select
                  key={filter.key}
                  value={activeFilters[filter.key] || "all"}
                  onChange={(e) =>
                    handleFilterChange(filter.key, e.target.value)
                  }
                  className="px-3 py-2 bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--primary)] transition-colors text-sm"
                >
                  <option value="all">{filter.placeholder}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List Container */}
      <div
        ref={containerRef}
        className="space-y-2 min-h-[400px]"
        style={{ maxHeight: pageSize * itemHeight + 50 }}
      >
        <AnimatePresence mode="wait">
          {currentItems.length > 0 ? (
            <motion.div
              key={`page-${currentPage}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {currentItems.map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                >
                  {renderItem(item, startIndex + index)}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-12"
            >
              {emptyState || (
                <div className="text-center">
                  <p className="text-[var(--text-secondary)] text-lg">
                    No se encontraron elementos
                  </p>
                  {(searchQuery || Object.keys(activeFilters).length > 0) && (
                    <p className="text-[var(--text-secondary)] text-sm mt-2">
                      Intenta ajustar los filtros o la búsqueda
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
};

export default VirtualizedList;
