"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export function QuotaManager({ value = [], onChange }) {
  const [categories, setCategories] = useState(value);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");

  const addCategory = () => {
    if (!newCategory.trim()) {
      setError("El nombre de la categoría no puede estar vacío");
      return;
    }

    if (
      categories.some(
        (category) =>
          category.category.toLowerCase() === newCategory.toLowerCase()
      )
    ) {
      setError("Ya existe una categoría con este nombre");
      return;
    }

    const updatedCategories = [
      ...categories,
      {
        category: newCategory,
        segments: [{ name: "", target: 0, current: 0 }],
      },
    ];

    setCategories(updatedCategories);
    onChange(updatedCategories);
    setNewCategory("");
    setError("");
  };

  const removeCategory = (index) => {
    const updatedCategories = categories.filter((_, i) => i !== index);
    setCategories(updatedCategories);
    onChange(updatedCategories);
  };

  const addSegment = (categoryIndex) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].segments.push({
      name: "",
      target: 0,
      current: 0,
    });
    setCategories(updatedCategories);
    onChange(updatedCategories);
  };

  const removeSegment = (categoryIndex, segmentIndex) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].segments = updatedCategories[
      categoryIndex
    ].segments.filter((_, i) => i !== segmentIndex);
    setCategories(updatedCategories);
    onChange(updatedCategories);
  };

  const updateCategory = (index, newName) => {
    const updatedCategories = [...categories];
    updatedCategories[index].category = newName;
    setCategories(updatedCategories);
    onChange(updatedCategories);
  };

  const updateSegment = (categoryIndex, segmentIndex, field, value) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].segments[segmentIndex][field] =
      field === "target" ? parseInt(value) || 0 : value;
    setCategories(updatedCategories);
    onChange(updatedCategories);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex justify-between gap-4">
          <div className="w-2/3">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => {
                setNewCategory(e.target.value);
                if (e.target.value.trim()) setError("");
              }}
              placeholder="Nombre de la categoría (ej: Género, Educación, etc.)"
              className="w-full p-3 border rounded-md"
            />
          </div>
          <div className="w-1/4 flex items-center justify-center">
            <button
              onClick={addCategory}
              className="btn-primary w-full flex items-center justify-center"
            >
              <Plus size={18} className="mr-2" /> Agregar
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-2 p-2 bg-card-background">
            {error}
          </p>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-8 bg-card-background rounded-lg border border-card-border">
          <p className="text-text-secondary">No hay categorías definidas</p>
          <p className="text-text-muted text-sm mt-2">
            Agrega categorías como Género, Educación, Edad, etc.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="card p-5 mb-5">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-card-border">
                <input
                  type="text"
                  value={category.category}
                  onChange={(e) =>
                    updateCategory(categoryIndex, e.target.value)
                  }
                  className="font-medium text-lg focus:outline-none p-1 rounded w-full max-w-sm p-2"
                  placeholder="Nombre de la categoría"
                />

                <button
                  onClick={() => removeCategory(categoryIndex)}
                  className="text-red-500 p-2 hover:bg-hover-bg rounded-full transition-colors"
                  title="Eliminar categoría"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="mb-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left py-3 px-3 bg-card-background text-text-secondary text-sm font-medium rounded-l">
                          Segmento
                        </th>
                        <th className="text-left py-3 px-3 bg-card-background text-text-secondary text-sm font-medium w-32">
                          Objetivo
                        </th>
                        <th className="w-10 bg-card-background rounded-r"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.segments.map((segment, segmentIndex) => (
                        <tr key={segmentIndex}>
                          <td className="py-3 px-2">
                            <input
                              type="text"
                              value={segment.name}
                              onChange={(e) =>
                                updateSegment(
                                  categoryIndex,
                                  segmentIndex,
                                  "name",
                                  e.target.value
                                )
                              }
                              placeholder="Nombre del segmento"
                              className="w-full p-2 border rounded-md"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <input
                              type="number"
                              min="0"
                              value={segment.target}
                              onChange={(e) =>
                                updateSegment(
                                  categoryIndex,
                                  segmentIndex,
                                  "target",
                                  e.target.value
                                )
                              }
                              className="w-full p-2 border rounded-md"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() =>
                                removeSegment(categoryIndex, segmentIndex)
                              }
                              className="text-red-500 p-1 hover:bg-hover-bg rounded transition-colors"
                              title="Eliminar segmento"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={() => addSegment(categoryIndex)}
                className=" cursor-pointer text-primary py-2 px-3 flex items-center hover:bg-hover-bg rounded transition-colors"
              >
                <Plus size={16} className="mr-2" /> Agregar segmento
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
