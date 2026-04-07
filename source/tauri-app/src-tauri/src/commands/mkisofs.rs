use crate::models::FileItem;
use std::fs;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

#[tauri::command]
pub async fn export_to_iso(
    app: AppHandle,
    state: tauri::State<'_, crate::commands::tasks::TaskManager>,
    task_id: String,
    items: Vec<FileItem>,
    output_file: String,
) -> Result<(), String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;
    let mkisofs_path = resource_dir.join("bin").join("mkisofs.exe");

    if !mkisofs_path.exists() {
        return Err(format!(
            "mkisofs.exe not found at: {}",
            mkisofs_path.display()
        ));
    }

    let uuid_str = uuid::Uuid::new_v4().to_string();
    let graft_file = std::env::temp_dir().join(format!("discfit_graft_{}.txt", uuid_str));
    let content: String = items
        .iter()
        .map(|it| {
            let rel = it.display_path.replace('\\', "/");
            format!("{}={}\n", rel, it.item_path)
        })
        .collect();
    fs::write(&graft_file, content).map_err(|e| e.to_string())?;

    let graft_str = graft_file.to_string_lossy().into_owned();
    let mut cmd = Command::new(&mkisofs_path);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let child = cmd
        .args([
            "-J",
            "-r",
            "-graft-points",
            "-path-list",
            &graft_str,
            "-o",
            &output_file,
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn mkisofs: {}", e))?;

    // Register for cancellation
    state.register(task_id.clone(), child);

    // Re-get the child from tasks (we can't move child into the loop if we want to kill it from elsewhere easily, but here it's actually fine if we just want to watch it)
    // Actually, state.register takes ownership. We need to handle this.
    // Let's modify tasks.rs to be more flexible if needed, or just use another approach.
    // Wait, the child *must* be in the tasks hashmap if we want to kill it.
    // But we also need to read its stderr.
    
    // Better: spawn a separate thread/task to watch the child and emit progress.
    
    let tasks_arc = Arc::clone(&state.tasks);
    let app_clone = app.clone();
    let task_id_clone = task_id.clone();
    
    let handle = tokio::task::spawn_blocking(move || {
        let mut child = {
            let mut t = tasks_arc.lock().unwrap();
            t.remove(&task_id_clone).unwrap()
        };
        
        let stderr = child.stderr.take().unwrap();
        let reader = BufReader::new(stderr);
        let re = regex::Regex::new(r"(\d+\.\d+)%\s+done").unwrap();
        
        for line in reader.lines().flatten() {
            if let Some(cap) = re.captures(&line) {
                let pct = &cap[1];
                let _ = app_clone.emit("iso_progress", format!("{}%", pct));
            }
        }
        
        child.wait()
    });

    let status = handle.await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())?;
    
    let _ = fs::remove_file(&graft_file);

    if status.success() {
        Ok(())
    } else {
        Err("mkisofs exited with error (or was cancelled)".to_string())
    }
}
