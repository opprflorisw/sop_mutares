// Raw CSV content for the seeded "ElectroTech Industries — EU" project
// (electronics manufacturer, EUR, 3 EU plants) — a second scenario to
// test the tool against a different industry & currency.

import sku_master from "../sample-data/electrotech/sku_master.csv?raw";
import customer_master from "../sample-data/electrotech/customer_master.csv?raw";
import plant_master from "../sample-data/electrotech/plant_master.csv?raw";
import sales_history from "../sample-data/electrotech/sales_history.csv?raw";
import demand_forecast from "../sample-data/electrotech/demand_forecast.csv?raw";
import bom from "../sample-data/electrotech/bom.csv?raw";
import inventory from "../sample-data/electrotech/inventory.csv?raw";
import capacity from "../sample-data/electrotech/capacity.csv?raw";

export const ELECTROTECH_CSV: Record<string, string> = {
  sku_master,
  customer_master,
  plant_master,
  sales_history,
  demand_forecast,
  bom,
  inventory,
  capacity,
};
