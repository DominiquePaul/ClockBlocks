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
use std::path::PathBuf;
use std::env;

struct AppState {
    pkce_verifier: Mutex<Option<String>>,
}

#[derive(Serialize, Deserialize)]
struct AuthToken {
    access_token: String,
    refresh_token: String,
    expiry: u64,
}

fn get_oauth_config() -> Result<(String, String, String, String), String> {
    let client_id = env!("GOOGLE_CLIENT_ID").to_string();
    let client_secret = env!("GOOGLE_CLIENT_SECRET").to_string();
    let auth_uri = option_env!("GOOGLE_AUTH_URI").unwrap_or("https://accounts.google.com/o/oauth2/auth").to_string();
    let token_uri = option_env!("GOOGLE_TOKEN_URI").unwrap_or("https://oauth2.googleapis.com/token").to_string();

    Ok((client_id, client_secret, auth_uri, token_uri))
}


#[tauri::command]
async fn start_google_sign_in(window: tauri::Window, app_handle: tauri::AppHandle) -> Result<String, String> {
    println!("Starting Google Sign-In process");
    // let client_id = env::var("GOOGLE_CLIENT_ID").unwrap_or_else(|_| "Not set".to_string());
    // let client_secret = env::var("GOOGLE_CLIENT_SECRET").unwrap_or_else(|_| "Not set".to_string());
    // let auth_uri = env::var("GOOGLE_AUTH_URI").unwrap_or_else(|_| "Not set".to_string());
    // let token_uri = env::var("GOOGLE_TOKEN_URI").unwrap_or_else(|_| "Not set".to_string());
    // let popup_message = format!(
    //     "Client ID: {}\nClient Secret: {}\nAuth URI: {}\nToken URI: {}",
    //     client_id, client_secret, auth_uri, token_uri
    // );
    // window.eval(&format!("alert('{}');", popup_message)).unwrap();

    let (client_id, _, auth_uri, _) = get_oauth_config()?;

    let client = BasicClient::new(
        ClientId::new(client_id),
        None,
        AuthUrl::new(auth_uri).unwrap(),
        Some(TokenUrl::new("https://oauth2.googleapis.com/token".to_string()).unwrap())
    )
    .set_redirect_uri(RedirectUrl::new("http://127.0.0.1:3010/callback".to_string()).unwrap());

    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    let (auth_url, csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("https://www.googleapis.com/auth/spreadsheets".to_string()))
        .add_scope(Scope::new("https://www.googleapis.com/auth/drive".to_string()))
        .set_pkce_challenge(pkce_challenge)
        .add_extra_param("access_type", "offline")  // Add this line
        .add_extra_param("prompt", "consent")       // Add this line
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

    println!("Opening browser with URL: {}", auth_url);
    
    // Try to open the URL using the system's default browser
    if let Err(e) = shell::open(&app_handle.shell_scope(), auth_url.to_string(), None) {
        eprintln!("Failed to open browser using shell::open: {}", e);        
        
        // Fallback: Try to open the URL using the window's API
        window.emit("open-external", auth_url.to_string())
            .map_err(|e| format!("Failed to emit open-external event: {}", e))?;
    }


    println!("Waiting for code from callback");
    let code = rx.recv().map_err(|e| format!("Failed to receive code: {}", e))?;
    println!("Received code: {}", code);

    Ok(code)
}

fn get_data_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    if cfg!(debug_assertions) {
        // Development mode
        app_handle.path_resolver()
            .app_local_data_dir()
            .expect("Failed to get app local data directory")
            .join("dev_data")
    } else {
        // Production mode
        app_data_dir(&app_handle.config())
            .expect("Failed to get app data directory")
    }
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
    let data_dir = get_data_dir(&app_handle);
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let token_path = data_dir.join("auth_token.json");
    let file = File::create(token_path).map_err(|e| e.to_string())?;
    serde_json::to_writer(file, &auth_token).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn load_auth_token(app_handle: tauri::AppHandle) -> Result<Option<AuthToken>, String> {
    let data_dir = get_data_dir(&app_handle);
    let token_path = data_dir.join("auth_token.json");
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
    if let Some(token) = load_auth_token(app_handle.clone()).await? {
        let now = Utc::now().timestamp() as u64;
        if now >= token.expiry {
            // Token is expired, try to refresh it
            match refresh_token(app_handle).await {
                Ok(_) => Ok(true),
                Err(_) => Ok(false)
            }
        } else {
            Ok(true)
        }
    } else {
        Ok(false)
    }
}

