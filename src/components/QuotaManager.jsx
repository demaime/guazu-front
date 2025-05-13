"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

export function QuotaManager({ value = [], onChange, totalTarget = 0 }) {
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
        segments: [{ name: "", target: 0, current: 0, percentage: 0 }],
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
      percentage: 0,
    });

    setCategories(updatedCategories);
    onChange(updatedCategories);

    if (totalTarget > 0) {
      redistributePercentagesAndTargets(updatedCategories, categoryIndex);
    }
  };

  const removeSegment = (categoryIndex, segmentIndex) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].segments = updatedCategories[
      categoryIndex
    ].segments.filter((_, i) => i !== segmentIndex);

    setCategories(updatedCategories);
    onChange(updatedCategories);

    if (
      totalTarget > 0 &&
      updatedCategories[categoryIndex].segments.length > 0
    ) {
      redistributePercentagesAndTargets(updatedCategories, categoryIndex);
    }
  };

  const updateCategory = (index, newName) => {
    const updatedCategories = [...categories];
    updatedCategories[index].category = newName;
    setCategories(updatedCategories);
    onChange(updatedCategories);
  };

  const updateSegmentTarget = (categoryIndex, segmentIndex, newTarget) => {
    const updatedCategories = [...categories];
    const currentSegment =
      updatedCategories[categoryIndex].segments[segmentIndex];
    const currentTarget = currentSegment.target;

    // Parse and limit the new target to prevent exceeding total target
    let parsedTarget = parseInt(newTarget) || 0;

    // Calculate the current total excluding this segment
    const segments = updatedCategories[categoryIndex].segments;
    const currentTotal =
      segments.reduce((sum, segment) => sum + (segment.target || 0), 0) -
      currentTarget;

    // Don't allow exceeding the total target
    if (currentTotal + parsedTarget > totalTarget) {
      parsedTarget = totalTarget - currentTotal;
      // If result is negative, set to 0
      parsedTarget = Math.max(0, parsedTarget);
    }

    // Update the segment with the validated target
    currentSegment.target = parsedTarget;

    // Calculate new percentage based on the adjusted target
    if (totalTarget > 0) {
      currentSegment.percentage = Math.round(
        (parsedTarget / totalTarget) * 100
      );
    }

    // Update related segments
    updateRelatedSegmentsBasedOnTarget(updatedCategories, categoryIndex);

    setCategories(updatedCategories);
    onChange(updatedCategories);
  };

  const updateSegmentPercentage = (
    categoryIndex,
    segmentIndex,
    newPercentage
  ) => {
    const updatedCategories = [...categories];
    const currentSegment =
      updatedCategories[categoryIndex].segments[segmentIndex];
    const currentPercentage = currentSegment.percentage || 0;

    // Parse and limit the percentage
    let parsedPercentage = parseInt(newPercentage) || 0;
    parsedPercentage = Math.min(100, Math.max(0, parsedPercentage));

    // Calculate the current total percentage excluding this segment
    const segments = updatedCategories[categoryIndex].segments;
    const currentTotalPercentage =
      segments.reduce((sum, segment) => sum + (segment.percentage || 0), 0) -
      currentPercentage;

    // Don't allow exceeding 100%
    if (currentTotalPercentage + parsedPercentage > 100) {
      parsedPercentage = 100 - currentTotalPercentage;
      // If result is negative, set to 0
      parsedPercentage = Math.max(0, parsedPercentage);
    }

    // Update the segment with the validated percentage
    currentSegment.percentage = parsedPercentage;

    // Calculate new target based on the adjusted percentage
    if (totalTarget > 0) {
      currentSegment.target = Math.round(
        (parsedPercentage / 100) * totalTarget
      );
    }

    // Update related segments
    updateRelatedSegmentsBasedOnPercentage(updatedCategories, categoryIndex);

    setCategories(updatedCategories);
    onChange(updatedCategories);
  };

  const updateRelatedSegmentsBasedOnTarget = (categories, categoryIndex) => {
    const segments = categories[categoryIndex].segments;

    // Calculate the current total
    const currentTotal = segments.reduce(
      (sum, segment) => sum + (segment.target || 0),
      0
    );

    // If there's more than one segment and the total exceeds target, adjust
    if (segments.length > 1 && currentTotal > totalTarget) {
      const excessAmount = currentTotal - totalTarget;

      // Find segments to adjust (exclude the most recently modified one)
      const lastModifiedIndex = segments.findIndex((s) => s.isLastModified);
      const adjustableSegments = segments.filter(
        (_, i) => i !== lastModifiedIndex
      );

      if (adjustableSegments.length > 0) {
        // Calculate how much to reduce from each segment
        const reductionPerSegment = Math.ceil(
          excessAmount / adjustableSegments.length
        );

        // Reduce each segment's target proportionally
        for (let i = 0; i < segments.length; i++) {
          if (i !== lastModifiedIndex) {
            const segment = segments[i];
            const reduction = Math.min(segment.target, reductionPerSegment);
            segment.target -= reduction;

            // Ensure no negative values
            segment.target = Math.max(0, segment.target);

            // Update the percentage
            segment.percentage =
              totalTarget > 0
                ? Math.round((segment.target / totalTarget) * 100)
                : 0;
          }
        }
      }
    }

    // Ensure all percentages match their targets
    for (let i = 0; i < segments.length; i++) {
      segments[i].percentage =
        totalTarget > 0
          ? Math.round((segments[i].target / totalTarget) * 100)
          : 0;
    }
  };

  const updateRelatedSegmentsBasedOnPercentage = (
    categories,
    categoryIndex
  ) => {
    const segments = categories[categoryIndex].segments;

    // Calculate the current total percentage
    const currentTotalPercentage = segments.reduce(
      (sum, segment) => sum + (segment.percentage || 0),
      0
    );

    // If there's more than one segment and total exceeds 100%, adjust
    if (segments.length > 1 && currentTotalPercentage > 100) {
      const excessPercentage = currentTotalPercentage - 100;

      // Find segments to adjust (exclude the most recently modified one)
      const lastModifiedIndex = segments.findIndex((s) => s.isLastModified);
      const adjustableSegments = segments.filter(
        (_, i) => i !== lastModifiedIndex
      );

      if (adjustableSegments.length > 0) {
        // Calculate how much to reduce from each segment
        const reductionPerSegment = Math.ceil(
          excessPercentage / adjustableSegments.length
        );

        // Reduce each segment's percentage proportionally
        for (let i = 0; i < segments.length; i++) {
          if (i !== lastModifiedIndex) {
            const segment = segments[i];
            const reduction = Math.min(
              segment.percentage || 0,
              reductionPerSegment
            );
            segment.percentage -= reduction;

            // Ensure no negative values
            segment.percentage = Math.max(0, segment.percentage);

            // Update the target
            segment.target = Math.round(
              (segment.percentage / 100) * totalTarget
            );
          }
        }
      }
    }

    // Ensure all targets match their percentages
    for (let i = 0; i < segments.length; i++) {
      segments[i].target = Math.round(
        (segments[i].percentage / 100) * totalTarget
      );
    }
  };

  const redistributePercentagesAndTargets = (categories, categoryIndex) => {
    const segments = categories[categoryIndex].segments;
    if (segments.length === 0) return;

    const equalPercentage = Math.floor(100 / segments.length);
    const remainingPercentage = 100 - equalPercentage * segments.length;

    segments.forEach((segment, i) => {
      const adjustedPercentage =
        i === 0 ? equalPercentage + remainingPercentage : equalPercentage;
      segment.percentage = adjustedPercentage;
      segment.target = Math.round((adjustedPercentage / 100) * totalTarget);
    });
  };

  useEffect(() => {
    if (totalTarget > 0 && categories.length > 0) {
      const updatedCategories = [...categories];

      updatedCategories.forEach((category, index) => {
        category.segments.forEach((segment) => {
          segment.target = Math.round((segment.percentage / 100) * totalTarget);
        });
      });

      setCategories(updatedCategories);
      onChange(updatedCategories);
    }
  }, [totalTarget]);

  // Add a validation check at the end of the quota section
  const validateTotalTarget = () => {
    if (!totalTarget) return null;

    for (const category of categories) {
      if (!category.segments.length) continue;

      const categoryTotal = category.segments.reduce(
        (sum, segment) => sum + (segment.target || 0),
        0
      );

      if (categoryTotal > totalTarget) {
        return `La categoría "${category.category}" excede la meta total (${categoryTotal}/${totalTarget})`;
      }
    }

    return null;
  };

  // Function to check if a specific category's total exceeds the target
  const getCategoryTotal = (categoryIndex) => {
    if (categoryIndex === undefined || !categories[categoryIndex]) return 0;

    return categories[categoryIndex].segments.reduce(
      (sum, segment) => sum + (segment.target || 0),
      0
    );
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
          {categories.map((category, categoryIndex) => {
            const categoryTotal = getCategoryTotal(categoryIndex);
            const isTotalExceeded = categoryTotal > totalTarget;

            return (
              <div key={categoryIndex} className="card p-5 mb-5">
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-card-border">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={category.category}
                      onChange={(e) =>
                        updateCategory(categoryIndex, e.target.value)
                      }
                      className="font-medium text-lg focus:outline-none p-1 rounded w-full max-w-sm p-2"
                      placeholder="Nombre de la categoría"
                    />
                  </div>

                  <div className="flex items-center">
                    {totalTarget > 0 && (
                      <div
                        className={`text-sm mr-4 font-medium ${
                          isTotalExceeded ? "text-red-500" : "text-green-500"
                        }`}
                      >
                        Total: {categoryTotal}/{totalTarget} (
                        {Math.round((categoryTotal / totalTarget) * 100)}%)
                      </div>
                    )}

                    <button
                      onClick={() => removeCategory(categoryIndex)}
                      className="text-red-500 p-2 hover:bg-hover-bg rounded-full transition-colors"
                      title="Eliminar categoría"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
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
                          <th className="text-left py-3 px-3 bg-card-background text-text-secondary text-sm font-medium w-32">
                            %
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
                                onChange={(e) => {
                                  const updatedCategories = [...categories];
                                  updatedCategories[categoryIndex].segments[
                                    segmentIndex
                                  ].name = e.target.value;
                                  setCategories(updatedCategories);
                                  onChange(updatedCategories);
                                }}
                                placeholder="Nombre del segmento"
                                className="w-full p-2 border rounded-md"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                min="0"
                                max={totalTarget}
                                value={segment.target}
                                onChange={(e) => {
                                  const updatedCategories = [...categories];
                                  updatedCategories[
                                    categoryIndex
                                  ].segments.forEach(
                                    (s) => (s.isLastModified = false)
                                  );
                                  updatedCategories[categoryIndex].segments[
                                    segmentIndex
                                  ].isLastModified = true;
                                  setCategories(updatedCategories);

                                  updateSegmentTarget(
                                    categoryIndex,
                                    segmentIndex,
                                    e.target.value
                                  );
                                }}
                                className="w-full p-2 border rounded-md"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={segment.percentage || 0}
                                  onChange={(e) => {
                                    const updatedCategories = [...categories];
                                    updatedCategories[
                                      categoryIndex
                                    ].segments.forEach(
                                      (s) => (s.isLastModified = false)
                                    );
                                    updatedCategories[categoryIndex].segments[
                                      segmentIndex
                                    ].isLastModified = true;
                                    setCategories(updatedCategories);

                                    updateSegmentPercentage(
                                      categoryIndex,
                                      segmentIndex,
                                      e.target.value
                                    );
                                  }}
                                  className="w-full p-2 border rounded-md"
                                />
                                <span className="ml-2">%</span>
                              </div>
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
                  className="cursor-pointer text-primary py-2 px-3 flex items-center hover:bg-hover-bg rounded transition-colors"
                >
                  <Plus size={16} className="mr-2" /> Agregar segmento
                </button>

                {isTotalExceeded && (
                  <div className="mt-2 text-red-500 text-sm bg-red-50 p-2 rounded-md">
                    Atención: La suma de objetivos ({categoryTotal}) excede la
                    meta total ({totalTarget})
                  </div>
                )}
              </div>
            );
          })}

          {totalTarget > 0 && validateTotalTarget() && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {validateTotalTarget()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
