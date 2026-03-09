# 💸 Next-Gen Expense Tracker (Microservices Edition)

A robust, event-driven personal finance application built with a modern microservices architecture, React, Java Spring Boot, Node.js, and Python. It features real-time budget alerts via Kafka, an LLM-powered chat interface to log expenses via natural language, native OCR receipt scanning, multi-currency live conversion, and generating shareable read-only links.

## 🏗️ Architecture & Tech Stack

This project is composed of several decoupled services, all routed through a Kong API Gateway:
- **Frontend**: React, Vite, Recharts, Tesseract.js (Glassmorphism & Light/Dark Mode)
- **AuthService (Port 9810)**: Java/Spring Boot (Manages Users & JWT Authentication)
- **ExpenseService (Port 9820)**: Java/Spring Boot (Core domain logic, Kafka Producer, SSE Emitters)
- **UserService (Port 9898)**: Node.js/Express (Manages User Profiles)
- **DSService (Port 8010)**: Python/FastAPI + LangChain (Agentic LLM integrations via Mistral API)
- **Infrastructure**: Docker Compose, Kafka + Zookeeper (Event Streaming), MySQL, Kong Gateway

---

## 🚀 How to Run Locally

If you are cloning this repository, follow these steps to build the microservices and launch the application on your machine.

### Prerequisites:
- **Docker** and **Docker Compose** installed
- **Java 17+** (for building Spring Boot services)
- **Node.js 18+** (for building the React frontend)
- A valid **Mistral AI API Key** (or OpenAI API Key mapped in `docker-compose.yml`)

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd expense-tracker
```

### Step 2: Build the Docker Images
Because this architecture relies on custom microservices, you must build the Docker images locally before spinning up the cluster. Run the following commands from the root directory:

**2A. Build Auth Service (Java)**
```bash
cd authService
./gradlew build -x test
docker build -t auth-service .
cd ..
```

**2B. Build Expense Service (Java)**
```bash
cd expenseService
./gradlew build -x test
docker build -t expense-service .
cd ..
```

**2C. Build User Service (Node)**
```bash
cd userService
docker build -t user-service .
cd ..
```

**2D. Build DS Service (Python)**
```bash
cd dsService
docker build -t ds-service .
cd ..
```

*(Note: If you are on Windows, you can use `.\gradlew.bat build -x test` for the Java builds).*

### Step 3: Spin Up the Backend Infrastructure
Once the images are built, use Docker Compose to orchestrate compiling the database, message brokers, gateway, and all custom services.

From the root directory, run:
```bash
docker-compose up -d
```
*Docker will boot up MySQL, Kafka, Zookeeper, Kong, and your 4 microservices. The first boot may take 1-2 minutes to fully initialize the database schemas and Kafka topics.*

### Step 4: Launch the React Frontend
Now that the API Gateway is running on `localhost:8000` mapping your local endpoints, start the Vite frontend server:

```bash
cd frontend
npm install
npm run dev
```

### Step 5: Test It Out!
Open your browser and navigate to **`http://localhost:5173`**. You can now:
1. Register a new account.
2. Tell the AI Chat: *"I spent 20 dollars on Netflix"* to see it auto-categorized into your "Upcoming Subscriptions" panel!
3. Enable Dark Mode via the top-right toggle.

---

> **Note on Environment Variables:** 
> The `docker-compose.yml` file expects a valid `OPENAI_API_KEY` (mapped to Mistral) environment variable injected into the `dsservice` container to power the Langchain Agent logic. Be sure to provide yours if you want the "Ask Your Expenses" chat to function.
