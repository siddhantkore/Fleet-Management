
---

# TECHNICAL DESIGN DOCUMENT (TDD) (Raw)
**Centralized Vehicle Allocation and Logistics Optimization System**

| Attribute | Value |
| :--- | :--- |
| **Project Title** | Centralized Vehicle Allocation and Logistics Optimization System for Multi-Plant Organizations |
| **Version** | 1.0 |
| **Date** | 09 December 2025 |
| **Author** | Siddhant Kore |
| **Related Documents** | [Requirements Analysis](REQUIREMENTS.md), [Data Analysis](DATA.md) & Pain Points |

***

## 1. System Goals & Scope

The primary objective is to transform manual, siloed logistics into an efficient, centralized operation. This is achieved by implementing an **Intelligent Allocation and Route Optimization Engine** powered by real-time data.

### 1.1 Key Functional Areas
1.  **Vehicle & Driver Management:** Centralized master data for all fleet and personnel.
2.  **Trip Planning & Optimization:** Automated assignment of the most cost-effective and compliant vehicle/driver to a trip.
3.  **Real-Time Tracking:** Integration with GPS for live status updates and path history.
4.  **Compliance & Maintenance Alerting:** Automated, proactive notifications for expiry and service schedules.
5.  **Explainable Dashboard:** Visual representation of key performance indicators (KPIs) and optimization decisions.

***

## 2. System Architecture

### 2.1. Architectural Diagram
The system is divided into three main layers.

### 2.2. Component Breakdown

| Component | Role / Responsibility | Key Technologies |
| :--- | :--- | :--- |
| **Client/Presentation** | User Interface for all stakeholders (Supervisors, Managers, Maintenance). Handles map view, input forms, and dashboard visuals. | **ReactJS / Next.js** |
| **API Gateway** | Single entry point. Handles security (Authentication) and routes requests to the appropriate microservice. | **Nginx / FastAPI** |
| **Master/Data** | Manages all static (Vehicle, Driver) and compliance data. Validates data integrity and access. | **Python (FastAPI)** |
| **Optimization Engine**| The **Core Engine**. Takes trip requests, calculates constraints, and returns the optimal assignment using OR-Tools. | **Python (OR-Tools, NumPy, Pandas)** |
| **Alert/Comms** | Scheduled checks for expiry dates and mileage thresholds. Triggers notifications (Email, SMS) based on defined rules. | **Python Scheduling Library / Twilio API** |

***

## 3. Data Design & Storage

### 3.1. Database Strategy

* **Primary Database:** **PostgreSQL** (Chosen for its robust transactional support (ACID), reliability, and advanced geospatial capabilities via the **PostGIS** extension, essential for location-based services).
* **Real-Time Cache:** **Redis** (Used to temporarily store high-volume, volatile data like the continuous GPS pings before processing, reducing load on the primary DB).

---

## 4. Optimization Engine Logic

The Optimization Microservice is the intellectual core, responsible for solving the **Multi-Depot Vehicle Routing Problem (MDVRP)**.

### 4.1. Core Algorithm
* **Engine:** **Google OR-Tools** (Constraint Programming Solver).
* **Problem Formulation:** MDVRP with Time Windows and Capacity Constraints.

### 4.4. Explainable Decision Making (XAI)
The Optimization Service must log the reasons for its final assignment, which the dashboard then displays:
* **Method:** **Constraint Logging.** Record which constraints were tightest (e.g., "Time window was the deciding factor") and the resulting cost saving versus the next best alternative.

***

## 5. Alerting & Communication

### 5.1. Compliance & Maintenance Alerts (Scheduled)
| Trigger | Rule |
| :--- | :--- |
| **Document Expiry** | Email to Admin / Supervisor. |
| **Preventive Maintenance** | Email to Maintenance Team. |

### 5.2. Operational Alerts
| Trigger | Rule | Communication |
| :--- | :--- | :--- |
| **Idle Time** | Vehicle is stationary at a non-Plant location for $>1$ hour during working hours. | SMS to Driver / Supervisor. |
| **Deviation** | GPS data shows the vehicle is $>5 \text{km}$ off the optimized route path. | SMS/App Notification to Supervisor. |

***

## 6. Implementation and Deployment

### 6.1. Tech Stack Summary
| Layer | Technology |
| :--- | :--- |
| **Frontend** | ReactJS |
| **Backend/API** | Python (FastAPI) |
| **Database** | PostgreSQL + PostGIS |
| **Optimization** | Google OR-Tools |

### 6.3. Testing Strategy
* **Unit Testing:** Validate individual component logic (e.g., Cost per KM calculation, compliance date checks).
* **Integration Testing:** Verify data flow between services (e.g., ensuring the Optimization Service successfully receives data from the Master Service).
* **Optimization Testing:** Use benchmark scenarios (e.g., "Full Capacity Trip," "Tight Time Window Trip") to validate the OR-Tools output against expected optimal solutions.
