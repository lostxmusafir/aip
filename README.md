# City AI Portal – Setup

## Backend (FastAPI)

```bash
cd c:\Users\dream\Desktop\aip
pip install -r requirements.txt
python backend.py
```

Server `http://0.0.0.0:8000` (ya next free port) par start hoga. Terminal me port dikhega.

## Expo App (React Native)

```bash
cd c:\Users\dream\Desktop\aip\CityAIApp
npm install
npx expo start
```

Phir Expo Go app se QR scan karke phone par chalao.

### IP Address (Expo Go / phone se backend connect ke liye)

**App.js me `API_URL` update karo:**  
`CityAIApp/App.js` me line ~8 par `http://192.168.x.x:8000` ki jagah apna **computer ka Wi‑Fi IP** daalo.

**IP kaise nikale:**

- **Windows:** CMD/PowerShell me `ipconfig` chalao. **Wireless LAN adapter Wi-Fi** ke under **IPv4 Address** dekho (e.g. `192.168.1.5`).  
  API_URL = `http://192.168.1.5:8000` (port wahi jisme backend chal raha hai).
- **Mac:** System Preferences → Network → Wi‑Fi → Advanced → TCP/IP → **IP Address**.

**Zaruri:** Phone aur computer dono **same Wi‑Fi** par hon. Firewall me port 8000 allow karo (Windows: Allow an app through firewall / Python).
