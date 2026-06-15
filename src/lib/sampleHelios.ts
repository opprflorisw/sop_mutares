// Raw CSV content for the seeded "Helios Pumps & Compressors — Italy"
// project (industrial pumps & compressors, EUR, 3 plants). A margin/mix
// scenario: a supply gap on the LOW-margin pumps, a high-margin vacuum
// line that's growing but under-forecast, Turin running ~99% of its
// planned capacity (under the MAC), an obsolete seal kit, and a critical
// motor supplier feeding the most profitable line.

import sku_master from "../sample-data/helios/sku_master.csv?raw";
import customer_master from "../sample-data/helios/customer_master.csv?raw";
import plant_master from "../sample-data/helios/plant_master.csv?raw";
import sales_history from "../sample-data/helios/sales_history.csv?raw";
import demand_forecast from "../sample-data/helios/demand_forecast.csv?raw";
import bom from "../sample-data/helios/bom.csv?raw";
import inventory from "../sample-data/helios/inventory.csv?raw";
import capacity from "../sample-data/helios/capacity.csv?raw";
import supplier from "../sample-data/helios/supplier.csv?raw";

export const HELIOS_CSV: Record<string, string> = {
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
