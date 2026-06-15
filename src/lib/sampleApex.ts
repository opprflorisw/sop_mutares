// Raw CSV content for the seeded "Apex Brake Systems — México" project
// (automotive braking, USD, 4 plants). A turnaround scenario engineered
// to surface the dashboard's exception flags: an EV-driven supply gap,
// Monterrey capacity overload, over-forecast declining drums, a Toluca
// inventory pile-up + obsolete stock, and a critical single-source supplier.

import sku_master from "../sample-data/apex/sku_master.csv?raw";
import customer_master from "../sample-data/apex/customer_master.csv?raw";
import plant_master from "../sample-data/apex/plant_master.csv?raw";
import sales_history from "../sample-data/apex/sales_history.csv?raw";
import demand_forecast from "../sample-data/apex/demand_forecast.csv?raw";
import bom from "../sample-data/apex/bom.csv?raw";
import inventory from "../sample-data/apex/inventory.csv?raw";
import capacity from "../sample-data/apex/capacity.csv?raw";
import supplier from "../sample-data/apex/supplier.csv?raw";

export const APEX_CSV: Record<string, string> = {
  sku_master,
  customer_master,
  plant_master,
  sales_history,
  demand_forecast,
  bom,
  inventory,
  capacity,
  supplier,
};
