import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import Database from "better-sqlite3";

// Initialize Database
const db = new Database("bullion.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    rate REAL NOT NULL,
    quantity INTEGER DEFAULT 1,
    total_amount REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const parser = new XMLParser();

  app.use(express.json());

  // API Route to proxy the SLN Bullion request
  app.get("/api/rates", async (req, res) => {
    try {
      const response = await axios.get(
        "https://bcast.slnbullion.com/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/sln",
        {
          params: {
            _: Date.now(), // Cache busting
          },
          headers: {
            "accept": "text/plain, */*; q=0.01",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "cache-control": "no-cache",
            "origin": "https://slnbullion.in",
            "pragma": "no-cache",
            "priority": "u=1, i",
            "referer": "https://slnbullion.in/",
            "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
          },
          responseType: 'text' // Expecting XML/Text
        }
      );

      // Parse the tab-separated text data
      let parsedData = [];
      if (typeof response.data === 'string') {
        const lines = response.data.split('\r\n');
        parsedData = lines
          .map(line => {
            const parts = line.split('\t');
            // Check if line has enough parts (based on the sample provided)
            // Sample: "\t137\tGold($).\t5278.45\t5279.15\t5280.80\t5166.58\t"
            // Parts indices: 0="", 1=ID, 2=Name, 3=Bid, 4=Ask, 5=High, 6=Low
            if (parts.length >= 7 && parts[1] && parts[2]) {
              return {
                id: parts[1],
                name: parts[2],
                bid: parts[3],
                ask: parts[4],
                high: parts[5],
                low: parts[6]
              };
            }
            return null;
          })
          .filter(item => item !== null);
      }

      res.json(parsedData);
    } catch (error) {
      console.error("Error fetching rates:", error);
      res.status(500).json({ error: "Failed to fetch rates" });
    }
  });

  // Order Endpoints
  app.get("/api/orders", (req, res) => {
    try {
      const orders = db.prepare("SELECT * FROM orders ORDER BY timestamp DESC").all();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", (req, res) => {
    try {
      const { item_name, rate, quantity, total_amount } = req.body;
      
      // If total_amount is not provided, fallback to simple multiplication (though frontend should provide it for 10g logic)
      const final_amount = total_amount !== undefined ? total_amount : rate * quantity;
      
      const stmt = db.prepare("INSERT INTO orders (item_name, rate, quantity, total_amount) VALUES (?, ?, ?, ?)");
      const info = stmt.run(item_name, rate, quantity, final_amount);
      
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (error) {
      console.error("Error placing order:", error);
      res.status(500).json({ error: "Failed to place order" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving (placeholder for now, as we are in dev)
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
