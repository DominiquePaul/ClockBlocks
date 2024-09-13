// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]


use tauri::Manager;
use serde_json::Value;
use std::fs;
use tauri::api::shell;
use tiny_http::{Server, Response};
use std::sync::mpsc::channel;
use std::thread;
use tauri::api::path::app_data_dir;
use std::fs::File;
use std::io::Read;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use reqwest::Client;
use oauth2::{
    AuthUrl, ClientId, CsrfToken, PkceCodeChallenge, RedirectUrl, Scope, TokenUrl,
    ClientSecret, RefreshToken, TokenResponse,
};
use oauth2::basic::BasicClient;
use url::Url;
use oauth2::reqwest::async_http_client;
use std::sync::{Arc, Mutex};
use serde_json::json;

struct AppState {
    pkce_verifier: Mutex<Option<String>>,
}

#[derive(Serialize, Deserialize)]
struct AuthToken {
    access_token: String,
    refresh_token: String,
    expiry: u64,
}

#[tauri::command]
async fn start_google_sign_in(window: tauri::Window, app_handle: tauri::AppHandle) -> Result<String, String> {
    let config: Value = serde_json::from_str(
        &fs::read_to_string("resources/google_client_secret.json").expect("Failed to read config file")
    ).expect("Failed to parse JSON");

    let installed = config["installed"].as_object().expect("Invalid config format");
    let client_id = installed["client_id"].as_str().expect("Client ID not found");

    let client = BasicClient::new(
        ClientId::new(client_id.to_string()),
        None,
        AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string()).unwrap(),
        Some(TokenUrl::new("https://oauth2.googleapis.com/token".to_string()).unwrap())
    )
    .set_redirect_uri(RedirectUrl::new("http://127.0.0.1:3010/callback".to_string()).unwrap());

    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    let (auth_url, csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("https://www.googleapis.com/auth/spreadsheets".to_string()))
        .set_pkce_challenge(pkce_challenge)
        .url();

    // Store PKCE verifier
    let state: tauri::State<Arc<AppState>> = app_handle.state();
    if let Ok(mut verifier) = state.pkce_verifier.lock() {
        *verifier = Some(pkce_verifier.secret().to_string());
    } else {
        return Err("Failed to store PKCE verifier".to_string());
    }

    // Store CSRF token and PKCE verifier for later use
    // You might want to use a more secure storage method
    window.set_title(&csrf_token.secret()).unwrap();
    
    // Start a local server to handle the callback
    let (tx, rx) = channel();
    thread::spawn(move || {
        let server = Server::http("127.0.0.1:3010").unwrap();
        for request in server.incoming_requests() {
            let url = format!("http://127.0.0.1:3010{}", request.url());
            let parsed_url = Url::parse(&url).unwrap();
            let code = parsed_url.query_pairs()
                .find(|(key, _)| key == "code")
                .map(|(_, value)| value.into_owned());
            
            if let Some(code) = code {
                let _ = tx.send(code);
                let response = Response::from_string("Authentication successful! You can close this window.");
                let _ = request.respond(response);
                break;
            }
        }
    });

    // Open the default browser with the sign-in URL
    shell::open(&window.shell_scope(), auth_url.to_string(), None)
        .map_err(|e| format!("Failed to open browser: {}", e.to_string()))?;

    // Wait for the code from the callback
    let code = rx.recv().map_err(|e| format!("Failed to receive code: {}", e))?;

    Ok(code)
}

#[tauri::command]
async fn save_auth_token(
    app_handle: tauri::AppHandle,
    access_token: String,
    refresh_token: String,
    expiry: u64,
) -> Result<(), String> {
    let auth_token = AuthToken {
        access_token,
        refresh_token,
        expiry,
    };
    let token_path = app_data_dir(&app_handle.config()).unwrap().join("auth_token.json");
    let file = File::create(token_path).map_err(|e| e.to_string())?;
    serde_json::to_writer(file, &auth_token).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn load_auth_token(app_handle: tauri::AppHandle) -> Result<Option<AuthToken>, String> {
    let token_path = app_data_dir(&app_handle.config()).unwrap().join("auth_token.json");
    if !token_path.exists() {
        return Ok(None);
    }
    let mut file = File::open(token_path).map_err(|e| e.to_string())?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).map_err(|e| e.to_string())?;
    let auth_token: AuthToken = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
    Ok(Some(auth_token))
}

#[tauri::command]
async fn check_auth_token(app_handle: tauri::AppHandle) -> Result<bool, String> {
    if let Some(token) = load_auth_token(app_handle).await? {
        let now = Utc::now().timestamp() as u64;
        Ok(now < token.expiry)
    } else {
        Ok(false)
    }
}

