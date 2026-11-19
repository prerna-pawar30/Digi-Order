# Digident Manual Order Console

Staff app for manual orders and website (ecommerce) orders: create an order, follow it until delivery, handle website return requests and refunds, raise and track invoices and credit notes, see each customer's ledger and the sales analytics. Uses react-router; every logged-in page sits inside ProtectedRoute and DashboardLayout.

## Run it

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # http://localhost:5173
