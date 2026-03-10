use std::fs;
use std::path::Path;

use tauri::Manager;

#[tauri::command]
fn import_sqlite_database(app: tauri::AppHandle, file_name: String, bytes: Vec<u8>) -> Result<String, String> {
    let safe_file_name = sanitize_file_name(&file_name)?;
    let app_config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;

    fs::create_dir_all(&app_config_dir).map_err(|error| error.to_string())?;

    let database_path = app_config_dir.join(&safe_file_name);
    if database_path.exists() {
        return Err(format!("Il file '{}' esiste gia'.", safe_file_name));
    }

    fs::write(database_path, bytes).map_err(|error| error.to_string())?;

    Ok(safe_file_name)
}

#[tauri::command]
fn get_sqlite_storage_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_config_dir()
        .map(|path| path.display().to_string())
        .map_err(|error| error.to_string())
}

fn sanitize_file_name(file_name: &str) -> Result<String, String> {
    let candidate = file_name.trim();
    if candidate.is_empty() {
        return Err("Inserisci un nome file valido.".into());
    }

    let plain_name = Path::new(candidate)
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Nome file non valido.".to_string())?;

    if plain_name.starts_with('.') {
        return Err("Il nome file non puo' iniziare con un punto.".into());
    }

    if !plain_name
        .chars()
        .all(|char| char.is_ascii_alphanumeric() || matches!(char, '.' | '-' | '_'))
    {
        return Err("Usa solo lettere, numeri, trattino, underscore e punto.".into());
    }

    Ok(plain_name.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            import_sqlite_database,
            get_sqlite_storage_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
