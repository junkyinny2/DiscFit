use crate::models::FileItem;
use std::fs;
use std::path::PathBuf;

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

struct DirNode {
    sub_dirs: std::collections::BTreeMap<String, DirNode>,
    files: Vec<(String, String)>, // (name, abs_path)
}

impl DirNode {
    fn new() -> Self {
        DirNode {
            sub_dirs: std::collections::BTreeMap::new(),
            files: Vec::new(),
        }
    }

    fn to_xml(&self, name: &str, indent: usize) -> String {
        let pad = "  ".repeat(indent);
        let mut out = format!("{}<dir name=\"{}\">\r\n", pad, escape_xml(name));
        for (dir_name, node) in &self.sub_dirs {
            out.push_str(&node.to_xml(dir_name, indent + 1));
        }
        for (fname, fpath) in &self.files {
            out.push_str(&format!(
                "{}  <file name=\"{}\" path=\"{}\" />\r\n",
                pad,
                escape_xml(fname),
                escape_xml(fpath)
            ));
        }
        out.push_str(&format!("{}</dir>\r\n", pad));
        out
    }
}

#[tauri::command]
pub fn export_to_dxp(items: Vec<FileItem>, output_file: String) -> Result<(), String> {
    let mut root = DirNode::new();

    for item in &items {
        let src = &item.item_path;
        let display = item.display_path.replace('/', "\\");
        let parts: Vec<&str> = display.split('\\').collect();
        let (dirs, file_name) = parts.split_at(parts.len().saturating_sub(1));

        let mut node = &mut root;
        for dir in dirs {
            if !dir.is_empty() {
                node = node
                    .sub_dirs
                    .entry(dir.to_string())
                    .or_insert_with(DirNode::new);
            }
        }
        if let Some(name) = file_name.first() {
            node.files.push((name.to_string(), src.clone()));
        }
    }

    let disc_name = PathBuf::from(&output_file)
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "DiscFit".to_string());

    let mut xml = String::from("<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\"?>\r\n");
    xml.push_str(&format!(
        "<compilation name=\"{}\">\r\n  <layout>\r\n",
        escape_xml(&disc_name)
    ));
    xml.push_str(&root.to_xml("\\", 2));
    xml.push_str("  </layout>\r\n</compilation>\r\n");

    fs::write(&output_file, xml).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_to_ibb(items: Vec<FileItem>, output_file: String) -> Result<(), String> {
    let mut txt = String::from(
        "IBB\r\n\r\n[START_BACKUP_OPTIONS]\r\n\
BuildInputMode=2\r\nBuildOutputMode=2\r\nDestination=\r\nDataType=0\r\n\
FileSystem=3\r\nUDFRevision=0\r\nPreserveFullPathnames=0\r\nRecurseSubdirectories=1\r\n\
IncludeHiddenFiles=0\r\nIncludeSystemFiles=0\r\nIncludeArchiveFilesOnly=0\r\n\
AddToWriteQueueWhenDone=0\r\nClearArchiveAttribute=0\r\nDates_FolderFileType=0\r\n\
[END_BACKUP_OPTIONS]\r\n\r\n[START_BACKUP_LIST]\r\n",
    );

    for item in &items {
        let src = &item.item_path;
        let display = item.display_path.replace('/', "\\");
        let name = PathBuf::from(&display)
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();
        let dir_part = PathBuf::from(&display)
            .parent()
            .map(|p| {
                let s = p.to_string_lossy().into_owned();
                if s.is_empty() || s == "." {
                    String::from("\\")
                } else {
                    format!("\\{}\\", s)
                }
            })
            .unwrap_or_else(|| String::from("\\"));
        txt.push_str(&format!("F|{}|{}|{}\r\n", name, dir_part, src));
    }

    txt.push_str("[END_BACKUP_LIST]\r\n");
    fs::write(&output_file, txt).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_to_text(items: Vec<FileItem>, output_file: String) -> Result<(), String> {
    let lines: String = items
        .iter()
        .map(|it| format!("{}\r\n", it.item_path))
        .collect();
    fs::write(&output_file, lines).map_err(|e| e.to_string())
}
