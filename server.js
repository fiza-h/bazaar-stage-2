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

app.get("/product", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM public.product");
        res.json(result.rows);
    } catch (err) {
        console.error("Error querying product:", err);  // Log the complete error to the console
        res.status(500).json({ error: err.toString() });  // Send the complete error as a response
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
