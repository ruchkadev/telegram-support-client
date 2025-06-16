#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::sync::{Arc, Mutex};
use tauri::{State, Manager, WindowEvent};
use std::process::{Command, Child};

struct BotToken(Arc<Mutex<Option<String>>>);

#[tauri::command]
fn save_token(token: String, state: State<BotToken>) -> bool {
    let mut stored_token = state.0.lock().unwrap();
    *stored_token = Some(token);
    true
}

#[tauri::command]
fn get_token(state: State<BotToken>) -> Option<String> {
    let stored_token = state.0.lock().unwrap();
    stored_token.clone()
}

fn main() {
    tauri::Builder::default()
        .manage(BotToken(Arc::new(Mutex::new(None))))
        .setup(|app| {
            let child = Command::new("node")
                .arg("bot-server.js")
                .spawn()
                .expect("failed to start node bot-server.js");

            app.manage(Mutex::new(child));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![save_token, get_token])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                let app_handle = window.app_handle();
                if let Some(child_mutex) = app_handle.try_state::<Mutex<Child>>() {
                    let mut child = child_mutex.lock().unwrap();
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
