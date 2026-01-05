export default function LocationSearchFilter({
  provinces,
  cities,
  selectedProvince,
  selectedCity,
  onProvinceChange,
  onCityChange,
}) {
  const hasFilters = selectedProvince || selectedCity;

  return (
    <div className="bg-[var(--card-background)] border border-[var(--card-border)] rounded-xl p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Province Selector */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Provincia
          </label>
          <select
            value={selectedProvince}
            onChange={(e) => onProvinceChange(e.target.value)}
            className="w-full bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
          >
            <option value="">Todas las provincias</option>
            {provinces.map(({ name, count }) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
        </div>

        {/* City Selector (only visible when province is selected) */}
        {selectedProvince && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Ciudad
            </label>
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="w-full bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
            >
              <option value="">Todas las ciudades</option>
              {cities.map(({ name, count }) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

    </div>
  );
}
