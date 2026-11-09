@echo off
cd /d "C:\Users\yacine\OneDrive\Desktop\habit tracer"
start "" /b node server/index.js
start "" /b npx vite --host 0.0.0.0 --port 5173
start "" /b "C:\Users\yacine\Downloads\cloudflared.exe" tunnel --logfile C:\Users\yacine\cloudflared_tunnel.log --url http://localhost:5173
