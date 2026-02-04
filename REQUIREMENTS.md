
# **Requirement Gathering, Existing Data Analysis & Pain Points Documentation**

---

# **1. Requirement Gathering**

We split requirements into two parts:

### (A) **Functional Requirements**

### (B) **Non-Functional Requirements**

Below is the **complete detailed version** for your project.

---

## **1.1 Stakeholder Identification**

You must clearly list who is involved:

| Stakeholder          | Role                                               |
| -------------------- | -------------------------------------------------- |
| Transport Supervisor | Assigns vehicles, checks compliance                |
| Plant Manager        | Oversees fleet availability across multiple plants |
| Drivers              | Execute trips, provide feedback                    |
| Maintenance Team     | Tracks servicing, breakdowns                       |
| ERP/IT Admin         | Handles integration and data flow                  |
| Senior Management    | Monitors KPI, cost efficiency                      |

---

## **1.2 Questions for Requirement Gathering**

These are **industry-level professional questions** you (as system developer) must ask.
You can mention them in documentation AND ask real plant/logistics staff later.

### **Vehicle & Fleet Related**

1. How many vehicles does each plant own?
2. What types of vehicles?
3. What data do you maintain manually today? (fitness, insurance, service logs)
4. How do you track vehicle location? GPS or manual calls?
5. What causes maximum delays?

### **Trip & Scheduling**

6. How is a vehicle currently allotted for a trip?
7. Do supervisors assign vehicles based on availability or guesswork?
8. How do you manage inter-plant vehicle sharing?
9. How often vehicles return empty (deadhead trips)?

### **Maintenance & Compliance**

10. How do you track expiry: fitness, insurance, PUC?
11. Is breakdown data logged?
12. Do vehicles miss service deadlines?

### **System & Process**

13. Is data stored on paper, Excel, or ERP?
14. Do different plants use different systems?
15. How is data communication handled between plants?

### **Pain Points**

16. What are the top 5 most frustrating logistics issues?
17. Which tasks consume maximum time manually?
18. What type of alerts would help supervisors?
19. Which decisions are taken without proper data?

These questions **must be included in your documentation**.

---

# **2. Existing Data Analysis**

Here you write what kind of data currently exists and what gaps you found.

Below is a **perfect professional format**.

---

## **2.1 Existing Data Sources Identified**

Most organizations maintain data in:

* Excel sheets
* Paper logs
* ERP export files
* GPS vendor portal
* Maintenance logbook
* Dispatch trip sheet

### **Data Categories**

| Data Type        | Example Fields                                            |
| ---------------- | --------------------------------------------------------- |
| Vehicle Master   | Vehicle ID, Type, Plant, Fitness expiry, Insurance expiry |
| Trip Data        | Trip ID, From, To, Driver, Distance, Purpose              |
| Maintenance Data | Last service, Next service, KM reading                    |
| GPS Data         | Latitude/Longitude, Speed, Engine status                  |
| Document Data    | PUC, Fitness, Insurance, Permit dates                     |

---

## **2.2 Data Quality Problems Found**

Based on typical manufacturing industry issues:

### ❌ **Missing Data**

* Some vehicles don’t have updated insurance/fitness logs
* Trip km sometimes not recorded

### ❌ **Inconsistent Formats**

* Dates in different formats (DD-MM-YYYY or YYYY/MM/DD)
* Plant names spelled differently across departments

### ❌ **Data Stored Across Multiple Places**

* Maintenance logbook (paper)
* Trip sheet (Excel)
* GPS data (vendor platform)

### ❌ **Delayed Data Update**

* Trip data updated only at end of day
* Fitness details updated only once per month

---

# **3. Pain Points (Critical Output of this Stage)**

This section is what your guide and committee will evaluate deeply.
I will give you a solid, industry-grade version.

---

## **3.1 Operational Pain Points**

### **1. Manual Scheduling**

* Supervisors manually check vehicle availability
* Decisions are slow and often inaccurate

### **2. Idle Vehicles**

* Some vehicles remain unused for days
* Other vehicles are repeatedly overused → more maintenance cost

### **3. No Centralized System**

* Each plant maintains separate vehicle records
* Miscommunication leads to vehicle shortages and delays

### **4. Deadhead Trips (Empty Returns)**

* Vehicles return empty after delivery
* HUGE fuel & time wastage

---

## **3.2 Compliance Pain Points**

### **5. Document Expiry Not Tracked Properly**

* Fitness / Insurance / Permit expiry leads to legal penalties
* Supervisor must manually check each vehicle

### **6. Maintenance Oversights**

* Missing scheduled servicing causes breakdowns
* No preventive maintenance tracking

---

## **3.3 Data Pain Points**

### **7. Duplicate or Inaccurate Data Records**

* Different plants maintain duplicate vehicle records

### **8. No Real-Time Data**

* Data updated manually at the end of the day
* No live tracking of vehicle health or location

### **9. Poor Visibility**

* Management cannot view all-plant logistics status in one dashboard

---

## **3.4 Communication Pain Points**

### **10. Inter-Plant Coordination Gap**

* Supervisor must call other plants to ask for vehicle availability
* Leads to delays, friction, and mismanagement

### **11. Driver-Supervisor Communication Gap**

* Trip completion not updated immediately

---

# 📘 **4. What You Should Document Now**

I will generate a **clean documentation section** that you can paste into your report:

---

### **DOCUMENTATION CONTENT (Ready to Use)**

✔ Stakeholders
✔ Requirement Questions
✔ Existing Data
✔ Pain Points

I can format it in PDF/Word style when you want.

---

# 📚 **5. useful Websites, Papers & Resources**

### **Fleet & Transportation Optimization**

* Google OR-Tools VRP
* [https://developers.google.com/optimization](https://developers.google.com/optimization)
* ResearchGate (search "fleet optimization multi depot")
* ScienceDirect Logistics & Transportation journals
* IEEE Xplore (Intelligent transportation systems)

### **Specific Highly Relevant Papers**

Search for these titles:

1. *Multi-Depot Vehicle Routing Problem Optimization using OR-Tools*
2. *Fleet Management Optimization in Multi-Plant Manufacturing*
3. *Digitalization in Supply Chain – Barriers & Opportunities*
4. *Intelligent Transport Systems for Smart Manufacturing Logistics*

### **Industry Benchmarks**

* Locus Logistics Platform
* FarEye Transportation Management
* Oracle Fleet Management
* Tata FleetEdge

These will help justify your project in viva.

---

# 🚀 **Next Steps (What we will do after this phase)**

Once this initial stage is ready, we will proceed to:

### 1. **System Architecture**

### 2. **Use Case Diagram, DFD, UML**

### 3. **Database Schema**

### 4. **Optimization Logic Framework**

### 5. **Dashboard Design**

### 6. **Alert Rules**

### 7. **Flowcharts & Sequence Diagrams**

All in professional format.

---

# 🔥 What do you want next?

Choose one:

1. **Generate full documentation PDF-style content for Requirement Gathering + Existing Data Analysis + Pain Points**
2. **Create Stakeholder Requirement Table**
3. **Generate Sample Dataset for vehicle, trip, maintenance**
4. **Create DFD (0 level, 1 level)**
5. **Create Use Case Diagram + Description**
6. **Create Functional Requirements List (FR1, FR2...)**
7. **Generate questions for supervisor interviews**
8. **Go to next major phase (System Design)**

Tell me which direction to proceed.
