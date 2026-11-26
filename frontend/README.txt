STOCKLY / MINIINVENTORY FRONTEND

This ZIP is a complete replacement frontend designed to closely match the
Stockly dashboard shown in the reference image.

Included:
- Dashboard
- Products
- Add Product
- Categories
- Transactions
- Suppliers
- Reports
- Settings
- Floating AI Assistant
- Firestore product loading through your existing Node/Express backend
- Add Product form connected to POST /api/products
- AI Assistant connected to POST /api/ai/chat

INSTALLATION:
1. Stop your frontend local server if it is running.
2. Back up your current MiniInventory/frontend folder.
3. Extract the contents of this ZIP into:
   MiniInventory/frontend/
4. Replace the existing frontend files with the included:
   index.html
   style.css
   app.js
5. Keep your backend folder unchanged.
6. Run the backend:
   cd backend
   npm run dev
7. Open index.html using your normal frontend local server (for example
   Live Server on port 5500).

IMPORTANT:
- The backend must remain on http://localhost:3000.
- Your Gemini API key stays in backend/.env and is NOT included here.
- The AI may still return a temporary unavailable message while Gemini's
  selected model is experiencing high demand.
