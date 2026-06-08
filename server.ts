import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_PLOTS } from './src/defaultData.js';
import { Plot, Booking } from './src/types.js';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  console.log(`DEBUG REQUEST: ${req.method} ${req.url}`);
  next();
});

// Catch-all for 404 to debug where they originate
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode === 404) {
      console.log(`404 NOT FOUND: ${req.method} ${req.url}`);
    }
  });
  next();
});

// Directories
const DATA_DIR = path.join(process.cwd(), 'data');
const PLOTS_FILE = path.join(DATA_DIR, 'plots.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const LAYOUT_SETTINGS_FILE = path.join(DATA_DIR, 'layout_settings.json');
const CUSTOM_IMAGE_FILE = path.join(DATA_DIR, 'uploaded_layout.png');
const DEFAULT_LAYOUT_URL = 'https://res.cloudinary.com/dj4jk7z93/image/upload/f_auto,q_auto/uploaded_layout_urvgc4';

// Ensure data directory and files exist
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(PLOTS_FILE)) {
    fs.writeFileSync(PLOTS_FILE, JSON.stringify(DEFAULT_PLOTS, null, 2), 'utf-8');
    console.log('Seeded plots.json with default plots.');
  }

  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2), 'utf-8');
    console.log('Created empty bookings.json.');
  }

  if (!fs.existsSync(LAYOUT_SETTINGS_FILE)) {
    fs.writeFileSync(LAYOUT_SETTINGS_FILE, JSON.stringify({
      activeLayout: 'custom',
      imageMimeType: '',
      width: 800,
      height: 500
    }, null, 2), 'utf-8');
    console.log('Created default layout_settings.json.');
  }
}

initDatabase();

