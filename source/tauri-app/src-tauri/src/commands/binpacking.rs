use crate::models::{Bin, FileItem, PackResult};

#[tauri::command]
pub fn pack_items(items: Vec<FileItem>, max_size: u64) -> PackResult {
    let mut oversized: Vec<FileItem> = Vec::new();
    let mut working: Vec<FileItem> = Vec::new();

    for it in items {
        if it.item_size > max_size {
            oversized.push(it);
        } else {
            working.push(it);
        }
    }

    // Sort descending by size (Best Fit Decreasing)
    working.sort_by(|a, b| b.item_size.cmp(&a.item_size));

    let mut bins: Vec<Bin> = Vec::with_capacity(working.len() / 10 + 1);
    let mut space_map: std::collections::BTreeMap<u64, Vec<usize>> = std::collections::BTreeMap::new();

    for item in working {
        let mut target_rem: Option<u64> = None;
        
        // Best fit: smallest remaining space >= item_size
        if let Some((&rem, _)) = space_map.range(item.item_size..).next() {
            target_rem = Some(rem);
        }

        if let Some(rem) = target_rem {
            let mut indices = space_map.remove(&rem).unwrap();
            let idx = indices.pop().unwrap();
            
            if !indices.is_empty() {
                space_map.insert(rem, indices);
            }
            
            bins[idx].items.push(item.clone());
            bins[idx].size += item.item_size;
            
            let new_rem = rem - item.item_size;
            if new_rem > 0 {
                space_map.entry(new_rem).or_default().push(idx);
            }
        } else {
            let new_idx = bins.len();
            bins.push(Bin {
                size: item.item_size,
                items: vec![item.clone()],
            });
            let rem = max_size - item.item_size;
            if rem > 0 {
                space_map.entry(rem).or_default().push(new_idx);
            }
        }
    }

    PackResult { bins, oversized }
}
