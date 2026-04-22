export function FilterBar({ sortBy = 'latest', view = 'grid', activeChip = 'all' }) {
  const chips = [
    ['all', 'All Jobs'],
    ['verified', 'Verified'],
    ['telangana', 'Telangana'],
    ['ap', 'Andhra Pradesh'],
    ['psu', 'PSU'],
    ['closing', 'Closing ≤ 7d']
  ];

  return `
    <section class="filter-bar" aria-label="Quick filters">
      <div class="chip-row" id="chip-row">
        ${chips.map(([value, label]) => `<button class="chip ${activeChip === value ? 'active' : ''}" data-chip="${value}">${label}</button>`).join('')}
      </div>
      <div class="filter-controls">
        <div class="segmented" role="group" aria-label="List grid toggle">
          <button class="seg-btn ${view === 'grid' ? 'active' : ''}" data-view="grid">Grid</button>
          <button class="seg-btn ${view === 'list' ? 'active' : ''}" data-view="list">List</button>
        </div>
        <label class="sort-wrap">Sort
          <select id="sort-by">
            <option value="latest" ${sortBy === 'latest' ? 'selected' : ''}>Latest</option>
            <option value="deadline" ${sortBy === 'deadline' ? 'selected' : ''}>Deadline</option>
            <option value="salary" ${sortBy === 'salary' ? 'selected' : ''}>Salary</option>
            <option value="relevance" ${sortBy === 'relevance' ? 'selected' : ''}>Relevance</option>
          </select>
        </label>
      </div>
    </section>
  `;
}