#[tauri::command]
async fn exchange_code_for_tokens(_window: tauri::Window, app_handle: tauri::AppHandle, code: String) -> Result<AuthToken, String> {
    println!("Exchanging code for tokens...");
    
    let (client_id, client_secret, _, token_uri) = get_oauth_config()?;

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

    let (client_id, client_secret, auth_uri, token_uri) = get_oauth_config()?;

    let client = BasicClient::new(
        ClientId::new(client_id),
        Some(ClientSecret::new(client_secret)),
        AuthUrl::new(auth_uri).unwrap(),
        Some(TokenUrl::new(token_uri).unwrap())
    );

    let token_result = client
        .exchange_refresh_token(&RefreshToken::new(current_token.refresh_token.clone()))
        .request_async(async_http_client)
        .await
        .map_err(|e| format!("Failed to refresh token: {}", e))?;

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
async fn save_sheet_id(app_handle: tauri::AppHandle, sheet_id: String) -> Result<(), String> {
    let data_dir = get_data_dir(&app_handle);
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let path = data_dir.join("sheet_id.txt");
    fs::write(path, sheet_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_sheet_id(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let data_dir = get_data_dir(&app_handle);
    let path = data_dir.join("sheet_id.txt");
    if path.exists() {
        fs::read_to_string(path).map(Some).map_err(|e| e.to_string())
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn get_or_create_new_sheet(app_handle: tauri::AppHandle, title: String) -> Result<String, String> {
    // Try to load existing sheet ID
    if let Some(sheet_id) = load_sheet_id(app_handle.clone()).await? {
        // Check if the sheet still exists
        let mut auth_token = load_auth_token(app_handle.clone()).await?
            .ok_or("No auth token found")?;

        // Check if token is expired and refresh if necessary
        if Utc::now().timestamp() as u64 >= auth_token.expiry {
            auth_token = refresh_token(app_handle.clone()).await?;
        }

        let client = Client::new();
        let response = client
            .get(&format!("https://sheets.googleapis.com/v4/spreadsheets/{}", sheet_id))
            .bearer_auth(&auth_token.access_token)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            return Ok(sheet_id);
        }
    }

    // If we reach here, we need to create a new sheet
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

    // Rename the default "Sheet1" to "DetailsSessions"
    let rename_request = json!({
        "requests": [{
            "updateSheetProperties": {
                "properties": {
                    "sheetId": 0,
                    "title": "SummaryByDate"
                },
                "fields": "title"
            }
        }]
    });

    let rename_response = client
        .post(&format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{}:batchUpdate",
            spreadsheet_id
        ))
        .bearer_auth(&auth_token.access_token)
        .json(&rename_request)
        .send()
        .await
        .map_err(|e| format!("Failed to rename default sheet: {}", e))?;

    if !rename_response.status().is_success() {
        println!("Failed to rename default sheet: {}", rename_response.status());
        let error_body = rename_response.text().await.unwrap_or_default();
        println!("Error details: {}", error_body);
    } else {
        println!("Successfully renamed default sheet to SummaryByDate");
    }

    // Create the other three sheets
    let other_sheets = ["SummaryBySession", "DetailsSessions", "DetailsSessionEvents"];
    for sheet_name in other_sheets.iter() {
        let add_sheet_request = json!({
            "requests": [{
                "addSheet": {
                    "properties": {
                        "title": sheet_name
                    }
                }
            }]
        });

        let add_sheet_response = client
            .post(&format!(
                "https://sheets.googleapis.com/v4/spreadsheets/{}:batchUpdate",
                spreadsheet_id
            ))
            .bearer_auth(&auth_token.access_token)
            .json(&add_sheet_request)
            .send()
            .await
            .map_err(|e| format!("Failed to create sheet {}: {}", sheet_name, e))?;

        if !add_sheet_response.status().is_success() {
            println!("Failed to create sheet {}: {}", sheet_name, add_sheet_response.status());
            let error_body = add_sheet_response.text().await.unwrap_or_default();
            println!("Error details: {}", error_body);
        } else {
            println!("Successfully created sheet: {}", sheet_name);
        }
    }

    // Save the new sheet ID
    save_sheet_id(app_handle, spreadsheet_id.clone()).await?;

    Ok(spreadsheet_id)
}

#[tauri::command]
async fn create_sheet_if_not_exists(
    app_handle: tauri::AppHandle,
    spreadsheet_id: String,
    sheet_name: String,
) -> Result<(), String> {
    let mut auth_token = load_auth_token(app_handle.clone()).await?
        .ok_or("No auth token found")?;

    // Check if token is expired and refresh if necessary
    if Utc::now().timestamp() as u64 >= auth_token.expiry {
        auth_token = refresh_token(app_handle.clone()).await?;
    }

    let client = Client::new();
    let request_body = json!({
        "requests": [{
            "addSheet": {
                "properties": {
                    "title": sheet_name
                }
            }
        }]
    });

    let response = client
        .post(&format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{}:batchUpdate",
            spreadsheet_id
        ))
        .bearer_auth(&auth_token.access_token)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e.to_string()))?;

    let status = response.status();
    if !status.is_success() {
        let error_body = response.text().await.map_err(|e| e.to_string())?;
        // If the error is not because the sheet already exists, return an error
        if !error_body.contains("already exists") {
            return Err(format!("Failed to create sheet: {} - {}", status, error_body));
        }
    }

    Ok(())
}

