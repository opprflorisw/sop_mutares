// Raw CSV content for the seeded SFC India "Sealings" project,
// loaded straight from the generated sample files so the Data
// Manager has real, downloadable, checkable data on first run.

import sku_master from "../sample-data/sealings/sku_master.csv?raw";
import customer_master from "../sample-data/sealings/customer_master.csv?raw";
import plant_master from "../sample-data/sealings/plant_master.csv?raw";
import sales_history from "../sample-data/sealings/sales_history.csv?raw";
import demand_forecast from "../sample-data/sealings/demand_forecast.csv?raw";
import bom from "../sample-data/sealings/bom.csv?raw";
import inventory from "../sample-data/sealings/inventory.csv?raw";
import capacity from "../sample-data/sealings/capacity.csv?raw";
import supplier from "../sample-data/sealings/supplier.csv?raw";

// templateId -> CSV text. Note: `supplier` is intentionally NOT
// pre-loaded so the Data Manager shows an "optional, not uploaded"
// state out of the box.
export const SEALINGS_CSV: Record<string, string> = {
  sku_master,
  customer_master,
  plant_master,
  sales_history,
  demand_forecast,
  bom,
  inventory,
  capacity,
};

export const SEALINGS_SUPPLIER_CSV = supplier;
