require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

// 🔹 PostgreSQL Database Connection
const pool = new Pool({
    user: "postgres",
    password: "fiza123",
    host: "localhost",
    port: 5432,
    database: "bazaar-proj",
});

pool.connect((err, client, release) => {
    if (err) {
      console.error('Error acquiring client', err.stack);
    } else {
      console.log('Connected to PostgreSQL');
    }
  });  

app.use(cors());
app.use(express.json());

// Get all products with optional filters
app.get("/products", async (req, res) => {
    try {
        const { store_id, search, start_date, end_date } = req.query;
        
        let query = "SELECT * FROM public.product";
        const params = [];
        let paramCount = 1;
        
        // Build WHERE clause based on filters
        if (store_id || search || (start_date && end_date)) {
            query += " WHERE";
            
            // Store filter
            if (store_id) {
                query += ` store_id = $${paramCount}`;
                params.push(store_id);
                paramCount++;
            }
            
            // Search filter (product name or category)
            if (search) {
                if (params.length > 0) query += " AND";
                query += ` (name ILIKE $${paramCount} OR category ILIKE $${paramCount})`;
                params.push(`%${search}%`);
                paramCount++;
            }
            
            // Date range filter
            if (start_date && end_date) {
                if (params.length > 0) query += " AND";
                query += ` created_at BETWEEN $${paramCount} AND $${paramCount + 1}`;
                params.push(start_date, end_date);
                paramCount += 2;
            }
        }
        
        console.log("Query:", query, "Params:", params);
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error("Error querying products:", err);
        res.status(500).json({ error: err.toString() });
    }
});

// Get store locations
app.get("/store_locations", async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name FROM stores");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching store locations:", err);
        res.status(500).json({ error: err.toString() });
    }
});

// Get store ID by name
app.get("/store_id/:name", async (req, res) => {
    try {
        const { name } = req.params;
        const result = await pool.query("SELECT id as store_id FROM stores WHERE name = $1", [name]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Store not found" });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching store ID:", err);
        res.status(500).json({ error: err.toString() });
    }
});

// Get products by store ID
app.get("/store/:storeId/products", async (req, res) => {
    try {
        const { storeId } = req.params;
        const result = await pool.query(
            "SELECT p.* FROM product p JOIN store_inventory si ON p.id = si.product_id WHERE si.store_id = $1",
            [storeId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching store products:", err);
        res.status(500).json({ error: err.toString() });
    }
});

// 🔹 2. Get Product by ID
app.get("/product/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("SELECT * FROM product WHERE id = $1", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 3. Add a New Product
app.post("/product", async (req, res) => {
    try {
        const { name, category, quantity, unit_price, reorder_level } = req.body;
        const result = await pool.query(
            `INSERT INTO product (name, category, quantity, unit_price, reorder_level) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, category, quantity, unit_price, reorder_level]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 4. Update Product Quantity
app.put("/product/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        const result = await pool.query(
            `UPDATE product 
             SET quantity = $1, updated_at = NOW() 
             WHERE id = $2 RETURNING *`,
            [quantity, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 5. Delete a Product
app.delete("/product/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("DELETE FROM product WHERE id = $1 RETURNING *", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ message: "Product deleted successfully", deletedProduct: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 6. Increase Stock
app.put("/product/:id/stock/:quantity", async (req, res) => {
    try {
        const { id, quantity } = req.params;

        const result = await pool.query(
            `UPDATE product 
             SET quantity = quantity + $1, updated_at = NOW() 
             WHERE id = $2 RETURNING *`,
            [quantity, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ message: `Added ${quantity} units`, product: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 7. Sell Product (Reduce Stock)
app.put("/product/:id/sell/:quantity", async (req, res) => {
    try {
        const { id, quantity } = req.params;

        // Check if enough stock is available
        const product = await pool.query("SELECT quantity FROM product WHERE id = $1", [id]);
        if (product.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        if (product.rows[0].quantity < quantity) {
            return res.status(400).json({ message: "Not enough stock available" });
        }

        // Update stock
        const result = await pool.query(
            `UPDATE product 
             SET quantity = quantity - $1, updated_at = NOW() 
             WHERE id = $2 RETURNING *`,
            [quantity, id]
        );

        res.json({ message: `Sold ${quantity} units`, product: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Start Server
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
