use crate::models::FileItem;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use image::{RgbaImage, ImageEncoder};

fn ensure_dir(p: &Path) -> Result<(), String> {
    fs::create_dir_all(p).map_err(|e| e.to_string())
}

/// Enumerate all files under `dir` recursively.
fn enumerate_dir(dir: &Path, root_parent: &Path) -> Vec<FileItem> {
    let mut results = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                results.extend(enumerate_dir(&path, root_parent));
            } else if path.is_file() {
                let size = path.metadata().map(|m| m.len()).unwrap_or(0);
                let display = path
                    .strip_prefix(root_parent)
                    .map(|r| r.to_string_lossy().replace('/', "\\"))
                    .unwrap_or_else(|_| {
                        path.file_name()
                            .map(|n| n.to_string_lossy().into_owned())
                            .unwrap_or_default()
                    });
                results.push(FileItem {
                    display_path: display,
                    item_path: path.to_string_lossy().into_owned(),
                    item_size: size,
                });
            }
        }
    }
    results
}

#[tauri::command]
pub fn enumerate_path(path: String) -> Vec<FileItem> {
    let p = PathBuf::from(&path);
    if p.is_dir() {
        let parent = p.parent().unwrap_or(&p).to_path_buf();
        enumerate_dir(&p, &parent)
    } else if p.is_file() {
        let size = p.metadata().map(|m| m.len()).unwrap_or(0);
        let display = p
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();
        vec![FileItem {
            display_path: display,
            item_path: path,
            item_size: size,
        }]
    } else {
        vec![]
    }
}

#[tauri::command]
pub fn get_file_icon_base64(path: String) -> Option<String> {
    let icon = file_icon_provider::get_file_icon(PathBuf::from(&path), 16).ok()?;
    let image = RgbaImage::from_raw(icon.width, icon.height, icon.pixels)?;
    
    let mut buffer = std::io::Cursor::new(Vec::new());
    if image::codecs::png::PngEncoder::new(&mut buffer).write_image(
        &image,
        image.width(),
        image.height(),
        image::ExtendedColorType::Rgba8,
    ).is_err() {
        return None;
    }
    
    let base64 = STANDARD.encode(buffer.into_inner());
    Some(format!("data:image/png;base64,{}", base64))
}

#[tauri::command]
pub async fn export_to_folder(
    app: AppHandle,
    items: Vec<FileItem>,
    output_folder: String,
    is_move: bool,
) -> Result<(), String> {
    let out = PathBuf::from(&output_folder);
    ensure_dir(&out)?;

    let total = items.len() as f64;
    let mut dirs_to_prune: Vec<PathBuf> = Vec::new();

    for (i, item) in items.iter().enumerate() {
        let src = PathBuf::from(&item.item_path);
        if is_move {
            if let Some(parent) = src.parent() {
                dirs_to_prune.push(parent.to_path_buf());
            }
        }

        let rel = item.display_path.replace('/', "\\");
        let dest = out.join(&rel);
        if let Some(parent) = dest.parent() {
            ensure_dir(parent)?;
        }

        if is_move {
            if let Err(e) = fs::rename(&src, &dest) {
                if e.kind() == std::io::ErrorKind::CrossesDevices
                    || e.to_string().contains("(os error 17)")
                    || e.raw_os_error() == Some(17)
                {
                    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
                    fs::remove_file(&src).ok();
                } else {
                    return Err(e.to_string());
                }
            }
        } else {
            fs::copy(&src, &dest).map_err(|e| e.to_string())?;
        }

        let pct = ((i + 1) as f64 / total * 100.0).round() as u32;
        let _ = app.emit("export_progress", format!("{}%", pct));
    }

    if is_move {
        dirs_to_prune.sort_by_key(|p| std::cmp::Reverse(p.components().count()));
        dirs_to_prune.dedup();
        for d in dirs_to_prune {
            let mut cur = d;
            loop {
                if fs::remove_dir(&cur).is_err() {
                    break;
                }
                match cur.parent() {
                    Some(p) => cur = p.to_path_buf(),
                    None => break,
                }
            }
        }
    }

    Ok(())
}
