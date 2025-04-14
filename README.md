# Bazaar Inventory Tracking System – Case Study Submission

## Developed By: Fiza Hussain  
Backend Developer | System Designer | Educator  
Built using: PostgreSQL · Node.js · Express · React · Tailwind · JWT

---

## Project Overview

This backend service tracks product inventory and stock movements for a kiryana store, designed to scale from a single-store setup to a multi-store, multi-supplier, audit-enabled ecosystem. The system supports real-time updates, scoped data visibility, and secure authentication.

---

## Design Decisions

### Stage 1: JSON-Based MVP
- Used a local JSON file for data modeling and manipulation.
- Focused on building core logic for stock-in, sale, and removal.
- Designed a clean and testable structure to simulate inventory flows.

### Stage 2: PostgreSQL + JWT Auth
- Migrated to a normalized PostgreSQL schema with clear foreign key relationships.
- Implemented role-based access control using JWT for scalable and secure multi-tenant access.
- Developed REST APIs with store-level filtering and audit logs.
- Created tables for `products`, `stores`, `store_stock`, `users`, `stock_movements`, and `audit_logs`.

### Stage 3 (Planned): Scalable Distributed System
- Shift to microservices with event-driven architecture.
- Use message queues (Kafka/RabbitMQ) for async stock updates.
- Implement caching (Redis), DB replication, rate-limiting, and read/write separation.
- Add real-time monitoring and structured audit logs.

---

## Assumptions

- Store owners are linked to stores via the `store_id` in the `users` table.
- Products are centrally managed but stock quantities are store-specific.
- JWT payload includes the user’s `store_id` and `role` to control access.
- Audit logs are captured for compliance and traceability.
- Each store has 50+ products; system should scale to 500+ stores.
- Admin users have full visibility and control across the system.

---

## Authentication

JWT-based stateless authentication:
- `/register`: Register store owners with store ID & hashed password.
- `/login`: Issue JWT containing `store_id` and `role`.
- Middleware `verifyToken` checks the validity of incoming tokens and decodes roles.

---

## API Design

Below are the major API endpoints implemented in the system (with `index.js` powering these routes):

### Authentication Routes
- `POST /register` – Register store owner
- `POST /login` – Issue JWT token after validating credentials

---

### Product Routes
- `GET /products` – View all products *(admin only)*
- `GET /products/:id` – View product by ID
- `POST /products` – Add product to global catalog *(admin)*
- `PUT /products/:id` – Update product stock
- `DELETE /products/:id` – Remove product from catalog
- `PUT /products/:id/stock/:quantity` – Increase stock
- `PUT /products/:id/sell/:quantity` – Sell product (reduce stock)

---

### Store Routes
- `GET /store_locations` – List all store locations
- `GET /store_id/:location` – Get store ID by location
- `GET /store/:id/products` – Get products in a specific store *(owner restricted via JWT)*
- `POST /store/:store_id/products` – Add a product to a store
- `PUT /store/:store_id/products/:product_id/stock_in/:quantity` – Stock-in for a store product
- `DELETE /store/:store_id/products/:product_id` – Remove product from store and DB

---

##  Database Schema (ERD Summary)

- `users(store_id, email, password_hash, role)`  
- `stores(store_id, location, manager_name)`  
- `products(product_id, name, category, unit_price, reorder_level)`  
- `store_stock(store_id, product_id, quantity)`  
- `stock_movements(movement_id, store_id, product_id, quantity, action_type, remarks, created_at)`  
- `audit_logs(log_id, route, method, status_code, performed_at)`

---

## Evolution Rationale (Stage 1 → 3)

| Feature | Stage 1 | Stage 2 | Stage 3 (Planned) |
|--------|---------|----------|-------------------|
| **Data Store** | JSON file | PostgreSQL | Sharded DB + Caching |
| **Authentication** | None | JWT | OAuth2 + API Gateway |
| **Concurrency** | Single-threaded | Basic REST | Event-driven w/ Queues |
| **Scalability** | Local CLI | 500+ stores | Thousands via horizontal scaling |
| **Security** | Local only | Role-based (JWT) | Rate-limits, RBAC, throttling |
| **Observability** | Console logs | Basic audit_logs | Structured logging + monitoring |

---

## 🛠Tech Stack

| Layer | Tools |
|-------|-------|
| Frontend | React, Vite, TailwindCSS, Daisy UI |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT, bcrypt |
| Dev Tools | dotenv, pg, body-parser, cors |

---