#[tauri::command]
async fn write_data_to_sheet(
    app_handle: tauri::AppHandle,
    sheet_id: String,
    sheet_name: String,
    data: Vec<Vec<String>>
) -> Result<(), String> {
    // First, try to create the sheet (this will do nothing if it already exists)
    create_sheet_if_not_exists(app_handle.clone(), sheet_id.clone(), sheet_name.clone()).await?;

    let mut auth_token = load_auth_token(app_handle.clone()).await?
        .ok_or("No auth token found")?;

    // Check if token is expired and refresh if necessary
    if Utc::now().timestamp() as u64 >= auth_token.expiry {
        auth_token = refresh_token(app_handle.clone()).await?;
    }

    let client = Client::new();
    let request_body = json!({
        "values": data,
    });

    // Make the API request to update the sheet
    let response = client
        .put(&format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}!A1?valueInputOption=USER_ENTERED",
            sheet_id,
            sheet_name
        ))
        .bearer_auth(&auth_token.access_token)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e.to_string()))?;

    let status = response.status();
    if !status.is_success() {
        let error_body = response.text().await.map_err(|e| e.to_string())?;
        return Err(format!("Failed to write to sheet: {} - {}", status, error_body));
    }

    Ok(())
}

#[tauri::command]
async fn get_sheet_id(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    load_sheet_id(app_handle).await
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            // Set up a handler for the "open-external" event
            let handle = app.handle();
            let handle_clone = handle.clone();
            handle.listen_global("open-external", move |event| {
                if let Some(url) = event.payload() {
                    let _ = shell::open(&handle_clone.shell_scope(), url, None);
                }
            });

            let app_state = Arc::new(AppState {
                pkce_verifier: Mutex::new(None),
            });

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
            get_or_create_new_sheet,
            save_sheet_id,
            load_sheet_id,
            write_data_to_sheet,
            create_sheet_if_not_exists,
            get_sheet_id,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}