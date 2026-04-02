use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Serialize, Deserialize)]
pub struct PingResult {
    pub url: String,
    pub status: String,
    pub status_code: u16,
    pub response_time: u64,
    pub timestamp: u64,
}

#[derive(Serialize, Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub headers: std::collections::HashMap<String, String>,
    pub body: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: std::collections::HashMap<String, String>,
    pub body: String,
    pub time: u64,
}

#[tauri::command]
async fn ping_url(url: String) -> Result<PingResult, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let start = Instant::now();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    match client.get(&url).send().await {
        Ok(resp) => {
            let elapsed = start.elapsed().as_millis() as u64;
            let status_code = resp.status().as_u16();
            let status = if status_code >= 200 && status_code < 400 {
                "online".to_string()
            } else if status_code >= 400 && status_code < 500 {
                "degraded".to_string()
            } else {
                "offline".to_string()
            };
            Ok(PingResult {
                url,
                status,
                status_code,
                response_time: elapsed,
                timestamp,
            })
        }
        Err(e) => Ok(PingResult {
            url,
            status: "offline".to_string(),
            status_code: 0,
            response_time: start.elapsed().as_millis() as u64,
            timestamp,
        }),
    }
}

#[tauri::command]
async fn send_http_request(request: HttpRequest) -> Result<HttpResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let start = Instant::now();

    let method = match request.method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH" => reqwest::Method::PATCH,
        "HEAD" => reqwest::Method::HEAD,
        "OPTIONS" => reqwest::Method::OPTIONS,
        _ => return Err("Invalid method".to_string()),
    };

    let mut req_builder = client.request(method, &request.url);
    for (key, value) in &request.headers {
        req_builder = req_builder.header(key, value);
    }
    if let Some(body) = &request.body {
        req_builder = req_builder.body(body.clone());
    }

    match req_builder.send().await {
        Ok(resp) => {
            let elapsed = start.elapsed().as_millis() as u64;
            let status = resp.status().as_u16();
            let status_text = resp.status().canonical_reason().unwrap_or("Unknown").to_string();
            let headers: std::collections::HashMap<String, String> = resp
                .headers()
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
                .collect();
            let body = resp.text().await.unwrap_or_default();
            Ok(HttpResponse {
                status,
                status_text,
                headers,
                body,
                time: elapsed,
            })
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn run_script(command: String, shell: String) -> Result<String, String> {
    let output = if cfg!(target_os = "windows") {
        tokio::process::Command::new(if shell == "powershell" { "powershell" } else { "cmd" })
            .args(if shell == "powershell" {
                vec!["-Command", &command]
            } else {
                vec!["/C", &command]
            })
            .output()
            .await
    } else {
        tokio::process::Command::new(if shell == "zsh" { "zsh" } else { "bash" })
            .args(["-c", &command])
            .output()
            .await
    };

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if !stderr.is_empty() && stdout.is_empty() {
                Ok(format!("[stderr]\n{}", stderr))
            } else if !stderr.is_empty() {
                Ok(format!("{}\n[stderr]\n{}", stdout, stderr))
            } else {
                Ok(stdout)
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            ping_url,
            send_http_request,
            run_script
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
