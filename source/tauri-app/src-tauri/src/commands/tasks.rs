use std::collections::HashMap;
use std::process::Child;
use std::sync::{Arc, Mutex};

pub struct TaskManager {
    pub tasks: Arc<Mutex<HashMap<String, Child>>>,
}

impl TaskManager {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn register(&self, id: String, child: Child) {
        let mut tasks = self.tasks.lock().unwrap();
        tasks.insert(id, child);
    }

    pub fn unregister(&self, id: &str) {
        let mut tasks = self.tasks.lock().unwrap();
        tasks.remove(id);
    }

    pub fn cancel(&self, id: &str) -> Result<(), String> {
        let mut tasks = self.tasks.lock().unwrap();
        if let Some(mut child) = tasks.remove(id) {
            child.kill().map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

#[tauri::command]
pub fn cancel_task(state: tauri::State<TaskManager>, id: String) -> Result<(), String> {
    state.cancel(&id)
}
