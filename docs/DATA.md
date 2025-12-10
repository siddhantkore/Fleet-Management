# Logistics and Transport System Dataset Documentation for Initial Demo Representationn

## 1. Vehicle Master Table

| Vehicle_ID | Type | Plant_Loc_ID | Capacity_Kg | Volume_CBM | Fuel_Type | Cost_Per_KM | Current_Status | License_Plate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| V001 | 10T Truck | LOC_001 | 10000 | 35 | Diesel | 45.00 | Available | MH-12-AB-1234 |
| V002 | LCV | LOC_001 | 4500 | 18 | CNG | 22.50 | On Trip | MH-14-XY-5678 |
| V003 | Pickup | LOC_002 | 1500 | 8 | Diesel | 18.00 | Maintenance | MH-04-JK-9012 |

## 2. Driver Master Table

| Driver_ID | Name | License_No | License_Expiry | Phone | Home_Plant_ID | Status | Rating |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| D001 | Rajesh Kadam | MH122015001 | 2026-05-20 | 9876543210 | LOC_001 | Active | 4.8 |
| D002 | Chopade Kaka | MH142018555 | 2024-12-15 | 9876543211 | LOC_001 | On Leave | 4.5 |
| D003 | Amit Singh | MH042019999 | 2025-08-10 | 9876543212 | LOC_002 | Active | 4.2 |

## 3. Location Master Table
Considered as nodes in software implementtation

| Location_ID | Name | Type | Latitude | Longitude | City |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LOC_001 | Chakan Plant | Plant | 18.7500 | 73.8500 | Pune |
| LOC_002 | Bhiwandi WH | Warehouse | 19.2900 | 73.0600 | Mumbai |
| LOC_003 | Sanand Factory | Plant | 22.9900 | 72.3700 | Ahmedabad |

## 4. Trip Data

| Trip_ID | Vehicle_ID | Driver_ID | From_Loc | To_Loc | Start_Time | End_Time | Distance_KM | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| T1001 | V002 | D001 | LOC_001 | LOC_002 | 2023-10-01 09:00 | 2023-10-01 14:00 | 145 | Completed |
| T1002 | V005 | D004 | LOC_002 | LOC_003 | 2023-10-02 06:00 | 2023-10-02 18:00 | 520 | Completed |
| T1003 | V001 | D006 | LOC_001 | LOC_004 | 2023-10-03 10:00 | NULL | 20 | In-Transit |

## 5. Maintenance Data
In case use: <br>
will be using this for extended functionality or other our data will be depend on this
| Maint_ID | Vehicle_ID | Date | Type | Cost | Odometer_Reading | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| M501 | V001 | 2023-09-01 | Preventive | 5000 | 45000 | Oil change, Filter replacement |
| M502 | V003 | 2023-09-15 | Breakdown | 12000 | 62000 | Alternator failure |
| M503 | V002 | 2023-10-01 | Tire | 8000 | 30000 | Rear tires replaced |
