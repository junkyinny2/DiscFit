use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct FileItem {
    pub display_path: String,
    pub item_path: String,
    pub item_size: u64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Bin {
    pub size: u64,
    pub items: Vec<FileItem>,
}

#[derive(Serialize, Deserialize)]
pub struct PackResult {
    pub bins: Vec<Bin>,
    pub oversized: Vec<FileItem>,
}
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Plugin {
    pub name: String,
    pub executable: String,
    pub args: Option<Vec<String>>,
    pub description: Option<String>,
}
