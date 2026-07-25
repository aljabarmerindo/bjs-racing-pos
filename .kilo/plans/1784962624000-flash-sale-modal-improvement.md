# Flash Sale Modal Improvement Plan

## Current State
- `FlashSaleModal.jsx` uses `<select>` dropdowns for product selection
- Manual input for `original_price` and `stock_allocated`
- No `harga_beli` or margin info
- No category filter

## Proposed Changes

### 1. Replace Dropdowns with Searchable Inputs
- **Category search**: text input with debounced search, results appear in dropdown list below
- **Product search**: text input with debounced search, filtered by selected category
- Adopt UI pattern from `ProductFilter.jsx` (search icon + input) + results dropdown

### 2. Auto-fill Readonly Fields
When product is selected:
- `original_price` = `product.harga_jual` (readonly)
- `stock_allocated` = `product.stok` (readonly, syncs with DB)
- `harga_beli` = `product.harga_beli` (readonly, new field)

### 3. Add Margin Info
- Display margin % = `((flash_price - harga_beli) / flash_price) * 100`
- Updates live when `flash_price` changes
- Show in info panel below the inputs

### 4. Remove Unnecessary Fields
- Keep: `flash_price`, `sort_order`, `valid_from`, `valid_until`, `is_active`
- Remove manual `original_price` input (auto-filled)
- Remove manual `stock_allocated` input (auto-filled)

### 5. Component Structure
```
FlashSaleModal
├── Category Search Input (searchable)
├── Product Search Input (searchable)
├── Product Info Panel (readonly)
│   ├── Harga Beli
│   ├── Harga Asli (harga_jual)
│   ├── Stok
│   └── Margin %
├── Flash Price (editable)
├── Sort Order
├── Valid From / Until
├── Is Active
└── Buttons
```

### 6. Data Flow
1. Admin types in category search → debounce 300ms → query `products` for distinct categories matching term
2. Admin selects category → product search filters by category
3. Admin types in product search → debounce 300ms → query `products` with `ilike` on `nama`/`kode`
4. Admin selects product → auto-fill readonly fields, calculate margin
5. Admin adjusts `flash_price` → margin recalculates live

## Implementation Steps
1. Create `SearchableProductSelect.jsx` component (reusable)
2. Update `FlashSaleModal.jsx` with new layout and logic
3. Add margin calculation
4. Test with existing data