// Helper database functions
function readPlots(): Plot[] {
  try {
    initDatabase();
    const content = fs.readFileSync(PLOTS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading plots:', err);
    return DEFAULT_PLOTS;
  }
}

function writePlots(plots: Plot[]) {
  try {
    initDatabase();
    fs.writeFileSync(PLOTS_FILE, JSON.stringify(plots, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing plots:', err);
  }
}

function readBookings(): Booking[] {
  try {
    initDatabase();
    const content = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading bookings:', err);
    return [];
  }
}

function writeBookings(bookings: Booking[]) {
  try {
    initDatabase();
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing bookings:', err);
  }
}

// REST APIs
// 1. Get all plots (with state filtering)
app.get('/api/plots', (req, res) => {
  const plots = readPlots();
  res.json(plots);
});

// 2. Add/Create a plot
app.post('/api/plots', (req, res) => {
  const plots = readPlots();
  const newPlot: Plot = req.body;
  
  if (!newPlot.plotNumber || !newPlot.area || !newPlot.price) {
    return res.status(400).json({ error: 'Missing required plot fields: plotNumber, area, price' });
  }

  // Ensure unique plot number
  if (plots.some(p => p.plotNumber.toUpperCase() === newPlot.plotNumber.toUpperCase())) {
    return res.status(400).json({ error: `Plot with number ${newPlot.plotNumber} already exists` });
  }

  // Generate ID if not provided
  if (!newPlot.id) {
    newPlot.id = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  }

  plots.push(newPlot);
  writePlots(plots);
  res.status(201).json(newPlot);
});

// 3. Edit/Update a plot
app.put('/api/plots/:id', (req, res) => {
  const plots = readPlots();
  const { id } = req.params;
  const updateFields = req.body;

  const idx = plots.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Plot not found' });
  }

  // Update plot
  const updatedPlot = { ...plots[idx], ...updateFields };
  plots[idx] = updatedPlot;
  writePlots(plots);

  res.json(updatedPlot);
});

// 4. Delete a plot
app.delete('/api/plots/:id', (req, res) => {
  const plots = readPlots();
  const idToMatch = req.params.id.trim();
  
  console.log("DELETE /api/plots/:id called with id:", idToMatch);
  console.log("Plots IDs currently available:", plots.map(p => p.id));

  const filtered = plots.filter(p => p.id.trim() !== idToMatch);
  if (filtered.length === plots.length) {
    console.log("Plot NOT FOUND with id:", idToMatch);
    return res.status(404).json({ error: 'Plot not found' });
  }

  writePlots(filtered);
  res.json({ success: true, message: `Plot ${idToMatch} successfully deleted.` });
});

// 5. Get all bookings
app.get('/api/bookings', (req, res) => {
  const bookings = readBookings();
  res.json(bookings);
});

// 6. Create a new booking
app.post('/api/bookings', (req, res) => {
  const bookings = readBookings();
  const plots = readPlots();
  const bookingData = req.body;

  const { plotId, customerName, customerEmail, customerPhone, pricePaid, notes } = bookingData;
  if (!plotId || !customerName || !customerEmail || !customerPhone) {
    return res.status(400).json({ error: 'Missing customer booking fields' });
  }

  const plotIndex = plots.findIndex(p => p.id === plotId);
  if (plotIndex === -1) {
    return res.status(404).json({ error: 'Selected plot was not found.' });
  }

  // Generate Booking
  const newBooking: Booking = {
    id: 'b_' + Date.now(),
    plotId,
    plotNumber: plots[plotIndex].plotNumber,
    customerName,
    customerEmail,
    customerPhone,
    bookingDate: new Date().toISOString(),
    status: 'confirmed',
    pricePaid: pricePaid || plots[plotIndex].price,
    notes
  };

  bookings.push(newBooking);
  writeBookings(bookings);

  // Update Plot Status to 'booked' or 'ongoing' depending on form selection
  plots[plotIndex].status = req.body.plotStatus || 'booked';
  writePlots(plots);

  res.status(201).json({ booking: newBooking, plot: plots[plotIndex] });
});

// 7. Update booking status
app.put('/api/bookings/:id/status', (req, res) => {
  const bookings = readBookings();
  const plots = readPlots();
  const { id } = req.params;
  const { status } = req.body; // 'pending' | 'confirmed' | 'cancelled'

  const bIdx = bookings.findIndex(b => b.id === id);
  if (bIdx === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const booking = bookings[bIdx];
  booking.status = status;
  bookings[bIdx] = booking;
  writeBookings(bookings);

  // If building or plot needs status updates
  if (status === 'cancelled') {
    // Revert plot to available
    const pIdx = plots.findIndex(p => p.id === booking.plotId);
    if (pIdx !== -1) {
      plots[pIdx].status = 'available';
      writePlots(plots);
    }
  } else if (status === 'confirmed') {
    const pIdx = plots.findIndex(p => p.id === booking.plotId);
    if (pIdx !== -1) {
      plots[pIdx].status = 'booked';
      writePlots(plots);
    }
  }

  res.json({ success: true, booking });
});

// 8. Delete booking
app.delete('/api/bookings/:id', (req, res) => {
  const bookings = readBookings();
  const { id } = req.params;
  const filtered = bookings.filter(b => b.id !== id);
  writeBookings(filtered);
  res.json({ success: true });
});

// 9. Bulk import plots via CSV / JSON
app.post('/api/plots/bulk-import', (req, res) => {
  const { list } = req.body;
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: 'Missing or invalid list parameter (must be an array)' });
  }

  const plots = readPlots();
  let addedCount = 0;
  let updatedCount = 0;

  for (const item of list) {
    if (!item.plotNumber) continue;

    const existingIdx = plots.findIndex(p => p.plotNumber.toUpperCase() === item.plotNumber.toUpperCase());
    const matchedCoords = item.coordinates || {
      x: item.coordinates_x ?? (Math.random() * 300 - 150),
      y: item.coordinates_y ?? (Math.random() * 160 - 80),
      z: 0.5,
      width: item.width ?? 20,
      depth: item.depth ?? 35
    };

    const parsedPlot: Plot = {
      id: item.id || (existingIdx !== -1 ? plots[existingIdx].id : 'p_imported_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
      plotNumber: item.plotNumber,
      area: Number(item.area || 1200),
      price: Number(item.price || 50000),
      status: (item.status?.toLowerCase() || 'available') as any,
      facing: (item.facing || 'East') as any,
      coordinates: matchedCoords,
      points: item.points || undefined,
      location: item.location || 'Sector A',
      roadWidth: Number(item.roadWidth || 30),
      description: item.description || ''
    };

    if (existingIdx !== -1) {
      plots[existingIdx] = parsedPlot;
      updatedCount++;
    } else {
      plots.push(parsedPlot);
      addedCount++;
    }
  }

  writePlots(plots);
  res.json({ success: true, message: `Bulk import finished. Added ${addedCount}, Updated ${updatedCount} plots.` });
});

// 10. Reset plots back to default configuration
app.post('/api/plots/reset', (req, res) => {
  if (req.headers['x-admin-token'] !== 'mock-jwt-token-for-admin-spacer') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
  writePlots(DEFAULT_PLOTS);
  writeBookings([]);
  
  // also reset layout settings back to custom
  try {
    const defaultSettings = {
      activeLayout: 'custom',
      imageMimeType: '',
      width: 800,
      height: 500
    };
    fs.writeFileSync(LAYOUT_SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Resetting layout settings failed:', err);
  }

  res.json({ success: true, plots: DEFAULT_PLOTS });
});

// 11. Get layout settings
app.get('/api/layout/settings', (req, res) => {
  try {
    if (!fs.existsSync(LAYOUT_SETTINGS_FILE)) {
      return res.json({ activeLayout: 'custom', imageMimeType: 'image/png', width: 800, height: 500, imageUrl: DEFAULT_LAYOUT_URL });
    }
    const content = fs.readFileSync(LAYOUT_SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(content);
    if (!settings.imageUrl) {
        settings.imageUrl = DEFAULT_LAYOUT_URL;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read layout settings' });
  }
});

// 12. Update layout settings
app.post('/api/layout/settings', (req, res) => {
  if (req.headers['x-admin-token'] !== 'mock-jwt-token-for-admin-spacer') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
  try {
    const settings = req.body;
    fs.writeFileSync(LAYOUT_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save layout settings' });
  }
});

// 13. Upload layout image (base64)
app.post('/api/layout/upload', (req, res) => {
  if (req.headers['x-admin-token'] !== 'mock-jwt-token-for-admin-spacer') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
  try {
    const { image, mimeType, filename } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Missing image data' });
    }
    
    // Extract base64 content
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "").replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Save image
    fs.writeFileSync(CUSTOM_IMAGE_FILE, buffer);
    
    // Update settings
    let settings = { 
      activeLayout: 'custom', 
      imageMimeType: mimeType || 'image/png', 
      filename: filename || 'layout.png', 
      width: 800, 
      height: 500,
      lastUpdated: Date.now()
    };
    fs.writeFileSync(LAYOUT_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    
    res.json({ success: true, settings });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to write upload file: ' + err.message });
  }
});

// 14. Delete custom layout image
app.post('/api/layout/delete', (req, res) => {
  if (req.headers['x-admin-token'] !== 'mock-jwt-token-for-admin-spacer') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
  try {
    if (fs.existsSync(CUSTOM_IMAGE_FILE)) {
      fs.unlinkSync(CUSTOM_IMAGE_FILE);
    }
    
    // Also reset layout settings back to demo
    const settings = { 
      activeLayout: 'demo', 
      imageMimeType: '', 
      filename: '', 
      width: 800, 
      height: 500
    };
    fs.writeFileSync(LAYOUT_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');

    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete layout image: ' + err.message });
  }
});

// 15. Serve custom layout image
app.get('/api/layout/image', async (req, res) => {
  if (fs.existsSync(CUSTOM_IMAGE_FILE)) {
    // Send background file
    res.sendFile(CUSTOM_IMAGE_FILE);
  } else {
    // Try to fallback to URL if saved
    let imageUrl = DEFAULT_LAYOUT_URL;
    try {
      if (fs.existsSync(LAYOUT_SETTINGS_FILE)) {
        const settings = JSON.parse(fs.readFileSync(LAYOUT_SETTINGS_FILE, 'utf-8'));
        if (settings.imageUrl) {
          imageUrl = settings.imageUrl;
        }
      }
    } catch (e) {
      console.error('Error in layout/image fallback:', e);
    }
    
    try {
        const response = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) throw new Error('Failed to fetch image');
        const buffer = await response.arrayBuffer();
        res.set('Content-Type', 'image/png');
        return res.send(Buffer.from(buffer));
    } catch (fetchErr) {
        console.error('Error fetching layout image from URL:', fetchErr);
        return res.status(500).send('Failed to load layout image.');
    }
  }
});

// 16. Set custom layout image from URL
app.post('/api/layout/set-from-url', async (req, res) => {
  if (req.headers['x-admin-token'] !== 'mock-jwt-token-for-admin-spacer') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
  
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing image URL' });
  }

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Save image
    fs.writeFileSync(CUSTOM_IMAGE_FILE, buffer);
    
    // Update settings
    let settings = { 
      activeLayout: 'custom', 
      imageUrl: url, // Store the URL
      imageMimeType: 'image/png', // Simplified
      filename: 'layout.png', 
      width: 800, 
      height: 500,
      lastUpdated: Date.now()
    };
    fs.writeFileSync(LAYOUT_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    
    res.json({ success: true, settings });
  } catch (err: any) {
    console.error('Error setting layout from URL:', err);
    res.status(500).json({ error: 'Failed to set layout image: ' + err.message });
  }
});

// --- GALLERY API ---
const GALLERY_DIR = path.join(DATA_DIR, 'gallery');
if (!fs.existsSync(GALLERY_DIR)) {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });
}

// 18. List gallery images
app.get('/api/gallery', (req, res) => {
  try {
    const files = fs.readdirSync(GALLERY_DIR);
    res.json(files.filter(f => f.match(/\.(png|jpg|jpeg|gif)$/i)));
  } catch (err) {
    res.status(500).json({ error: 'Failed to list gallery images' });
  }
});

// 19. Upload gallery image
app.post('/api/gallery/upload', (req, res) => {
  if (req.headers['x-admin-token'] !== 'mock-jwt-token-for-admin-spacer') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
  try {
    const { image, filename } = req.body;
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(path.join(GALLERY_DIR, filename), buffer);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upload: ' + err.message });
  }
});

// 20. Delete gallery image
app.delete('/api/gallery/:filename', (req, res) => {
  if (req.headers['x-admin-token'] !== 'mock-jwt-token-for-admin-spacer') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
  const filePath = path.join(GALLERY_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// 21. Serve gallery image
app.get('/api/gallery/:filename', (req, res) => {
  const filePath = path.join(GALLERY_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// 17. AI Auto-Detect plots on the layout image using Gemini
app.post('/api/layout/ai-detect', async (req, res) => {
  try {
    if (!fs.existsSync(CUSTOM_IMAGE_FILE)) {
      return res.status(400).json({ error: 'No uploaded layout image found. Please upload one first in Admin panel.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not defined on the server.' });
    }

    const fileContent = fs.readFileSync(CUSTOM_IMAGE_FILE);
    const base64EncodeString = fileContent.toString('base64');

    // Retrieve active settings to get mime type
    let mimeType = 'image/png';
    if (fs.existsSync(LAYOUT_SETTINGS_FILE)) {
      const settingsContent = fs.readFileSync(LAYOUT_SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(settingsContent);
      mimeType = settings.imageMimeType || 'image/png';
    }

    // Lazy initialization of Gemini client inside endpoint
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const imagePart = {
      inlineData: {
        data: base64EncodeString,
        mimeType: mimeType,
      },
    };

    const promptText = `Analyze this real estate or land plot layout design blueprint/image. Locate and extract all individual plot parcels.
For each plot parcel, identify its Plot Number (physical number on the map, like '01', '02', 'B3' or similar).
Provide its approximate polygon boundary using relative percentage coordinates (values between 0 and 100 representing position from the top-left corner of the image).
Provide percentage coordinates: x (from 0 to 100 from left) and y (from 0 to 100 from top).
A polygon should contain 4 vertices mapping the corners of the plot parcel on the image. Make sure the vertices order goes clockwise or counterclockwise around the plot boundaries (e.g. top-left, top-right, bottom-right, bottom-left).
Provide the estimated area in square meters (SQ.M) (estimate based on relative size, e.g. 350, 450, 550) and recommended facing (North, South, East, West, North-East, North-West, South-East, South-West).
Also return an estimated price (e.g., 50000).

Format your output strictly as a JSON object matching the requested schema. Return a maximum of 25 plots.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            plots: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  plotNumber: { type: "STRING" },
                  area: { type: "NUMBER" },
                  price: { type: "NUMBER" },
                  facing: { type: "STRING", enum: ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"] },
                  polygonPercent: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        x: { type: "NUMBER" },
                        y: { type: "NUMBER" }
                      },
                      required: ["x", "y"]
                    }
                  },
                  description: { type: "STRING" }
                },
                required: ["plotNumber", "area", "price", "facing", "polygonPercent"]
              }
            }
          },
          required: ["plots"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No text response from Gemini API");
    }

    const result = JSON.parse(jsonText.trim());
    res.json(result);
  } catch (err: any) {
    console.error('AI plot detection error:', err);
    res.status(500).json({ error: 'AI Plot Detection failed: ' + err.message });
  }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === 'Spider') {
    res.json({ success: true, token: 'mock-jwt-token-for-admin-spacer' });
  } else {
    res.status(401).json({ error: 'Invalid Password' });
  }
});

// Start dev or production handler
async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
