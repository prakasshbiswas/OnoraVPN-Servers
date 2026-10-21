# VPNx Server Control (Admin Portal)

A lightweight, high-performance web dashboard built with **Next.js & Node.js**, designed for deployment on **Vercel** with **Zero Database** setup.

Manage OpenVPN servers, upload `.ovpn` files downloaded from VPN Gate, auto-replace dead servers, and serve a real-time `servers.json` API directly to the **VPNx** Flutter mobile application.

---

## 🚀 Key Features

- **Zero External Database**:
  - In **Local Dev**: Reads & writes directly to `data/servers.json` on disk.
  - On **Vercel (Production)**: Auto-commits updates directly to your GitHub repository using the GitHub REST API!
- **1-Click Drag & Drop**: Drop any `.ovpn` file from VPN Gate or VPNBook.
- **Smart Auto-Parser & GeoIP**:
  - Automatically extracts Remote IP, Port, and Protocol (`TCP`/`UDP`).
  - Auto-detects Country, City, and Country Flag Emoji (🇯🇵, 🇺🇸, 🇩🇪, etc.) via GeoIP lookup.
  - Converts full OpenVPN configuration cleanly into Base64 format.
- **Automatic Server Replacement**:
  - If a server for that country already exists, it prompts to **Replace & Overwrite** the old dead server, keeping your server fleet 100% fresh with zero duplicates.
- **1-Click Delete**:
  - Remove dead or outdated servers with instant deletion modal.
- **Free vs VIP Gold Tier**:
  - Toggle servers between **Free** (open to all) and **VIP Gold** (rewarded ad lock).
- **Public API for Mobile App**:
  - `GET /api/servers` serves the exact JSON array expected by Flutter's `VpnController`.

---

## 🛠️ Quick Start (Local Run)

```bash
cd vpn-admin
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

- **Default Admin Password**: `admin123`
*(You can change this anytime in `.env.local` or environment variables)*

---

## 🌐 Deploy to Vercel (100% Free & Zero Database)

### Step 1: Push to GitHub
Commit the `vpn-admin` folder to your GitHub repository.

### Step 2: Import Project on Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your repository `VPNx-App`.
3. In **Root Directory**, click **Edit** and select: `vpn-admin`.
4. Click **Deploy**.

### Step 3: Configure Environment Variables (Zero DB Setup)
In your Vercel Project Settings → **Environment Variables**, add:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `ADMIN_PASSWORD` | `yourSecretPasswordHere` | Password to access your admin dashboard |
| `GITHUB_TOKEN` *(Optional)* | `ghp_...` | GitHub Personal Access Token (Repo scope) |
| `GITHUB_REPO` *(Optional)* | `prakasshbiswas/VPNx-App` | Your GitHub repository path |
| `GITHUB_BRANCH` *(Optional)* | `main` | Default branch to commit server updates |

> [!NOTE]
> When `GITHUB_TOKEN` is configured on Vercel, every time you upload or delete a server in the dashboard, the backend automatically commits the updated `servers.json` directly back into your GitHub repository. **No external database required!**

---

## 📱 Connecting to VPNx Flutter App

Set your live API endpoint in Flutter's `AppConfig` or `CustomServerService`:

```dart
// lib/config/app_config.dart
static const String customServersJsonUrl = 'https://your-vpn-admin.vercel.app/api/servers';
```
