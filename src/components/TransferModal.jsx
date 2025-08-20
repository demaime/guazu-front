import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, X, Search } from "lucide-react";

export function TransferModal({
  isOpen,
  onClose,
  title,
  availableItems,
  selectedItems,
  onSave,
}) {
  const [localSelected, setLocalSelected] = useState([]);
  const [availableList, setAvailableList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLocalSelected(selectedItems || []);
      setAvailableList(
        availableItems.filter(
          (item) => !selectedItems.find((selected) => selected._id === item._id)
        )
      );
      setSearchTerm("");
    }
  }, [isOpen, availableItems, selectedItems]);

  const handleSelect = (item) => {
    setLocalSelected([...localSelected, item]);
    setAvailableList(availableList.filter((i) => i._id !== item._id));
  };

  const handleUnselect = (item) => {
    setAvailableList([...availableList, item]);
    setLocalSelected(localSelected.filter((i) => i._id !== item._id));
  };

  const handleSave = () => {
    onSave(localSelected);
    onClose();
  };

  const filteredAvailableList = availableList.filter((item) => {
    const fullName = `${item.name} ${item.lastName}`.toLowerCase();
    const email = (item.email || "").toLowerCase();
    const city = (item.city || "").toLowerCase();
    const search = searchTerm.toLowerCase();

    return (
      fullName.includes(search) ||
      email.includes(search) ||
      city.includes(search)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg p-6 w-full max-w-6xl mx-4 shadow-xl"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--hover-bg)] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email o ciudad..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--input-background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
          </div>
        </div>

        {/* Transfer Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Available List */}
          <div className="space-y-4">
            <h3 className="font-medium text-[var(--text-primary)]">
              Disponibles
            </h3>
            <div className="border border-[var(--card-border)] rounded-lg h-96 overflow-y-auto bg-[var(--input-background)]">
              {filteredAvailableList.map((item) => (
                <button
                  key={item._id}
                  onClick={() => handleSelect(item)}
                  className="w-full p-4 text-left hover:bg-[var(--hover-bg)] flex items-center justify-between group transition-colors text-[var(--text-primary)] cursor-pointer border-b border-[var(--card-border)]/50 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {/* Nombre principal */}
                      <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                        {item.name} {item.lastName}
                      </span>

                      {/* Email más pequeño */}
                      {item.email && (
                        <span className="text-xs text-[var(--text-secondary)] truncate">
                          {item.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ciudad llamativa al margen derecho */}
                  {item.city && (
                    <span className="px-2 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full whitespace-nowrap flex-shrink-0 mr-2">
                      📍 {item.city}
                    </span>
                  )}

                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--primary)] flex-shrink-0" />
                </button>
              ))}
              {filteredAvailableList.length === 0 && (
                <div className="p-4 text-[var(--text-secondary)] text-center">
                  No se encontraron resultados
                </div>
              )}
            </div>
          </div>

          {/* Selected List */}
          <div className="space-y-4">
            <h3 className="font-medium text-[var(--text-primary)]">
              Seleccionados
            </h3>
            <div className="border border-[var(--card-border)] rounded-lg h-96 overflow-y-auto bg-[var(--input-background)]">
              {localSelected.map((item) => (
                <button
                  key={item._id}
                  onClick={() => handleUnselect(item)}
                  className="w-full p-4 text-left hover:bg-[var(--hover-bg)] flex items-center justify-between group transition-colors text-[var(--text-primary)] cursor-pointer border-b border-[var(--card-border)]/50 last:border-b-0"
                >
                  <ArrowLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--primary)] flex-shrink-0 mr-2" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {/* Nombre principal */}
                      <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                        {item.name} {item.lastName}
                      </span>

                      {/* Email más pequeño */}
                      {item.email && (
                        <span className="text-xs text-[var(--text-secondary)] truncate">
                          {item.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ciudad llamativa al margen derecho */}
                  {item.city && (
                    <span className="px-2 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full whitespace-nowrap flex-shrink-0">
                      📍 {item.city}
                    </span>
                  )}
                </button>
              ))}
              {localSelected.length === 0 && (
                <div className="p-4 text-[var(--text-secondary)] text-center">
                  No hay elementos seleccionados
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancelar
          </button>
          <button onClick={handleSave} className="btn-primary">
            Guardar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