#[tauri::command]
async fn exchange_code_for_tokens(_window: tauri::Window, app_handle: tauri::AppHandle, code: String) -> Result<AuthToken, String> {
    println!("Exchanging code for tokens...");
    let config: Value = serde_json::from_str(
        &fs::read_to_string("resources/google_client_secret.json").expect("Failed to read config file")
    ).expect("Failed to parse JSON");

    let installed = config["installed"].as_object().expect("Invalid config format");
    let client_id = installed["client_id"].as_str().expect("Client ID not found");
    let client_secret = installed["client_secret"].as_str().expect("Client secret not found");
    let token_uri = installed["token_uri"].as_str().expect("Token URI not found");

    println!("Client ID: {}", client_id);
    println!("Token URI: {}", token_uri);

    // Retrieve PKCE verifier
    let state: tauri::State<Arc<AppState>> = app_handle.state();
    let pkce_verifier = state.pkce_verifier.lock()
        .map_err(|_| "Failed to lock PKCE verifier".to_string())?
        .take()
        .ok_or("PKCE verifier not found")?;

    let client = Client::new();
    let params = [
        ("code", code.clone()),
        ("client_id", client_id.to_string()),
        ("client_secret", client_secret.to_string()),
        ("redirect_uri", "http://127.0.0.1:3010/callback".to_string()),
        ("grant_type", "authorization_code".to_string()),
        ("code_verifier", pkce_verifier),
    ];

    println!("Sending request to token endpoint...");
    let res = client.post(token_uri)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e.to_string()))?;

    println!("Response status: {}", res.status());
    let body = res.text().await.map_err(|e| format!("Failed to read response body: {}", e.to_string()))?;
    println!("Response body: {}", body);

    let token_response: Value = serde_json::from_str(&body).map_err(|e| format!("Failed to parse JSON response: {}", e.to_string()))?;

    if let Some(error) = token_response.get("error") {
        return Err(format!("Error exchanging code for tokens: {} ({})", 
            error, 
            token_response.get("error_description").and_then(|v| v.as_str()).unwrap_or("No description")
        ));
    }

    let access_token = token_response["access_token"].as_str()
        .ok_or("Access token not found in response")?
        .to_string();
    let refresh_token = token_response["refresh_token"].as_str()
        .ok_or("Refresh token not found in response")?
        .to_string();
    let expires_in = token_response["expires_in"].as_u64()
        .ok_or("Expires in not found in response")?;

    let now = chrono::Utc::now();
    let expiry = now.timestamp() as u64 + expires_in;

    Ok(AuthToken {
        access_token,
        refresh_token,
        expiry,
    })
}

#[tauri::command]
async fn refresh_token(app_handle: tauri::AppHandle) -> Result<AuthToken, String> {
    let current_token = load_auth_token(app_handle.clone()).await?
        .ok_or("No token found")?;

    let config: Value = serde_json::from_str(
        &fs::read_to_string("resources/google_client_secret.json").expect("Failed to read config file")
    ).expect("Failed to parse JSON");

    let installed = config["installed"].as_object().expect("Invalid config format");
    let client_id = installed["client_id"].as_str().expect("Client ID not found");
    let client_secret = installed["client_secret"].as_str().expect("Client secret not found");

    let client = BasicClient::new(
        ClientId::new(client_id.to_string()),
        Some(ClientSecret::new(client_secret.to_string())),
        AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string()).unwrap(),
        Some(TokenUrl::new("https://oauth2.googleapis.com/token".to_string()).unwrap())
    );

    let token_result = client
        .exchange_refresh_token(&RefreshToken::new(current_token.refresh_token.clone()))
        .request_async(async_http_client)
        .await
        .map_err(|e| e.to_string())?;

    let new_token = AuthToken {
        access_token: token_result.access_token().secret().to_string(),
        refresh_token: token_result.refresh_token()
            .map(|rt| rt.secret().to_string())
            .unwrap_or_else(|| current_token.refresh_token.clone()),
        expiry: Utc::now().timestamp() as u64 + token_result.expires_in().unwrap_or_default().as_secs(),
    };

    save_auth_token(app_handle, new_token.access_token.clone(), new_token.refresh_token.clone(), new_token.expiry).await?;

    Ok(new_token)
}

#[tauri::command]
fn is_dev() -> bool {
    cfg!(debug_assertions)
}

#[tauri::command]
async fn create_new_sheet(app_handle: tauri::AppHandle, title: String) -> Result<String, String> {
    let mut auth_token = load_auth_token(app_handle.clone()).await?
        .ok_or("No auth token found")?;

    // Check if token is expired and refresh if necessary
    if Utc::now().timestamp() as u64 >= auth_token.expiry {
        auth_token = refresh_token(app_handle.clone()).await?;
    }

    let client = Client::new();
    let response = client
        .post("https://sheets.googleapis.com/v4/spreadsheets")
        .bearer_auth(&auth_token.access_token)
        .json(&json!({
            "properties": {
                "title": title
            }
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to create sheet: {}", response.status()));
    }

    let sheet_data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let spreadsheet_id = sheet_data["spreadsheetId"]
        .as_str()
        .ok_or("Spreadsheet ID not found in response")?
        .to_string();

    Ok(spreadsheet_id)
}

fn main() {
    let app_state = Arc::new(AppState {
        pkce_verifier: Mutex::new(None),
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {       
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_google_sign_in,
            save_auth_token,
            load_auth_token,
            check_auth_token,
            exchange_code_for_tokens,
            refresh_token,
            is_dev,
            create_new_sheet
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
